"use client";

import type { Database } from "../database";
import type {
  Appointment,
  AppointmentStatus,
  ISODateString,
  Payment,
  PaymentMethod,
  PaymentStatus,
  ScheduleBlock,
} from "@/types";
import {
  getAvailableSlots,
  findFirstAvailable,
  getAvailableDays,
  toDayKey,
  validateAppointment,
  type AppointmentValidationError,
  type Slot,
} from "@/lib/scheduling";

import {
  newId,
  nowIso,
  notFound,
  readDb,
  RepositoryError,
  replaceById,
  writeDb,
} from "./core";

export interface AppointmentFilters {
  unitId?: string;
  professionalId?: string;
  clientId?: string;
  serviceId?: string;
  roomId?: string;
  status?: AppointmentStatus[];
  paymentStatus?: PaymentStatus[];
  /** Intervalo fechado em dias locais (`yyyy-MM-dd`). */
  from?: ISODateString;
  to?: ISODateString;
  search?: string;
}

export interface CreateAppointmentInput {
  unitId: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  roomId?: string;
  startsAt: string;
  endsAt?: string;
  notes?: string;
  createdBy: string;
  source?: Appointment["source"];
  depositAmount?: number;
  clientPackageId?: string;
  /** Encaixe — ignora restrições de janela, nunca as de sobreposição. */
  allowOverbooking?: boolean;
}

/** Erro devolvido quando a validação de agendamento reprova. */
export class AppointmentConflictError extends RepositoryError {
  constructor(readonly errors: AppointmentValidationError[]) {
    super("APPOINTMENT_CONFLICT", errors.map((item) => item.message).join(" "), 409);
    this.name = "AppointmentConflictError";
  }
}

/** Resolve as dependências que o validador precisa, a partir da base. */
function contextFor(
  db: Database,
  input: { unitId: string; serviceId: string; professionalId: string; clientId: string },
) {
  const unit = db.units.find((item) => item.id === input.unitId);
  const service = db.services.find((item) => item.id === input.serviceId);
  const professional = db.professionals.find(
    (item) => item.id === input.professionalId,
  );
  if (!unit) notFound("Unidade");
  if (!service) notFound("Serviço");
  if (!professional) notFound("Profissional");
  return {
    unit,
    service,
    professional,
    client: db.clients.find((item) => item.id === input.clientId),
    rooms: db.rooms,
    appointments: db.appointments,
    scheduleBlocks: db.scheduleBlocks,
    holidays: db.holidays,
    rules: db.settings.bookingRules,
  };
}

