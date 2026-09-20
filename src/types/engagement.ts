import type { ISODateTimeString, UUID } from "./common";

export const NOTIFICATION_CHANNELS = ["WHATSAPP", "EMAIL", "PUSH"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  PUSH: "Push",
};

export const NOTIFICATION_STATUSES = [
  "SCHEDULED",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  SCHEDULED: "Agendada",
  SENT: "Enviada",
  FAILED: "Falhou",
  CANCELLED: "Cancelada",
};

/** Chave do template. O corpo editável vive em `MessageTemplate`. */
export const NOTIFICATION_TEMPLATES = [
  "REMINDER_48H",
  "REMINDER_24H",
  "REMINDER_2H",
  "CONFIRMATION",
  "CANCELLATION",
  "REVIEW_REQUEST",
  "BIRTHDAY",
  "WAITLIST_OFFER",
] as const;
export type NotificationTemplateKey = (typeof NOTIFICATION_TEMPLATES)[number];

export const NOTIFICATION_TEMPLATE_LABELS: Record<
  NotificationTemplateKey,
  string
> = {
  REMINDER_48H: "Lembrete 48h antes",
  REMINDER_24H: "Lembrete 24h antes",
  REMINDER_2H: "Lembrete 2h antes",
  CONFIRMATION: "Confirmação de agendamento",
  CANCELLATION: "Aviso de cancelamento",
  REVIEW_REQUEST: "Pedido de avaliação",
  BIRTHDAY: "Mensagem de aniversário",
  WAITLIST_OFFER: "Oferta de vaga (lista de espera)",
};

export interface Notification {
  id: UUID;
  unitId: UUID;
  recipientId: UUID;
  appointmentId?: UUID;
  channel: NotificationChannel;
  template: NotificationTemplateKey;
  /** Corpo já renderizado com as variáveis substituídas. */
  body: string;
  status: NotificationStatus;
  scheduledFor: ISODateTimeString;
  sentAt: ISODateTimeString | null;
}

/** Template editável de mensagem, com variáveis no formato `{{cliente}}`. */
export interface MessageTemplate {
  id: UUID;
  unitId: UUID;
  key: NotificationTemplateKey;
  channel: NotificationChannel;
  body: string;
  enabled: boolean;
  /** Horas de antecedência para os lembretes; `null` para eventos pontuais. */
  offsetHours: number | null;
}

/** Variáveis aceitas pelos templates de mensagem. */
export const TEMPLATE_VARIABLES = [
  "cliente",
  "hora",
  "data",
  "servico",
  "profissional",
  "unidade",
  "valor",
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export const WAITLIST_WINDOWS = [
  "ANY",
  "MORNING",
  "AFTERNOON",
  "EVENING",
] as const;
export type WaitlistWindow = (typeof WAITLIST_WINDOWS)[number];

export const WAITLIST_WINDOW_LABELS: Record<WaitlistWindow, string> = {
  ANY: "Qualquer horário",
  MORNING: "Manhã (até 12h)",
  AFTERNOON: "Tarde (12h–18h)",
  EVENING: "Noite (após 18h)",
};

export const WAITLIST_STATUSES = ["WAITING", "OFFERED", "BOOKED", "DROPPED"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  WAITING: "Aguardando",
  OFFERED: "Vaga oferecida",
  BOOKED: "Agendado",
  DROPPED: "Desistiu",
};

export interface WaitlistEntry {
  id: UUID;
  unitId: UUID;
  clientId: UUID;
  serviceId: UUID;
  professionalId?: UUID;
  preferredWindow: WaitlistWindow;
  notes: string;
  status: WaitlistStatus;
  createdAt: ISODateTimeString;
}
