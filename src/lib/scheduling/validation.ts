import { addMinutes, differenceInCalendarDays, parseISO } from "date-fns";

import type {
  Appointment,
  BookingRules,
  Client,
  Holiday,
  ISODateTimeString,
  Professional,
  Room,
  ScheduleBlock,
  Service,
  Unit,
  Weekday,
} from "@/types";

import { isBlocking, resolveServiceDuration } from "./availability";
import { atTime, overlaps, toDayKey } from "./intervals";
import type { Interval } from "./types";

export const APPOINTMENT_ERROR_CODES = [
  "PROFESSIONAL_CONFLICT",
  "ROOM_CONFLICT",
  "CLIENT_CONFLICT",
  "PROFESSIONAL_NOT_QUALIFIED",
  "OUTSIDE_BUSINESS_HOURS",
  "OUTSIDE_WORKING_HOURS",
  "HOLIDAY",
  "TIME_OFF",
  "SCHEDULE_BLOCK",
  "ROOM_REQUIRED",
  "ROOM_NOT_ALLOWED",
  "INVALID_RANGE",
  "TOO_SOON",
  "TOO_FAR",
  "SERVICE_INACTIVE",
] as const;
export type AppointmentErrorCode = (typeof APPOINTMENT_ERROR_CODES)[number];

export interface AppointmentValidationError {
  code: AppointmentErrorCode;
  /** Mensagem pronta para exibir ao usuário, em pt-BR. */
  message: string;
  /** Campo do formulário ao qual o erro se refere, quando aplicável. */
  field?: "professionalId" | "roomId" | "clientId" | "startsAt" | "serviceId";
  /** Agendamento que causou o conflito, quando o erro for de sobreposição. */
  conflictingAppointmentId?: string;
  /** Erros de janela de horário são contornáveis por encaixe. */
  overridable: boolean;
}

export type AppointmentValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: AppointmentValidationError[] };

export interface ValidateAppointmentInput {
  /** Dados do agendamento pretendido. */
  draft: {
    id?: string;
    unitId: string;
    clientId: string;
    professionalId: string;
    serviceId: string;
    roomId?: string;
    startsAt: ISODateTimeString;
    /** Opcional: por padrão é `startsAt` + duração + buffer do serviço. */
    endsAt?: ISODateTimeString;
  };
  unit: Unit;
  service: Service;
  professional: Professional;
  client?: Client;
  rooms: Room[];
  appointments: Appointment[];
  scheduleBlocks: ScheduleBlock[];
  holidays: Holiday[];
  rules: BookingRules;
  now: Date;
  /** Encaixe: rebaixa os erros contornáveis a avisos e não reprova. */
  allowOverbooking?: boolean;
}

function error(
  code: AppointmentErrorCode,
  message: string,
  extra: Partial<AppointmentValidationError> = {},
): AppointmentValidationError {
  return { code, message, overridable: false, ...extra };
}

/**
 * Valida um agendamento antes de gravar.
 *
 * Rejeita, entre outras coisas, sobreposição de **profissional**, de **sala**
 * e de **cliente** — as três checagens exigidas pela regra de negócio — e
 * devolve erros tipados e legíveis, com o id do agendamento conflitante para
 * a UI conseguir mostrar "conflita com X às 14h".
 *
 * Com `allowOverbooking`, os erros de janela (fora do expediente, folga,
 * antecedência) deixam de reprovar — mas os três conflitos de sobreposição
 * continuam sendo bloqueantes, porque duas pessoas não ocupam a mesma cadeira.
 */
