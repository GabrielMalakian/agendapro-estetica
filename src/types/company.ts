import type { ISODateString, TimeString, UUID, Weekday } from "./common";

/** Segmento de mercado da empresa — habilita os módulos condicionais da UI. */
export const SEGMENTS = [
  "AESTHETIC",
  "DENTAL",
  "SALON",
  "BARBERSHOP",
] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  AESTHETIC: "Clínica de estética",
  DENTAL: "Odontologia",
  SALON: "Salão de beleza",
  BARBERSHOP: "Barbearia",
};

export interface Company {
  id: UUID;
  name: string;
  slug: string;
  segment: Segment;
  logoUrl: string | null;
}

/** Janela de funcionamento de um dia da semana. */
export interface BusinessHours {
  weekday: Weekday;
  openTime: TimeString;
  closeTime: TimeString;
  breakStart?: TimeString;
  breakEnd?: TimeString;
  closed: boolean;
}

export interface Unit {
  id: UUID;
  companyId: UUID;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  businessHours: BusinessHours[];
}

/** Data em que a unidade não abre (feriado ou fechamento pontual). */
export interface Holiday {
  id: UUID;
  unitId: UUID;
  date: ISODateString;
  name: string;
}

export const ROOM_TYPES = ["ROOM", "CHAIR", "EQUIPMENT"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  ROOM: "Sala",
  CHAIR: "Cadeira",
  EQUIPMENT: "Equipamento",
};

export interface Room {
  id: UUID;
  unitId: UUID;
  name: string;
  type: RoomType;
}
