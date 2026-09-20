import type { ISODateString, ISODateTimeString, UUID } from "./common";

export const CLIENT_TAGS = [
  "VIP",
  "NOVO",
  "RECORRENTE",
  "INATIVO",
  "ATRASA",
  "INDICACAO",
] as const;
export type ClientTag = (typeof CLIENT_TAGS)[number];

export interface Client {
  id: UUID;
  unitId: UUID;
  name: string;
  cpf: string;
  phone: string;
  whatsapp: string;
  email: string;
  birthDate: ISODateString | null;
  address: string;
  notes: string;
  createdAt: ISODateTimeString;
  tags: ClientTag[];
  /**
   * TODO(LGPD): campos de saúde (alergias, contraindicações, medicações) são
   * dados pessoais sensíveis (Lei 13.709/2018, art. 5º, II). No backend real
   * devem ser cifrados em repouso, ter base legal registrada, consentimento
   * explícito do titular e trilha de auditoria de acesso. Nesta demo são
   * apenas texto fictício em memória.
   */
  healthNotes: string;
  /** Preferências de contato — usadas pela régua de lembretes. */
  notificationPreferences: {
    whatsapp: boolean;
    email: boolean;
    push: boolean;
  };
  /** Vínculo opcional com um usuário logável (área do cliente). */
  userId?: UUID;
}

/** Métricas derivadas exibidas na ficha do cliente. */
export interface ClientMetrics {
  totalAppointments: number;
  completed: number;
  noShows: number;
  cancellations: number;
  totalSpent: number;
  averageTicket: number;
  favoriteProfessionalId: UUID | null;
  lastVisitAt: ISODateTimeString | null;
  nextVisitAt: ISODateTimeString | null;
}
