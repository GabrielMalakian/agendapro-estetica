import type {
  ISODateString,
  TimeString,
  UUID,
  Weekday,
} from "./common";

export const ROLES = ["ADMIN", "PROFESSIONAL", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  PROFESSIONAL: "Profissional",
  CLIENT: "Cliente",
};

/** Rota inicial de cada papel — usada pelos guards de layout. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  PROFESSIONAL: "/pro",
  CLIENT: "/app",
};

export interface User {
  id: UUID;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  companyId?: UUID;
  unitId?: UUID;
}

/** Faixa de trabalho do profissional em um dia da semana. */
export interface WorkingHours {
  weekday: Weekday;
  startTime: TimeString;
  endTime: TimeString;
  breakStart?: TimeString;
  breakEnd?: TimeString;
  enabled: boolean;
}

export const TIME_OFF_TYPES = ["VACATION", "DAY_OFF", "BLOCK", "SICK"] as const;
export type TimeOffType = (typeof TIME_OFF_TYPES)[number];

export const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  VACATION: "Férias",
  DAY_OFF: "Folga",
  BLOCK: "Bloqueio",
  SICK: "Atestado",
};

export const TIME_OFF_STATUSES = ["APPROVED", "PENDING", "REJECTED"] as const;
export type TimeOffStatus = (typeof TIME_OFF_STATUSES)[number];

/**
 * Ausência do profissional. Quando `allDay` é verdadeiro as horas são
 * ignoradas e o dia inteiro fica indisponível.
 */
export interface TimeOff {
  id: UUID;
  professionalId: UUID;
  type: TimeOffType;
  status: TimeOffStatus;
  startDate: ISODateString;
  endDate: ISODateString;
  startTime?: TimeString;
  endTime?: TimeString;
  allDay: boolean;
  reason: string;
}

export interface Professional {
  id: UUID;
  unitId: UUID;
  userId: UUID;
  name: string;
  avatarUrl: string | null;
  specialty: string;
  serviceIds: UUID[];
  workingHours: WorkingHours[];
  timeOff: TimeOff[];
  /** Percentual de comissão sobre o valor do atendimento (0–1). */
  commissionRate: number;
  active: boolean;
}
