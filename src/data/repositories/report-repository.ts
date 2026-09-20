"use client";

import { differenceInDays, eachDayOfInterval, parseISO } from "date-fns";

import type { Appointment, ISODateString } from "@/types";
import { getAvailableSlots, toDayKey } from "@/lib/scheduling";

import { readDb } from "./core";

export interface ReportFilters {
  unitId?: string;
  from: ISODateString;
  to: ISODateString;
  professionalId?: string;
}

export interface DashboardToday {
  appointments: number;
  revenue: number;
  cancellations: number;
  noShows: number;
  freeSlots: number;
  occupancyRate: number;
  next: Appointment[];
}

export interface RevenuePoint {
  date: string;
  /** Rótulo curto pronto para o eixo X. */
  label: string;
  revenue: number;
  appointments: number;
}

export interface NamedMetric {
  id: string;
  name: string;
  value: number;
  secondary?: number;
}

export interface ClientsReport {
  total: number;
  newInPeriod: number;
  recurring: number;
  inactive90: number;
  retentionRate: number;
  monthly: { date: string; label: string; novos: number; recorrentes: number }[];
}

export interface CancellationReport {
  total: number;
  cancelled: number;
  noShow: number;
  cancellationRate: number;
  noShowRate: number;
  byProfessional: NamedMetric[];
  byWeekday: { label: string; cancelled: number; noShow: number }[];
}

