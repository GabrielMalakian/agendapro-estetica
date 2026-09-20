"use client";

import type {
  Appointment,
  ISODateString,
  Payment,
  PaymentMethod,
} from "@/types";
import { toDayKey } from "@/lib/scheduling";

import { readDb } from "./core";

export interface FinanceFilters {
  unitId?: string;
  from: ISODateString;
  to: ISODateString;
  professionalId?: string;
}

export interface RevenueByMethod {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface CommissionLine {
  appointmentId: string;
  date: string;
  clientName: string;
  serviceName: string;
  price: number;
  commissionRate: number;
  commission: number;
}

export interface CommissionSummary {
  professionalId: string;
  professionalName: string;
  commissionRate: number;
  appointments: number;
  grossRevenue: number;
  commission: number;
  lines: CommissionLine[];
}

export interface FinanceSummary {
  received: number;
  pending: number;
  deposits: number;
  byMethod: RevenueByMethod[];
  /** Série diária de faturamento para o gráfico. */
  daily: { date: string; amount: number }[];
  payments: (Payment & { clientName: string; serviceName: string })[];
  pendingAppointments: Appointment[];
}

function withinRange(dayKey: string, from: string, to: string): boolean {
  return dayKey >= from && dayKey <= to;
}

/** Financeiro e comissões. Contrato §7. */
export const financeRepository = {
  /** `GET /finance/summary` */
  summary: (filters: FinanceFilters): Promise<FinanceSummary> =>
    readDb((db) => {
      const clientById = new Map(db.clients.map((item) => [item.id, item]));
      const serviceById = new Map(db.services.map((item) => [item.id, item]));
      const appointmentById = new Map(db.appointments.map((item) => [item.id, item]));

      const matchesAppointment = (appointment?: Appointment): boolean => {
        if (!appointment) return false;
        if (filters.unitId && appointment.unitId !== filters.unitId) return false;
        if (
          filters.professionalId &&
          appointment.professionalId !== filters.professionalId
        ) {
          return false;
        }
        return withinRange(toDayKey(new Date(appointment.startsAt)), filters.from, filters.to);
      };

      const payments = db.payments.filter((payment) =>
        matchesAppointment(appointmentById.get(payment.appointmentId)),
      );

      const byMethodMap = new Map<PaymentMethod, RevenueByMethod>();
      const dailyMap = new Map<string, number>();
      let received = 0;

      for (const payment of payments) {
        received += payment.amount;
        const current = byMethodMap.get(payment.method) ?? {
          method: payment.method,
          amount: 0,
          count: 0,
        };
        current.amount += payment.amount;
        current.count += 1;
        byMethodMap.set(payment.method, current);

        const appointment = appointmentById.get(payment.appointmentId);
        const key = toDayKey(new Date(appointment?.startsAt ?? payment.paidAt));
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + payment.amount);
      }

      const pendingAppointments = db.appointments.filter(
        (appointment) =>
          matchesAppointment(appointment) &&
          appointment.paymentStatus !== "PAID" &&
          appointment.status !== "CANCELLED" &&
          appointment.price > 0,
      );

      const pending = pendingAppointments.reduce((sum, appointment) => {
        const paid = db.payments
          .filter((payment) => payment.appointmentId === appointment.id)
          .reduce((total, payment) => total + payment.amount, 0);
        return sum + Math.max(0, appointment.price - paid);
      }, 0);

      const deposits = db.appointments
        .filter(
          (appointment) =>
            matchesAppointment(appointment) &&
            appointment.paymentStatus === "PARTIAL" &&
            (appointment.depositAmount ?? 0) > 0,
        )
        .reduce((sum, appointment) => sum + (appointment.depositAmount ?? 0), 0);

      return {
        received,
        pending,
        deposits,
        byMethod: [...byMethodMap.values()].sort((a, b) => b.amount - a.amount),
        daily: [...dailyMap.entries()]
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        payments: payments
          .map((payment) => {
            const appointment = appointmentById.get(payment.appointmentId);
            return {
              ...payment,
              clientName: clientById.get(appointment?.clientId ?? "")?.name ?? "—",
              serviceName: serviceById.get(appointment?.serviceId ?? "")?.name ?? "—",
            };
          })
          .sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
        pendingAppointments: pendingAppointments.sort((a, b) =>
          a.startsAt.localeCompare(b.startsAt),
        ),
      };
    }),

  /** `GET /finance/commissions` */
  commissions: (filters: FinanceFilters): Promise<CommissionSummary[]> =>
    readDb((db) => {
      const clientById = new Map(db.clients.map((item) => [item.id, item]));
      const serviceById = new Map(db.services.map((item) => [item.id, item]));

      return db.professionals
        .filter((pro) => !filters.unitId || pro.unitId === filters.unitId)
        .filter((pro) => !filters.professionalId || pro.id === filters.professionalId)
        .map((pro) => {
          const lines: CommissionLine[] = db.appointments
            .filter(
              (appointment) =>
                appointment.professionalId === pro.id &&
                appointment.status === "COMPLETED" &&
                withinRange(
                  toDayKey(new Date(appointment.startsAt)),
                  filters.from,
                  filters.to,
                ),
            )
            .map((appointment) => ({
              appointmentId: appointment.id,
              date: appointment.startsAt,
              clientName: clientById.get(appointment.clientId)?.name ?? "—",
              serviceName: serviceById.get(appointment.serviceId)?.name ?? "—",
              price: appointment.price,
              commissionRate: pro.commissionRate,
              commission:
                Math.round(appointment.price * pro.commissionRate * 100) / 100,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

          const grossRevenue = lines.reduce((sum, line) => sum + line.price, 0);

          return {
            professionalId: pro.id,
            professionalName: pro.name,
            commissionRate: pro.commissionRate,
            appointments: lines.length,
            grossRevenue,
            commission: lines.reduce((sum, line) => sum + line.commission, 0),
            lines,
          };
        })
        .sort((a, b) => b.commission - a.commission);
    }),
};