export function validateAppointment(
  input: ValidateAppointmentInput,
): AppointmentValidationResult {
  const {
    draft,
    unit,
    service,
    professional,
    client,
    rooms,
    appointments,
    scheduleBlocks,
    holidays,
    rules,
    now,
    allowOverbooking = false,
  } = input;

  const errors: AppointmentValidationError[] = [];

  const start = parseISO(draft.startsAt);
  const end = draft.endsAt
    ? parseISO(draft.endsAt)
    : addMinutes(start, resolveServiceDuration(service));

  if (Number.isNaN(start.getTime()) || end <= start) {
    return {
      valid: false,
      errors: [
        error("INVALID_RANGE", "O horário de término precisa ser depois do início.", {
          field: "startsAt",
        }),
      ],
    };
  }

  const candidate: Interval = { start, end };
  const day = start;
  const dayKey = toDayKey(day);
  const weekday = day.getDay() as Weekday;

  /* ---------------------------- serviço e sala --------------------------- */
  if (!service.active) {
    errors.push(
      error("SERVICE_INACTIVE", `O serviço "${service.name}" está inativo.`, {
        field: "serviceId",
      }),
    );
  }

  if (!professional.serviceIds.includes(service.id)) {
    errors.push(
      error(
        "PROFESSIONAL_NOT_QUALIFIED",
        `${professional.name} não está habilitado para "${service.name}".`,
        { field: "professionalId" },
      ),
    );
  }

  if (service.requiresRoom && !draft.roomId) {
    errors.push(
      error(
        "ROOM_REQUIRED",
        `"${service.name}" precisa de sala, cadeira ou equipamento reservado.`,
        { field: "roomId" },
      ),
    );
  }

  if (draft.roomId) {
    const room = rooms.find((item) => item.id === draft.roomId);
    if (!room || room.unitId !== unit.id) {
      errors.push(
        error("ROOM_NOT_ALLOWED", "A sala escolhida não pertence a esta unidade.", {
          field: "roomId",
        }),
      );
    } else if (service.roomIds.length > 0 && !service.roomIds.includes(room.id)) {
      errors.push(
        error(
          "ROOM_NOT_ALLOWED",
          `"${room.name}" não está liberada para "${service.name}".`,
          { field: "roomId" },
        ),
      );
    }
  }

  /* --------------------------- janelas de horário ------------------------ */
  const isHoliday = holidays.some(
    (holiday) => holiday.unitId === unit.id && holiday.date === dayKey,
  );
  if (isHoliday) {
    errors.push(
      error("HOLIDAY", "A unidade não abre nesta data (feriado).", {
        field: "startsAt",
        overridable: true,
      }),
    );
  }

  const businessHours = unit.businessHours.find((item) => item.weekday === weekday);
  if (!businessHours || businessHours.closed) {
    errors.push(
      error(
        "OUTSIDE_BUSINESS_HOURS",
        "A unidade não funciona neste dia da semana.",
        { field: "startsAt", overridable: true },
      ),
    );
  } else {
    const open = atTime(day, businessHours.openTime);
    const close = atTime(day, businessHours.closeTime);
    if (start < open || end > close) {
      errors.push(
        error(
          "OUTSIDE_BUSINESS_HOURS",
          `Fora do horário de funcionamento (${businessHours.openTime} às ${businessHours.closeTime}).`,
          { field: "startsAt", overridable: true },
        ),
      );
    }
  }

  const grid = professional.workingHours.find((item) => item.weekday === weekday);
  if (!grid || !grid.enabled) {
    errors.push(
      error(
        "OUTSIDE_WORKING_HOURS",
        `${professional.name} não atende neste dia da semana.`,
        { field: "professionalId", overridable: true },
      ),
    );
  } else {
    const gridStart = atTime(day, grid.startTime);
    const gridEnd = atTime(day, grid.endTime);
    if (start < gridStart || end > gridEnd) {
      errors.push(
        error(
          "OUTSIDE_WORKING_HOURS",
          `Fora da grade de ${professional.name} (${grid.startTime} às ${grid.endTime}).`,
          { field: "professionalId", overridable: true },
        ),
      );
    }
  }

  const onTimeOff = professional.timeOff.some((off) => {
    if (off.status !== "APPROVED") return false;
    if (dayKey < off.startDate || dayKey > off.endDate) return false;
    if (off.allDay) return true;
    return overlaps(candidate, {
      start: atTime(day, off.startTime ?? "00:00"),
      end: atTime(day, off.endTime ?? "23:59"),
    });
  });
  if (onTimeOff) {
    errors.push(
      error("TIME_OFF", `${professional.name} está de folga neste horário.`, {
        field: "professionalId",
        overridable: true,
      }),
    );
  }

  const conflictingBlock = scheduleBlocks.find(
    (block) =>
      block.unitId === unit.id &&
      (block.professionalId === professional.id ||
        block.professionalId === null ||
        (draft.roomId !== undefined && block.roomId === draft.roomId)) &&
      overlaps(candidate, {
        start: parseISO(block.startsAt),
        end: parseISO(block.endsAt),
      }),
  );
  if (conflictingBlock) {
    errors.push(
      error("SCHEDULE_BLOCK", `Horário bloqueado: ${conflictingBlock.reason}.`, {
        field: "startsAt",
        overridable: true,
      }),
    );
  }

  /* ------------------------------ antecedência --------------------------- */
  if (start < addMinutes(now, rules.minAdvanceMinutes)) {
    errors.push(
      error(
        "TOO_SOON",
        `É preciso agendar com pelo menos ${rules.minAdvanceMinutes} minutos de antecedência.`,
        { field: "startsAt", overridable: true },
      ),
    );
  }
  if (differenceInCalendarDays(start, now) > rules.maxAdvanceDays) {
    errors.push(
      error(
        "TOO_FAR",
        `Só é possível agendar com até ${rules.maxAdvanceDays} dias de antecedência.`,
        { field: "startsAt", overridable: true },
      ),
    );
  }

  /* --------------------------- sobreposições ----------------------------- */
  const active = appointments.filter(
    (appointment) => appointment.id !== draft.id && isBlocking(appointment.status),
  );

  const proConflict = active.find(
    (appointment) =>
      appointment.professionalId === draft.professionalId &&
      overlaps(candidate, {
        start: parseISO(appointment.startsAt),
        end: parseISO(appointment.endsAt),
      }),
  );
  if (proConflict) {
    errors.push(
      error(
        "PROFESSIONAL_CONFLICT",
        `${professional.name} já tem atendimento das ${formatHour(proConflict.startsAt)} às ${formatHour(proConflict.endsAt)}.`,
        {
          field: "professionalId",
          conflictingAppointmentId: proConflict.id,
        },
      ),
    );
  }

  if (draft.roomId) {
    const roomConflict = active.find(
      (appointment) =>
        appointment.roomId === draft.roomId &&
        overlaps(candidate, {
          start: parseISO(appointment.startsAt),
          end: parseISO(appointment.endsAt),
        }),
    );
    if (roomConflict) {
      const room = rooms.find((item) => item.id === draft.roomId);
      errors.push(
        error(
          "ROOM_CONFLICT",
          `${room?.name ?? "A sala"} já está ocupada das ${formatHour(roomConflict.startsAt)} às ${formatHour(roomConflict.endsAt)}.`,
          { field: "roomId", conflictingAppointmentId: roomConflict.id },
        ),
      );
    }
  }

  const clientConflict = active.find(
    (appointment) =>
      appointment.clientId === draft.clientId &&
      overlaps(candidate, {
        start: parseISO(appointment.startsAt),
        end: parseISO(appointment.endsAt),
      }),
  );
  if (clientConflict) {
    errors.push(
      error(
        "CLIENT_CONFLICT",
        `${client?.name ?? "O cliente"} já tem outro atendimento das ${formatHour(clientConflict.startsAt)} às ${formatHour(clientConflict.endsAt)}.`,
        { field: "clientId", conflictingAppointmentId: clientConflict.id },
      ),
    );
  }

  const blocking = allowOverbooking
    ? errors.filter((item) => !item.overridable)
    : errors;

  if (blocking.length === 0) return { valid: true, errors: [] };
  return { valid: false, errors: blocking };
}

/** `HH:mm` de um ISO — local, sem depender de date-fns/locale aqui. */
function formatHour(iso: ISODateTimeString): string {
  const date = parseISO(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/** Junta as mensagens dos erros em um texto único para toast. */
export function describeErrors(errors: AppointmentValidationError[]): string {
  return errors.map((item) => item.message).join(" ");
}