export interface OccupancyReport {
  /** Percentual médio de ocupação no período. */
  average: number;
  daily: { date: string; label: string; occupancy: number }[];
  byProfessional: NamedMetric[];
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function shortLabel(dayKey: string): string {
  const [, month, day] = dayKey.split("-");
  return `${day}/${month}`;
}

function inRange(
  appointment: Appointment,
  filters: ReportFilters,
): boolean {
  if (filters.unitId && appointment.unitId !== filters.unitId) return false;
  if (
    filters.professionalId &&
    appointment.professionalId !== filters.professionalId
  ) {
    return false;
  }
  const key = toDayKey(new Date(appointment.startsAt));
  return key >= filters.from && key <= filters.to;
}

/** Dashboard e relatórios. Contrato §8. */
export const reportRepository = {
  /** `GET /reports/today?unitId=` */
  today: (unitId: string): Promise<DashboardToday> =>
    readDb((db) => {
      const now = new Date();
      const key = toDayKey(now);
      const ofDay = db.appointments.filter(
        (appointment) =>
          appointment.unitId === unitId &&
          toDayKey(new Date(appointment.startsAt)) === key,
      );

      const revenue = ofDay
        .filter((appointment) => appointment.status === "COMPLETED")
        .reduce((sum, appointment) => sum + appointment.price, 0);

      // Ocupação: minutos ocupados / minutos disponíveis das grades do dia.
      const professionals = db.professionals.filter(
        (pro) => pro.unitId === unitId && pro.active,
      );
      const unit = db.units.find((item) => item.id === unitId);

      let capacityMinutes = 0;
      let freeSlots = 0;
      if (unit) {
        for (const professional of professionals) {
          const grid = professional.workingHours.find(
            (item) => item.weekday === now.getDay(),
          );
          if (!grid?.enabled) continue;
          const [startH, startM] = grid.startTime.split(":").map(Number);
          const [endH, endM] = grid.endTime.split(":").map(Number);
          let minutes = endH * 60 + endM - (startH * 60 + startM);
          if (grid.breakStart && grid.breakEnd) {
            const [bsH, bsM] = grid.breakStart.split(":").map(Number);
            const [beH, beM] = grid.breakEnd.split(":").map(Number);
            minutes -= beH * 60 + beM - (bsH * 60 + bsM);
          }
          capacityMinutes += Math.max(0, minutes);

          const service = db.services.find(
            (item) => professional.serviceIds.includes(item.id) && item.active,
          );
          if (service) {
            freeSlots += getAvailableSlots({
              date: key,
              unit,
              service,
              professional,
              rooms: db.rooms,
              appointments: db.appointments,
              scheduleBlocks: db.scheduleBlocks,
              holidays: db.holidays,
              rules: db.settings.bookingRules,
              now,
            }).filter((slot) => slot.available).length;
          }
        }
      }

      const bookedMinutes = ofDay
        .filter(
          (appointment) =>
            appointment.status !== "CANCELLED" && appointment.status !== "NO_SHOW",
        )
        .reduce(
          (sum, appointment) =>
            sum +
            (new Date(appointment.endsAt).getTime() -
              new Date(appointment.startsAt).getTime()) /
              60_000,
          0,
        );

      return {
        appointments: ofDay.filter((item) => item.status !== "CANCELLED").length,
        revenue,
        cancellations: ofDay.filter((item) => item.status === "CANCELLED").length,
        noShows: ofDay.filter((item) => item.status === "NO_SHOW").length,
        freeSlots,
        occupancyRate:
          capacityMinutes > 0 ? Math.min(1, bookedMinutes / capacityMinutes) : 0,
        next: ofDay
          .filter(
            (appointment) =>
              new Date(appointment.startsAt) >= now &&
              appointment.status !== "CANCELLED",
          )
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .slice(0, 6),
      };
    }),

  /** `GET /reports/revenue` */
  revenue: (filters: ReportFilters): Promise<RevenuePoint[]> =>
    readDb((db) => {
      const days = eachDayOfInterval({
        start: parseISO(`${filters.from}T00:00:00`),
        end: parseISO(`${filters.to}T00:00:00`),
      });
      const buckets = new Map<string, RevenuePoint>(
        days.map((day) => {
          const key = toDayKey(day);
          return [key, { date: key, label: shortLabel(key), revenue: 0, appointments: 0 }];
        }),
      );

      for (const appointment of db.appointments) {
        if (!inRange(appointment, filters)) continue;
        if (appointment.status !== "COMPLETED") continue;
        const key = toDayKey(new Date(appointment.startsAt));
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.revenue += appointment.price;
        bucket.appointments += 1;
      }

      return [...buckets.values()];
    }),

  /** `GET /reports/by-professional` */
  byProfessional: (filters: ReportFilters): Promise<NamedMetric[]> =>
    readDb((db) =>
      db.professionals
        .filter((pro) => !filters.unitId || pro.unitId === filters.unitId)
        .map((pro) => {
          const own = db.appointments.filter(
            (appointment) =>
              appointment.professionalId === pro.id &&
              appointment.status === "COMPLETED" &&
              inRange(appointment, { ...filters, professionalId: undefined }),
          );
          return {
            id: pro.id,
            name: pro.name,
            value: own.length,
            secondary: own.reduce((sum, appointment) => sum + appointment.price, 0),
          };
        })
        .sort((a, b) => b.value - a.value),
    ),

  /** `GET /reports/by-service` */
  byService: (filters: ReportFilters): Promise<NamedMetric[]> =>
    readDb((db) => {
      const counts = new Map<string, NamedMetric>();
      for (const appointment of db.appointments) {
        if (!inRange(appointment, filters)) continue;
        if (appointment.status !== "COMPLETED") continue;
        const service = db.services.find((item) => item.id === appointment.serviceId);
        if (!service) continue;
        const current = counts.get(service.id) ?? {
          id: service.id,
          name: service.name,
          value: 0,
          secondary: 0,
        };
        current.value += 1;
        current.secondary = (current.secondary ?? 0) + appointment.price;
        counts.set(service.id, current);
      }
      return [...counts.values()].sort((a, b) => b.value - a.value);
    }),

  /** `GET /reports/clients` */
  clients: (filters: ReportFilters): Promise<ClientsReport> =>
    readDb((db) => {
      const scoped = db.clients.filter(
        (client) => !filters.unitId || client.unitId === filters.unitId,
      );
      const now = new Date();

      const completedByClient = new Map<string, Appointment[]>();
      for (const appointment of db.appointments) {
        if (appointment.status !== "COMPLETED") continue;
        const list = completedByClient.get(appointment.clientId) ?? [];
        list.push(appointment);
        completedByClient.set(appointment.clientId, list);
      }

      const newInPeriod = scoped.filter((client) => {
        const key = toDayKey(new Date(client.createdAt));
        return key >= filters.from && key <= filters.to;
      }).length;

      const recurring = scoped.filter(
        (client) => (completedByClient.get(client.id)?.length ?? 0) >= 3,
      ).length;

      const inactive90 = scoped.filter((client) => {
        const own = completedByClient.get(client.id) ?? [];
        if (own.length === 0) return true;
        const last = own
          .map((appointment) => new Date(appointment.startsAt))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        return differenceInDays(now, last) > 90;
      }).length;

      // Agrupamento mensal de novos × recorrentes.
      const monthly = new Map<string, { novos: number; recorrentes: number }>();
      for (const client of scoped) {
        const key = client.createdAt.slice(0, 7);
        const bucket = monthly.get(key) ?? { novos: 0, recorrentes: 0 };
        bucket.novos += 1;
        monthly.set(key, bucket);
      }
      for (const [clientId, list] of completedByClient) {
        if (list.length < 2) continue;
        const client = scoped.find((item) => item.id === clientId);
        if (!client) continue;
        const key = list
          .map((appointment) => appointment.startsAt.slice(0, 7))
          .sort()
          .reverse()[0];
        const bucket = monthly.get(key) ?? { novos: 0, recorrentes: 0 };
        bucket.recorrentes += 1;
        monthly.set(key, bucket);
      }

      return {
        total: scoped.length,
        newInPeriod,
        recurring,
        inactive90,
        retentionRate: scoped.length > 0 ? recurring / scoped.length : 0,
        monthly: [...monthly.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-12)
          .map(([date, value]) => ({
            date,
            label: `${date.slice(5)}/${date.slice(2, 4)}`,
            ...value,
          })),
      };
    }),

  /** `GET /reports/cancellations` */
  cancellations: (filters: ReportFilters): Promise<CancellationReport> =>
    readDb((db) => {
      const scoped = db.appointments.filter((appointment) =>
        inRange(appointment, filters),
      );
      const cancelled = scoped.filter((item) => item.status === "CANCELLED");
      const noShow = scoped.filter((item) => item.status === "NO_SHOW");

      const byProfessional = db.professionals
        .filter((pro) => !filters.unitId || pro.unitId === filters.unitId)
        .map((pro) => ({
          id: pro.id,
          name: pro.name,
          value: cancelled.filter((item) => item.professionalId === pro.id).length,
          secondary: noShow.filter((item) => item.professionalId === pro.id).length,
        }))
        .sort((a, b) => b.value + (b.secondary ?? 0) - (a.value + (a.secondary ?? 0)));

      const byWeekday = WEEKDAY_LABELS.map((label, weekday) => ({
        label,
        cancelled: cancelled.filter(
          (item) => new Date(item.startsAt).getDay() === weekday,
        ).length,
        noShow: noShow.filter((item) => new Date(item.startsAt).getDay() === weekday)
          .length,
      }));

      return {
        total: scoped.length,
        cancelled: cancelled.length,
        noShow: noShow.length,
        cancellationRate: scoped.length > 0 ? cancelled.length / scoped.length : 0,
        noShowRate: scoped.length > 0 ? noShow.length / scoped.length : 0,
        byProfessional,
        byWeekday,
      };
    }),

  /** `GET /reports/occupancy` */
  occupancy: (filters: ReportFilters): Promise<OccupancyReport> =>
    readDb((db) => {
      const days = eachDayOfInterval({
        start: parseISO(`${filters.from}T00:00:00`),
        end: parseISO(`${filters.to}T00:00:00`),
      });
      const professionals = db.professionals.filter(
        (pro) =>
          (!filters.unitId || pro.unitId === filters.unitId) &&
          (!filters.professionalId || pro.id === filters.professionalId) &&
          pro.active,
      );

      const capacityFor = (professionalId: string, weekday: number): number => {
        const pro = professionals.find((item) => item.id === professionalId);
        const grid = pro?.workingHours.find((item) => item.weekday === weekday);
        if (!grid?.enabled) return 0;
        const [startH, startM] = grid.startTime.split(":").map(Number);
        const [endH, endM] = grid.endTime.split(":").map(Number);
        let minutes = endH * 60 + endM - (startH * 60 + startM);
        if (grid.breakStart && grid.breakEnd) {
          const [bsH, bsM] = grid.breakStart.split(":").map(Number);
          const [beH, beM] = grid.breakEnd.split(":").map(Number);
          minutes -= beH * 60 + beM - (bsH * 60 + bsM);
        }
        return Math.max(0, minutes);
      };

      const bookedByProfessional = new Map<string, number>();
      const capacityByProfessional = new Map<string, number>();

      const daily = days.map((day) => {
        const key = toDayKey(day);
        let capacity = 0;
        let booked = 0;

        for (const professional of professionals) {
          const dayCapacity = capacityFor(professional.id, day.getDay());
          capacity += dayCapacity;
          capacityByProfessional.set(
            professional.id,
            (capacityByProfessional.get(professional.id) ?? 0) + dayCapacity,
          );
        }

        for (const appointment of db.appointments) {
          if (toDayKey(new Date(appointment.startsAt)) !== key) continue;
          if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
            continue;
          }
          if (!professionals.some((pro) => pro.id === appointment.professionalId)) continue;
          const minutes =
            (new Date(appointment.endsAt).getTime() -
              new Date(appointment.startsAt).getTime()) /
            60_000;
          booked += minutes;
          bookedByProfessional.set(
            appointment.professionalId,
            (bookedByProfessional.get(appointment.professionalId) ?? 0) + minutes,
          );
        }

        return {
          date: key,
          label: shortLabel(key),
          occupancy: capacity > 0 ? Math.min(1, booked / capacity) : 0,
        };
      });

      const withCapacity = daily.filter((item) => item.occupancy > 0);

      return {
        average:
          withCapacity.length > 0
            ? withCapacity.reduce((sum, item) => sum + item.occupancy, 0) /
              withCapacity.length
            : 0,
        daily,
        byProfessional: professionals
          .map((pro) => {
            const capacity = capacityByProfessional.get(pro.id) ?? 0;
            const booked = bookedByProfessional.get(pro.id) ?? 0;
            return {
              id: pro.id,
              name: pro.name,
              value: capacity > 0 ? Math.min(1, booked / capacity) : 0,
            };
          })
          .sort((a, b) => b.value - a.value),
      };
    }),
};
