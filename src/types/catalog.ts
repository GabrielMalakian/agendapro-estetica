import type { UUID } from "./common";

export const SERVICE_CATEGORIES = [
  "HAIR",
  "BARBER",
  "NAILS",
  "SKIN",
  "BODY",
  "DENTAL",
  "OTHER",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  HAIR: "Cabelo",
  BARBER: "Barbearia",
  NAILS: "Unhas",
  SKIN: "Estética facial",
  BODY: "Estética corporal",
  DENTAL: "Odontologia",
  OTHER: "Outros",
};

export interface Service {
  id: UUID;
  unitId: UUID;
  name: string;
  description: string;
  category: ServiceCategory;
  /** Duração do procedimento em si. */
  durationMinutes: number;
  /** Tempo extra reservado após o atendimento (limpeza, troca, higienização). */
  bufferMinutes: number;
  price: number;
  professionalIds: UUID[];
  requiresRoom: boolean;
  roomIds: UUID[];
  active: boolean;
  /**
   * Combo: quando preenchido, o serviço é composto e sua duração é a soma das
   * durações dos itens (ver `resolveServiceDuration`).
   */
  comboServiceIds?: UUID[];
}

export interface Package {
  id: UUID;
  unitId: UUID;
  name: string;
  serviceId: UUID;
  totalSessions: number;
  price: number;
  /** Validade em dias a partir da compra. */
  validityDays: number;
  active: boolean;
}

export interface ClientPackage {
  id: UUID;
  clientId: UUID;
  packageId: UUID;
  sessionsUsed: number;
  purchasedAt: string;
  expiresAt: string;
}
