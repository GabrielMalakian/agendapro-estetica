import { addDays, addMinutes, differenceInCalendarDays } from "date-fns";

import type {
  Appointment,
  AppointmentStatus,
  Professional,
  Room,
  ScheduleBlock,
  Service,
  TimeOff,
  Weekday,
} from "@/types";

import {
  atTime,
  intersect,
  overlaps,
  parseDayKey,
  subtract,
  toDayKey,
} from "./intervals";
import type { AvailabilityInput, Interval, Slot, SlotBlockReason } from "./types";

/**
 * Status que efetivamente ocupam a agenda.
 * Cancelado e não-compareceu liberam o horário.
 */
export const BLOCKING_STATUSES: readonly AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
];

export function isBlocking(status: AppointmentStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

/**
 * Duração total ocupada na agenda por um serviço: procedimento + buffer.
 * Em combos, a duração já é a soma dos itens (calculada no cadastro).
 */
export function resolveServiceDuration(service: Service): number {
  return service.durationMinutes + service.bufferMinutes;
}

/** Ausências aprovadas do profissional que cruzam o dia informado. */
function timeOffIntervals(
  professional: Professional,
  day: Date,
  dayKey: string,
): Interval[] {
  return professional.timeOff
    .filter(
      (off: TimeOff) =>
        off.status === "APPROVED" &&
        dayKey >= off.startDate &&
        dayKey <= off.endDate,
    )
    .map((off) =>
      off.allDay
        ? { start: atTime(day, "00:00"), end: addDays(atTime(day, "00:00"), 1) }
        : {
            start: atTime(day, off.startTime ?? "00:00"),
            end: atTime(day, off.endTime ?? "23:59"),
          },
    );
}

function blockIntervals(
  blocks: ScheduleBlock[],
  professionalId: string,
  unitId: string,
  window: Interval,
): Interval[] {
  return blocks
    .filter(
      (block) =>
        block.unitId === unitId &&
        (block.professionalId === professionalId || block.professionalId === null),
    )
    .map((block) => ({
      start: new Date(block.startsAt),
      end: new Date(block.endsAt),
    }))
    .filter((interval) => overlaps(interval, window));
}

function appointmentIntervals(
  appointments: Appointment[],
  predicate: (appointment: Appointment) => boolean,
  excludeId?: string,
): Interval[] {
  return appointments
    .filter(
      (appointment) =>
        appointment.id !== excludeId &&
        isBlocking(appointment.status) &&
        predicate(appointment),
    )
    .map((appointment) => ({
      start: new Date(appointment.startsAt),
      end: new Date(appointment.endsAt),
    }));
}

/**
 * Calcula os horários possíveis para um serviço, com um profissional, em um
 * dia. Função pura: tudo o que ela precisa vem em `input`, inclusive o
 * "agora". Coberta por testes em `availability.test.ts`.
 *
 * Regras aplicadas, nesta ordem:
 *  1. horário de funcionamento da unidade (e intervalo dela);
 *  2. feriados da unidade;
 *  3. grade do profissional no dia da semana (e intervalo dele);
 *  4. folgas e férias aprovadas;
 *  5. bloqueios de agenda (do profissional ou da unidade inteira);
 *  6. agendamentos existentes do profissional;
 *  7. duração + buffer do serviço precisam caber na janela;
 *  8. disponibilidade de sala/equipamento, quando o serviço exige;
 *  9. antecedência mínima e janela máxima de agendamento.
 */
export function getAvailableSlots(input: AvailabilityInput): Slot[] {
  const {
    date,
    unit,
    service,
    professional,
    rooms,
    appointments,
    scheduleBlocks,
    holidays,
    rules,
    now,
    excludeAppointmentId,
    includeUnavailable = false,
    allowOverbooking = false,
  } = input;

  const day = parseDayKey(date);
  const dayKey = toDayKey(day);
  const weekday = day.getDay() as Weekday;
  const dayStart = atTime(day, "00:00");
  const dayEnd = addDays(dayStart, 1);
  const wholeDay: Interval = { start: dayStart, end: dayEnd };

  const emit = (
    start: Date,
    reason: SlotBlockReason,
    roomId?: string,
  ): Slot => ({
    startsAt: start.toISOString(),
    endsAt: addMinutes(start, resolveServiceDuration(service)).toISOString(),
    available: false,
    reason,
    roomId,
  });

  /* 2. feriado da unidade */
  const isHoliday = holidays.some(
    (holiday) => holiday.unitId === unit.id && holiday.date === dayKey,
  );
  if (isHoliday) {
    return includeUnavailable ? [emit(dayStart, "HOLIDAY")] : [];
  }

  /* 1. horário de funcionamento da unidade */
  const businessHours = unit.businessHours.find((item) => item.weekday === weekday);
  if (!businessHours || businessHours.closed) {
    return includeUnavailable ? [emit(dayStart, "OUTSIDE_BUSINESS_HOURS")] : [];
  }
  let unitWindows: Interval[] = [
    {
      start: atTime(day, businessHours.openTime),
      end: atTime(day, businessHours.closeTime),
    },
  ];
  if (businessHours.breakStart && businessHours.breakEnd) {
    unitWindows = subtract(unitWindows, [
      {
        start: atTime(day, businessHours.breakStart),
        end: atTime(day, businessHours.breakEnd),
      },
    ]);
  }

  /* 3. grade do profissional */
  const grid = professional.workingHours.find((item) => item.weekday === weekday);
  if (!grid || !grid.enabled) {
    return includeUnavailable ? [emit(dayStart, "OUTSIDE_WORKING_HOURS")] : [];
  }
  let proWindows: Interval[] = [
    { start: atTime(day, grid.startTime), end: atTime(day, grid.endTime) },
  ];
  if (grid.breakStart && grid.breakEnd) {
    proWindows = subtract(proWindows, [
      {
        start: atTime(day, grid.breakStart),
        end: atTime(day, grid.breakEnd),
      },
    ]);
  }

  /* 4. folgas e férias */
  const offs = timeOffIntervals(professional, day, dayKey);
  if (offs.length > 0) {
    proWindows = subtract(proWindows, offs);
  }
  if (proWindows.length === 0) {
    return includeUnavailable ? [emit(dayStart, "TIME_OFF")] : [];
  }

  const windows = intersect(unitWindows, proWindows);
  if (windows.length === 0) {
    return includeUnavailable ? [emit(dayStart, "OUTSIDE_WORKING_HOURS")] : [];
  }

  /* 5, 6. bloqueios e agendamentos do profissional */
  const blocks = blockIntervals(scheduleBlocks, professional.id, unit.id, wholeDay);
  const busy = appointmentIntervals(
    appointments,
    (appointment) => appointment.professionalId === professional.id,
    excludeAppointmentId,
  );

  /* 8. salas elegíveis para o serviço */
  const eligibleRooms: Room[] = service.requiresRoom
    ? rooms.filter(
        (room) => room.unitId === unit.id && service.roomIds.includes(room.id),
      )
    : [];
  const roomBusy = new Map<string, Interval[]>();
  for (const room of eligibleRooms) {
    roomBusy.set(room.id, [
      ...appointmentIntervals(
        appointments,
        (appointment) => appointment.roomId === room.id,
        excludeAppointmentId,
      ),
      ...scheduleBlocks
        .filter((block) => block.roomId === room.id)
        .map((block) => ({
          start: new Date(block.startsAt),
          end: new Date(block.endsAt),
        })),
    ]);
  }

  /* 9. limites de antecedência */
  const earliest = allowOverbooking
    ? now
    : addMinutes(now, rules.minAdvanceMinutes);
  const daysAhead = differenceInCalendarDays(day, now);
  const tooFar = !allowOverbooking && daysAhead > rules.maxAdvanceDays;

  const duration = resolveServiceDuration(service);
  const step = Math.max(5, rules.slotIntervalMinutes);
  const slots: Slot[] = [];

  for (const window of windows) {
    // alinha o primeiro candidato à grade de `step` minutos
    let cursor = new Date(window.start);
    for (
      ;
      addMinutes(cursor, duration) <= window.end;
      cursor = addMinutes(cursor, step)
    ) {
      const start = new Date(cursor);
      const end = addMinutes(start, duration);
      const candidate: Interval = { start, end };

      if (tooFar) {
        if (includeUnavailable) slots.push(emit(start, "TOO_FAR"));
        continue;
      }
      if (start < earliest) {
        if (includeUnavailable) slots.push(emit(start, "TOO_SOON"));
        continue;
      }
      if (blocks.some((interval) => overlaps(interval, candidate))) {
        if (includeUnavailable) slots.push(emit(start, "SCHEDULE_BLOCK"));
        continue;
      }
      if (busy.some((interval) => overlaps(interval, candidate))) {
        if (includeUnavailable) slots.push(emit(start, "PROFESSIONAL_BUSY"));
        continue;
      }

      let roomId: string | undefined;
      if (service.requiresRoom) {
        const free = eligibleRooms.find(
          (room) =>
            !(roomBusy.get(room.id) ?? []).some((interval) =>
              overlaps(interval, candidate),
            ),
        );
        if (!free) {
          if (includeUnavailable) slots.push(emit(start, "ROOM_BUSY"));
          continue;
        }
        roomId = free.id;
      }

      slots.push({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        available: true,
        roomId,
      });
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Apenas os horários utilizáveis — atalho para a área do cliente. */
export function getFreeSlots(input: AvailabilityInput): Slot[] {
  return getAvailableSlots({ ...input, includeUnavailable: false }).filter(
    (slot) => slot.available,
  );
}

export interface FirstAvailableResult {
  professionalId: string;
  slot: Slot;
}

/**
 * "Primeiro disponível": procura, entre os profissionais habilitados, o
 * horário mais cedo do dia. Empate é resolvido pela ordem da lista.
 */
export function findFirstAvailable(
  input: Omit<AvailabilityInput, "professional"> & {
    professionals: Professional[];
  },
): FirstAvailableResult | null {
  const { professionals, ...rest } = input;
  let best: FirstAvailableResult | null = null;

  for (const professional of professionals) {
    if (!professional.serviceIds.includes(rest.service.id)) continue;
    const [slot] = getFreeSlots({ ...rest, professional });
    if (!slot) continue;
    if (!best || slot.startsAt < best.slot.startsAt) {
      best = { professionalId: professional.id, slot };
    }
  }

  return best;
}

/** Dias do intervalo que têm ao menos um horário livre. */
export function getAvailableDays(
  input: Omit<AvailabilityInput, "date"> & { from: Date; days: number },
): string[] {
  const { from, days, ...rest } = input;
  const result: string[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = toDayKey(addDays(from, offset));
    if (getFreeSlots({ ...rest, date }).length > 0) result.push(date);
  }
  return result;
}
