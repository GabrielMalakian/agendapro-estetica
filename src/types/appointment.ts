import type { ISODateTimeString, UUID } from "./common";

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  PAID: "Pago",
};

export const PAYMENT_METHODS = ["CASH", "PIX", "CREDIT", "DEBIT"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT: "Crédito",
  DEBIT: "Débito",
};

export const APPOINTMENT_SOURCES = ["INTERNAL", "ONLINE"] as const;
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export interface Appointment {
  id: UUID;
  unitId: UUID;
  clientId: UUID;
  professionalId: UUID;
  serviceId: UUID;
  roomId?: UUID;
  /** Início do atendimento (ISO 8601). */
  startsAt: ISODateTimeString;
  /** Fim do atendimento já incluindo o buffer do serviço. */
  endsAt: ISODateTimeString;
  status: AppointmentStatus;
  price: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  depositAmount?: number;
  notes: string;
  createdBy: UUID;
  source: AppointmentSource;
  createdAt: ISODateTimeString;
  /** Consumo de pacote: quando presente, a sessão foi debitada deste pacote. */
  clientPackageId?: UUID;
  /** Anotação do profissional feita durante/após o atendimento. */
  professionalNotes?: string;
  cancelledAt?: ISODateTimeString;
  cancellationReason?: string;
}

/** Bloqueio de agenda que não é um atendimento (almoço, reunião, manutenção). */
export interface ScheduleBlock {
  id: UUID;
  unitId: UUID;
  professionalId: UUID | null;
  roomId?: UUID;
  startsAt: ISODateTimeString;
  endsAt: ISODateTimeString;
  reason: string;
}

export interface Payment {
  id: UUID;
  appointmentId: UUID;
  amount: number;
  method: PaymentMethod;
  paidAt: ISODateTimeString;
}

export interface Review {
  id: UUID;
  appointmentId: UUID;
  clientId: UUID;
  /** 1 a 5 estrelas. */
  rating: number;
  comment: string;
  createdAt: ISODateTimeString;
}
