/**
 * Fixtures dos testes do motor de agendamento.
 *
 * Deliberadamente mínimas e explícitas: cada teste parte de uma unidade que
 * abre 09:00–18:00 de segunda a sexta com almoço 12:00–13:00, um profissional
 * com a mesma grade e um serviço de 60 minutos + 15 de buffer.
 */
import type {
  Appointment,
  BookingRules,
  BusinessHours,
  Holiday,
  Professional,
  Room,
  ScheduleBlock,
  Service,
  Unit,
  Weekday,
  WorkingHours,
} from "@/types";

export const UNIT_ID = "unit-1";
export const PRO_ID = "pro-1";
export const SERVICE_ID = "service-1";
export const ROOM_ID = "room-1";
export const ROOM_ID_2 = "room-2";
export const CLIENT_ID = "client-1";

/** Segunda-feira, 6 de abril de 2026, às 08:00 locais. */
export const NOW = new Date(2026, 3, 6, 8, 0, 0, 0);
/** Quarta-feira seguinte — dia usado na maioria dos testes. */
export const TEST_DAY = "2026-04-08";
/** Domingo seguinte — a unidade não abre. */
export const SUNDAY = "2026-04-12";

function hours(weekday: Weekday, closed = false): BusinessHours {
  return {
    weekday,
    openTime: "09:00",
    closeTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    closed,
  };
}

function grid(weekday: Weekday, enabled = true): WorkingHours {
  return {
    weekday,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    enabled,
  };
}

export function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: UNIT_ID,
    companyId: "company-1",
    name: "Unidade de teste",
    address: "Rua de teste, 1",
    phone: "4130000000",
    whatsapp: "41900000000",
    businessHours: [
      hours(0, true),
      hours(1),
      hours(2),
      hours(3),
      hours(4),
      hours(5),
      hours(6, true),
    ],
    ...overrides,
  };
}

export function makeProfessional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: PRO_ID,
    unitId: UNIT_ID,
    userId: "user-1",
    name: "Ana Souza",
    avatarUrl: null,
    specialty: "Cabeleireira",
    serviceIds: [SERVICE_ID],
    workingHours: [
      grid(0, false),
      grid(1),
      grid(2),
      grid(3),
      grid(4),
      grid(5),
      grid(6, false),
    ],
    timeOff: [],
    commissionRate: 0.4,
    active: true,
    ...overrides,
  };
}

export function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: SERVICE_ID,
    unitId: UNIT_ID,
    name: "Corte feminino",
    description: "",
    category: "HAIR",
    durationMinutes: 60,
    bufferMinutes: 15,
    price: 120,
    professionalIds: [PRO_ID],
    requiresRoom: false,
    roomIds: [],
    active: true,
    ...overrides,
  };
}

export function makeRooms(): Room[] {
  return [
    { id: ROOM_ID, unitId: UNIT_ID, name: "Cadeira 1", type: "CHAIR" },
    { id: ROOM_ID_2, unitId: UNIT_ID, name: "Cadeira 2", type: "CHAIR" },
  ];
}

export function makeRules(overrides: Partial<BookingRules> = {}): BookingRules {
  return {
    minAdvanceMinutes: 120,
    maxAdvanceDays: 60,
    slotIntervalMinutes: 15,
    allowOverbooking: true,
    ...overrides,
  };
}

/** Cria um agendamento `HH:mm` → `HH:mm` no dia informado. */
export function makeAppointment(
  day: string,
  startTime: string,
  endTime: string,
  overrides: Partial<Appointment> = {},
): Appointment {
  const iso = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year, month - 1, date, h, m, 0, 0).toISOString();
  };
  return {
    id: `appointment-${startTime}`,
    unitId: UNIT_ID,
    clientId: CLIENT_ID,
    professionalId: PRO_ID,
    serviceId: SERVICE_ID,
    startsAt: iso(startTime),
    endsAt: iso(endTime),
    status: "CONFIRMED",
    price: 120,
    paymentStatus: "PENDING",
    notes: "",
    createdBy: "user-1",
    source: "INTERNAL",
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

/** Data local `yyyy-MM-dd` + `HH:mm` em ISO. */
export function at(day: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, h, m, 0, 0).toISOString();
}

export function emptyExtras(): {
  scheduleBlocks: ScheduleBlock[];
  holidays: Holiday[];
} {
  return { scheduleBlocks: [], holidays: [] };
}

/** `HH:mm` local de um slot — facilita as asserções. */
export function hhmm(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}
