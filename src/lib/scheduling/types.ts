import type {
  Appointment,
  BookingRules,
  Holiday,
  ISODateString,
  ISODateTimeString,
  Professional,
  Room,
  ScheduleBlock,
  Service,
  Unit,
} from "@/types";

/** Motivo pelo qual um horário candidato não pode ser usado. */
export const SLOT_BLOCK_REASONS = [
  "OUTSIDE_BUSINESS_HOURS",
  "OUTSIDE_WORKING_HOURS",
  "BREAK",
  "HOLIDAY",
  "TIME_OFF",
  "PROFESSIONAL_BUSY",
  "ROOM_BUSY",
  "SCHEDULE_BLOCK",
  "TOO_SOON",
  "TOO_FAR",
] as const;
export type SlotBlockReason = (typeof SLOT_BLOCK_REASONS)[number];

export const SLOT_BLOCK_REASON_LABELS: Record<SlotBlockReason, string> = {
  OUTSIDE_BUSINESS_HOURS: "Fora do horário de funcionamento",
  OUTSIDE_WORKING_HOURS: "Fora da grade do profissional",
  BREAK: "Intervalo do profissional",
  HOLIDAY: "Feriado",
  TIME_OFF: "Profissional de folga",
  PROFESSIONAL_BUSY: "Profissional ocupado",
  ROOM_BUSY: "Sala ou equipamento ocupado",
  SCHEDULE_BLOCK: "Horário bloqueado",
  TOO_SOON: "Antecedência mínima não respeitada",
  TOO_FAR: "Fora da janela de agendamento",
};

export interface Slot {
  /** Início do slot em ISO 8601. */
  startsAt: ISODateTimeString;
  /** Fim já incluindo duração + buffer do serviço. */
  endsAt: ISODateTimeString;
  available: boolean;
  /** Preenchido apenas quando `available` é falso. */
  reason?: SlotBlockReason;
  /** Sala atribuída automaticamente quando o serviço exige uma. */
  roomId?: string;
}

export interface AvailabilityInput {
  /** Dia a calcular, no formato `yyyy-MM-dd`. */
  date: ISODateString;
  unit: Unit;
  service: Service;
  professional: Professional;
  /** Salas da unidade — o motor escolhe a primeira livre entre as elegíveis. */
  rooms: Room[];
  /** Agendamentos existentes (qualquer unidade; o motor filtra). */
  appointments: Appointment[];
  scheduleBlocks: ScheduleBlock[];
  holidays: Holiday[];
  rules: BookingRules;
  /** Instante de referência — injetado para a função ser pura e testável. */
  now: Date;
  /** Ignora este agendamento nos conflitos (usado ao reagendar). */
  excludeAppointmentId?: string;
  /**
   * Quando verdadeiro, devolve também os slots indisponíveis com o motivo.
   * A área do cliente usa `false`; a agenda do admin usa `true`.
   */
  includeUnavailable?: boolean;
  /**
   * Encaixe: ignora a antecedência mínima e a janela máxima. Só admin e
   * profissional podem usar.
   */
  allowOverbooking?: boolean;
}

/** Intervalo de tempo fechado no início e aberto no fim: `[start, end)`. */
export interface Interval {
  start: Date;
  end: Date;
}