function inRange(appointment: Appointment, from?: string, to?: string): boolean {
  const key = toDayKey(new Date(appointment.startsAt));
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

/** Agendamentos, bloqueios, pagamentos e disponibilidade. Contrato §2 e §6. */
export const appointmentRepository = {
  /** `GET /appointments` */
  list: (filters: AppointmentFilters = {}): Promise<Appointment[]> =>
    readDb((db) => {
      const term = filters.search?.trim().toLowerCase();
      const clientById = new Map(db.clients.map((item) => [item.id, item]));
      const serviceById = new Map(db.services.map((item) => [item.id, item]));

      return db.appointments
        .filter((appointment) => {
          if (filters.unitId && appointment.unitId !== filters.unitId) return false;
          if (
            filters.professionalId &&
            appointment.professionalId !== filters.professionalId
          ) {
            return false;
          }
          if (filters.clientId && appointment.clientId !== filters.clientId) return false;
          if (filters.serviceId && appointment.serviceId !== filters.serviceId) return false;
          if (filters.roomId && appointment.roomId !== filters.roomId) return false;
          if (filters.status && !filters.status.includes(appointment.status)) return false;
          if (
            filters.paymentStatus &&
            !filters.paymentStatus.includes(appointment.paymentStatus)
          ) {
            return false;
          }
          if (!inRange(appointment, filters.from, filters.to)) return false;
          if (term) {
            const client = clientById.get(appointment.clientId);
            const service = serviceById.get(appointment.serviceId);
            const haystack =
              `${client?.name ?? ""} ${client?.phone ?? ""} ${service?.name ?? ""}`.toLowerCase();
            if (!haystack.includes(term)) return false;
          }
          return true;
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }),

  /** `GET /appointments/:id` */
  get: (id: string): Promise<Appointment | null> =>
    readDb((db) => db.appointments.find((item) => item.id === id) ?? null),

  /** `POST /appointments` */
  create: (input: CreateAppointmentInput): Promise<Appointment> =>
    writeDb((db) => {
      const context = contextFor(db, input);
      const validation = validateAppointment({
        draft: input,
        ...context,
        now: new Date(),
        allowOverbooking: input.allowOverbooking,
      });
      if (!validation.valid) throw new AppointmentConflictError(validation.errors);

      const duration =
        context.service.durationMinutes + context.service.bufferMinutes;
      const startsAt = new Date(input.startsAt);
      const endsAt = input.endsAt
        ? new Date(input.endsAt)
        : new Date(startsAt.getTime() + duration * 60_000);

      const appointment: Appointment = {
        id: newId(),
        unitId: input.unitId,
        clientId: input.clientId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        roomId: input.roomId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: "SCHEDULED",
        price: input.clientPackageId ? 0 : context.service.price,
        paymentStatus: "PENDING",
        depositAmount: input.depositAmount,
        notes: input.notes ?? "",
        createdBy: input.createdBy,
        source: input.source ?? "INTERNAL",
        createdAt: nowIso(),
        clientPackageId: input.clientPackageId,
      };

      // Consumir sessão do pacote, quando houver.
      const clientPackages = input.clientPackageId
        ? replaceById(db.clientPackages, input.clientPackageId, (item) => ({
            ...item,
            sessionsUsed: item.sessionsUsed + 1,
          }))
        : db.clientPackages;

      return {
        db: {
          ...db,
          appointments: [...db.appointments, appointment],
          clientPackages,
        },
        result: appointment,
      };
    }),

  /**
   * `PATCH /appointments/:id` — usado também para reagendar (drag-and-drop).
   * Revalida sempre, porque mover o cartão pode criar conflito.
   */
  update: (
    id: string,
    patch: Partial<
      Pick<
        Appointment,
        | "startsAt"
        | "endsAt"
        | "professionalId"
        | "roomId"
        | "serviceId"
        | "notes"
        | "professionalNotes"
        | "price"
        | "status"
      >
    >,
    options: { allowOverbooking?: boolean } = {},
  ): Promise<Appointment> =>
    writeDb((db) => {
      const current = db.appointments.find((item) => item.id === id);
      if (!current) notFound("Agendamento");

      const merged: Appointment = { ...current, ...patch };
      const touchesSchedule =
        patch.startsAt !== undefined ||
        patch.endsAt !== undefined ||
        patch.professionalId !== undefined ||
        patch.roomId !== undefined ||
        patch.serviceId !== undefined;

      if (touchesSchedule) {
        const context = contextFor(db, merged);
        // Ao mover, o fim acompanha o serviço se não veio explícito.
        const duration =
          context.service.durationMinutes + context.service.bufferMinutes;
        if (patch.endsAt === undefined) {
          merged.endsAt = new Date(
            new Date(merged.startsAt).getTime() + duration * 60_000,
          ).toISOString();
        }
        const validation = validateAppointment({
          draft: { ...merged, id },
          ...context,
          now: new Date(),
          allowOverbooking: options.allowOverbooking,
        });
        if (!validation.valid) throw new AppointmentConflictError(validation.errors);
      }

      return {
        db: { ...db, appointments: replaceById(db.appointments, id, () => merged) },
        result: merged,
      };
    }),

  /** `PATCH /appointments/:id/status` */
  changeStatus: (
    id: string,
    status: AppointmentStatus,
    options: { reason?: string } = {},
  ): Promise<Appointment> =>
    writeDb((db) => {
      const current = db.appointments.find((item) => item.id === id);
      if (!current) notFound("Agendamento");
      const updated: Appointment = {
        ...current,
        status,
        cancelledAt: status === "CANCELLED" ? nowIso() : current.cancelledAt,
        cancellationReason:
          status === "CANCELLED" ? (options.reason ?? "") : current.cancellationReason,
      };
      return {
        db: { ...db, appointments: replaceById(db.appointments, id, () => updated) },
        result: updated,
      };
    }),

  /** `PATCH /appointments/bulk/status` — ação em massa na tabela. */
  bulkChangeStatus: (
    ids: string[],
    status: AppointmentStatus,
  ): Promise<number> =>
    writeDb((db) => {
      const target = new Set(ids);
      const appointments = db.appointments.map((appointment) =>
        target.has(appointment.id)
          ? {
              ...appointment,
              status,
              cancelledAt: status === "CANCELLED" ? nowIso() : appointment.cancelledAt,
            }
          : appointment,
      );
      return { db: { ...db, appointments }, result: target.size };
    }),

  /** `POST /appointments/:id/payments` */
  registerPayment: (
    appointmentId: string,
    input: { amount: number; method: PaymentMethod },
  ): Promise<Payment> =>
    writeDb((db) => {
      const appointment = db.appointments.find((item) => item.id === appointmentId);
      if (!appointment) notFound("Agendamento");

      const payment: Payment = {
        id: newId(),
        appointmentId,
        amount: input.amount,
        method: input.method,
        paidAt: nowIso(),
      };

      const alreadyPaid = db.payments
        .filter((item) => item.appointmentId === appointmentId)
        .reduce((sum, item) => sum + item.amount, 0);
      const total = alreadyPaid + input.amount;
      const paymentStatus: PaymentStatus =
        total >= appointment.price ? "PAID" : total > 0 ? "PARTIAL" : "PENDING";

      return {
        db: {
          ...db,
          payments: [...db.payments, payment],
          appointments: replaceById(db.appointments, appointmentId, (item) => ({
            ...item,
            paymentStatus,
            paymentMethod: input.method,
          })),
        },
        result: payment,
      };
    }),

  /** `GET /appointments/:id/payments` */
  listPayments: (appointmentId?: string): Promise<Payment[]> =>
    readDb((db) =>
      appointmentId
        ? db.payments.filter((item) => item.appointmentId === appointmentId)
        : db.payments,
    ),

  /** `GET /schedule-blocks?unitId=` */
  listBlocks: (unitId?: string): Promise<ScheduleBlock[]> =>
    readDb((db) =>
      unitId ? db.scheduleBlocks.filter((item) => item.unitId === unitId) : db.scheduleBlocks,
    ),

  /** `POST /schedule-blocks` */
  createBlock: (input: Omit<ScheduleBlock, "id">): Promise<ScheduleBlock> =>
    writeDb((db) => {
      const block: ScheduleBlock = { ...input, id: newId() };
      return {
        db: { ...db, scheduleBlocks: [...db.scheduleBlocks, block] },
        result: block,
      };
    }),

  /** `DELETE /schedule-blocks/:id` */
  deleteBlock: (id: string): Promise<void> =>
    writeDb((db) => ({
      db: {
        ...db,
        scheduleBlocks: db.scheduleBlocks.filter((item) => item.id !== id),
      },
      result: undefined,
    })),

  /** `GET /availability/slots` */
  availableSlots: (input: {
    date: string;
    unitId: string;
    serviceId: string;
    professionalId: string;
    includeUnavailable?: boolean;
    excludeAppointmentId?: string;
    allowOverbooking?: boolean;
  }): Promise<Slot[]> =>
    readDb((db) => {
      const unit = db.units.find((item) => item.id === input.unitId);
      const service = db.services.find((item) => item.id === input.serviceId);
      const professional = db.professionals.find(
        (item) => item.id === input.professionalId,
      );
      if (!unit || !service || !professional) return [];
      return getAvailableSlots({
        date: input.date,
        unit,
        service,
        professional,
        rooms: db.rooms,
        appointments: db.appointments,
        scheduleBlocks: db.scheduleBlocks,
        holidays: db.holidays,
        rules: db.settings.bookingRules,
        now: new Date(),
        includeUnavailable: input.includeUnavailable,
        excludeAppointmentId: input.excludeAppointmentId,
        allowOverbooking: input.allowOverbooking,
      });
    }),

  /** `GET /availability/first-available` */
  firstAvailable: (input: {
    date: string;
    unitId: string;
    serviceId: string;
  }): Promise<{ professionalId: string; slot: Slot } | null> =>
    readDb((db) => {
      const unit = db.units.find((item) => item.id === input.unitId);
      const service = db.services.find((item) => item.id === input.serviceId);
      if (!unit || !service) return null;
      return findFirstAvailable({
        date: input.date,
        unit,
        service,
        professionals: db.professionals.filter(
          (pro) => pro.unitId === input.unitId && pro.active,
        ),
        rooms: db.rooms,
        appointments: db.appointments,
        scheduleBlocks: db.scheduleBlocks,
        holidays: db.holidays,
        rules: db.settings.bookingRules,
        now: new Date(),
      });
    }),

  /** `GET /availability/days` — dias com vaga, para desabilitar o calendário. */
  availableDays: (input: {
    unitId: string;
    serviceId: string;
    professionalId?: string;
    from: string;
    days: number;
  }): Promise<string[]> =>
    readDb((db) => {
      const unit = db.units.find((item) => item.id === input.unitId);
      const service = db.services.find((item) => item.id === input.serviceId);
      if (!unit || !service) return [];

      const professionals = input.professionalId
        ? db.professionals.filter((pro) => pro.id === input.professionalId)
        : db.professionals.filter(
            (pro) =>
              pro.unitId === input.unitId &&
              pro.active &&
              pro.serviceIds.includes(service.id),
          );

      const days = new Set<string>();
      for (const professional of professionals) {
        for (const day of getAvailableDays({
          from: new Date(`${input.from}T00:00:00`),
          days: input.days,
          unit,
          service,
          professional,
          rooms: db.rooms,
          appointments: db.appointments,
          scheduleBlocks: db.scheduleBlocks,
          holidays: db.holidays,
          rules: db.settings.bookingRules,
          now: new Date(),
        })) {
          days.add(day);
        }
      }
      return [...days].sort();
    }),

  /** `POST /appointments/validate` — pré-checagem sem gravar. */
  validate: (input: CreateAppointmentInput & { id?: string }): Promise<
    AppointmentValidationError[]
  > =>
    readDb((db) => {
      const context = contextFor(db, input);
      const validation = validateAppointment({
        draft: input,
        ...context,
        now: new Date(),
        allowOverbooking: input.allowOverbooking,
      });
      return validation.valid ? [] : validation.errors;
    }),
};
