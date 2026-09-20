import { describe, expect, it } from "vitest";

import {
  findFirstAvailable,
  getAvailableDays,
  getAvailableSlots,
  getFreeSlots,
  resolveServiceDuration,
} from "./availability";
import {
  at,
  emptyExtras,
  hhmm,
  makeAppointment,
  makeProfessional,
  makeRooms,
  makeRules,
  makeService,
  makeUnit,
  NOW,
  PRO_ID,
  ROOM_ID,
  ROOM_ID_2,
  SUNDAY,
  TEST_DAY,
} from "./fixtures";
import type { AvailabilityInput } from "./types";

function baseInput(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    date: TEST_DAY,
    unit: makeUnit(),
    service: makeService(),
    professional: makeProfessional(),
    rooms: makeRooms(),
    appointments: [],
    ...emptyExtras(),
    rules: makeRules(),
    now: NOW,
    ...overrides,
  };
}

describe("resolveServiceDuration", () => {
  it("soma duração e buffer", () => {
    expect(resolveServiceDuration(makeService())).toBe(75);
  });

  it("usa a duração já somada do combo", () => {
    const combo = makeService({
      durationMinutes: 150,
      bufferMinutes: 10,
      comboServiceIds: ["a", "b"],
    });
    expect(resolveServiceDuration(combo)).toBe(160);
  });
});

describe("getAvailableSlots — janelas de horário", () => {
  it("gera slots dentro do expediente respeitando duração + buffer", () => {
    const slots = getFreeSlots(baseInput());

    expect(slots.length).toBeGreaterThan(0);
    expect(hhmm(slots[0].startsAt)).toBe("09:00");
    // O último slot precisa terminar até as 18:00 (75 min ⇒ começa 16:45).
    expect(hhmm(slots[slots.length - 1].startsAt)).toBe("16:45");
    expect(hhmm(slots[slots.length - 1].endsAt)).toBe("18:00");
  });

  it("respeita a granularidade configurada", () => {
    const slots = getFreeSlots(baseInput({ rules: makeRules({ slotIntervalMinutes: 30 }) }));
    expect(slots.map((slot) => hhmm(slot.startsAt)).slice(0, 3)).toEqual([
      "09:00",
      "09:30",
      "10:00",
    ]);
  });

  it("não oferece horário que atravesse o intervalo de almoço", () => {
    const times = getFreeSlots(baseInput()).map((slot) => hhmm(slot.startsAt));
    // 11:15 + 75min terminaria 12:30, dentro do almoço.
    expect(times).not.toContain("11:15");
    expect(times).not.toContain("11:30");
    // A janela da tarde recomeça às 13:00.
    expect(times).toContain("13:00");
  });

  it("devolve vazio quando a unidade está fechada no dia", () => {
    expect(getFreeSlots(baseInput({ date: SUNDAY }))).toEqual([]);
  });

  it("devolve o motivo quando includeUnavailable está ligado", () => {
    const slots = getAvailableSlots(
      baseInput({ date: SUNDAY, includeUnavailable: true }),
    );
    expect(slots).toHaveLength(1);
    expect(slots[0].reason).toBe("OUTSIDE_BUSINESS_HOURS");
  });

  it("devolve vazio em feriado da unidade", () => {
    const slots = getFreeSlots(
      baseInput({
        holidays: [
          { id: "h1", unitId: makeUnit().id, date: TEST_DAY, name: "Feriado" },
        ],
      }),
    );
    expect(slots).toEqual([]);
  });

  it("recorta pela grade do profissional, que é mais curta que a da unidade", () => {
    const professional = makeProfessional({
      workingHours: makeProfessional().workingHours.map((item) =>
        item.weekday === 3
          ? { ...item, startTime: "14:00", endTime: "17:00", breakStart: undefined, breakEnd: undefined }
          : item,
      ),
    });
    const slots = getFreeSlots(baseInput({ professional }));
    expect(hhmm(slots[0].startsAt)).toBe("14:00");
    expect(hhmm(slots[slots.length - 1].endsAt)).toBe("17:00");
  });

  it("devolve vazio quando o profissional não trabalha no dia da semana", () => {
    const professional = makeProfessional({
      workingHours: makeProfessional().workingHours.map((item) =>
        item.weekday === 3 ? { ...item, enabled: false } : item,
      ),
    });
    expect(getFreeSlots(baseInput({ professional }))).toEqual([]);
  });
});

describe("getAvailableSlots — folgas e bloqueios", () => {
  it("ignora o dia inteiro em férias aprovadas", () => {
    const professional = makeProfessional({
      timeOff: [
        {
          id: "off-1",
          professionalId: PRO_ID,
          type: "VACATION",
          status: "APPROVED",
          startDate: "2026-04-07",
          endDate: "2026-04-10",
          allDay: true,
          reason: "Férias",
        },
      ],
    });
    expect(getFreeSlots(baseInput({ professional }))).toEqual([]);
  });

  it("não considera folga ainda pendente de aprovação", () => {
    const professional = makeProfessional({
      timeOff: [
        {
          id: "off-2",
          professionalId: PRO_ID,
          type: "DAY_OFF",
          status: "PENDING",
          startDate: TEST_DAY,
          endDate: TEST_DAY,
          allDay: true,
          reason: "Solicitada",
        },
      ],
    });
    expect(getFreeSlots(baseInput({ professional })).length).toBeGreaterThan(0);
  });

  it("recorta apenas a faixa de uma folga parcial", () => {
    const professional = makeProfessional({
      timeOff: [
        {
          id: "off-3",
          professionalId: PRO_ID,
          type: "BLOCK",
          status: "APPROVED",
          startDate: TEST_DAY,
          endDate: TEST_DAY,
          startTime: "15:00",
          endTime: "18:00",
          allDay: false,
          reason: "Curso",
        },
      ],
    });
    const times = getFreeSlots(baseInput({ professional })).map((slot) =>
      hhmm(slot.startsAt),
    );
    expect(times).toContain("13:00");
    expect(times).not.toContain("15:00");
    expect(times).not.toContain("16:45");
  });

  it("respeita bloqueio de agenda da unidade inteira", () => {
    // Serviço curto para a janela da manhã (09:00–12:00) ainda comportar
    // horários depois do bloqueio das 09:00 às 11:00.
    const service = makeService({ durationMinutes: 30, bufferMinutes: 0 });
    const times = getFreeSlots(
      baseInput({
        service,
        scheduleBlocks: [
          {
            id: "block-1",
            unitId: makeUnit().id,
            professionalId: null,
            startsAt: at(TEST_DAY, "09:00"),
            endsAt: at(TEST_DAY, "11:00"),
            reason: "Reunião geral",
          },
        ],
      }),
    ).map((slot) => hhmm(slot.startsAt));

    expect(times).not.toContain("09:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("11:00");
  });
});

describe("getAvailableSlots — conflitos", () => {
  it("remove os horários ocupados por outro atendimento", () => {
    const service = makeService({ durationMinutes: 30, bufferMinutes: 0 });
    const times = getFreeSlots(
      baseInput({
        service,
        appointments: [makeAppointment(TEST_DAY, "10:00", "11:15")],
      }),
    ).map((slot) => hhmm(slot.startsAt));

    expect(times).not.toContain("10:00");
    expect(times).not.toContain("09:45"); // 09:45 + 30min invadiria as 10:00
    expect(times).toContain("09:00");
    expect(times).toContain("09:30");
    expect(times).toContain("11:15");
  });

  it("um serviço longo some da manhã quando há atendimento no meio dela", () => {
    // Serviço de 75min na janela 09:00–12:00: qualquer início antes das 10:00
    // invade o atendimento existente, então a manhã fica sem vaga.
    const times = getFreeSlots(
      baseInput({
        appointments: [makeAppointment(TEST_DAY, "10:00", "11:15")],
      }),
    ).map((slot) => hhmm(slot.startsAt));

    expect(times.filter((time) => time < "12:00")).toEqual([]);
    expect(times).toContain("13:00");
  });

  it("libera o horário de um atendimento cancelado", () => {
    const times = getFreeSlots(
      baseInput({
        appointments: [
          makeAppointment(TEST_DAY, "10:00", "11:15", { status: "CANCELLED" }),
        ],
      }),
    ).map((slot) => hhmm(slot.startsAt));
    expect(times).toContain("10:00");
  });

  it("ignora o próprio agendamento ao reagendar", () => {
    const existing = makeAppointment(TEST_DAY, "10:00", "11:15", { id: "keep-me" });
    const times = getFreeSlots(
      baseInput({ appointments: [existing], excludeAppointmentId: "keep-me" }),
    ).map((slot) => hhmm(slot.startsAt));
    expect(times).toContain("10:00");
  });

  it("atribui uma sala livre quando o serviço exige sala", () => {
    const service = makeService({
      requiresRoom: true,
      roomIds: [ROOM_ID, ROOM_ID_2],
    });
    const slots = getFreeSlots(
      baseInput({
        service,
        appointments: [
          makeAppointment(TEST_DAY, "09:00", "10:15", {
            roomId: ROOM_ID,
            professionalId: "outro-pro",
          }),
        ],
      }),
    );
    const first = slots.find((slot) => hhmm(slot.startsAt) === "09:00");
    expect(first?.roomId).toBe(ROOM_ID_2);
  });

  it("bloqueia o horário quando todas as salas elegíveis estão ocupadas", () => {
    const service = makeService({ requiresRoom: true, roomIds: [ROOM_ID] });
    const slots = getAvailableSlots(
      baseInput({
        service,
        includeUnavailable: true,
        appointments: [
          makeAppointment(TEST_DAY, "09:00", "10:15", {
            roomId: ROOM_ID,
            professionalId: "outro-pro",
          }),
        ],
      }),
    );
    const first = slots.find((slot) => hhmm(slot.startsAt) === "09:00");
    expect(first?.available).toBe(false);
    expect(first?.reason).toBe("ROOM_BUSY");
  });
});

describe("getAvailableSlots — antecedência", () => {
  it("descarta horários dentro da antecedência mínima", () => {
    const times = getFreeSlots(
      baseInput({
        date: "2026-04-06",
        now: new Date(2026, 3, 6, 9, 30),
        rules: makeRules({ minAdvanceMinutes: 120 }),
      }),
    ).map((slot) => hhmm(slot.startsAt));

    expect(times).not.toContain("10:00");
    expect(times).not.toContain("11:15");
    expect(times).toContain("13:00");
  });

  it("libera o encaixe imediato quando allowOverbooking está ligado", () => {
    const times = getFreeSlots(
      baseInput({
        date: "2026-04-06",
        now: new Date(2026, 3, 6, 9, 30),
        allowOverbooking: true,
      }),
    ).map((slot) => hhmm(slot.startsAt));
    expect(times).toContain("09:45");
  });

  it("descarta dias além da janela máxima de agendamento", () => {
    const slots = getFreeSlots(
      baseInput({ date: TEST_DAY, rules: makeRules({ maxAdvanceDays: 1 }) }),
    );
    expect(slots).toEqual([]);
  });
});

describe("findFirstAvailable", () => {
  it("escolhe o profissional com o horário mais cedo", () => {
    const early = makeProfessional({ id: "pro-cedo" });
    const late = makeProfessional({
      id: "pro-tarde",
      workingHours: makeProfessional().workingHours.map((item) =>
        item.weekday === 3 ? { ...item, startTime: "15:00" } : item,
      ),
    });
    const service = makeService({ professionalIds: ["pro-cedo", "pro-tarde"] });

    const result = findFirstAvailable({
      ...baseInput({ service }),
      professionals: [late, early],
    });

    expect(result?.professionalId).toBe("pro-cedo");
    expect(hhmm(result!.slot.startsAt)).toBe("09:00");
  });

  it("ignora profissional não habilitado no serviço", () => {
    const unqualified = makeProfessional({ id: "pro-x", serviceIds: [] });
    const result = findFirstAvailable({
      ...baseInput(),
      professionals: [unqualified],
    });
    expect(result).toBeNull();
  });
});

describe("getAvailableDays", () => {
  it("lista apenas os dias com vaga na janela pedida", () => {
    const days = getAvailableDays({
      ...baseInput(),
      from: new Date(2026, 3, 6),
      days: 7,
    });

    // Segunda a sexta têm vaga; sábado e domingo não.
    expect(days).toContain("2026-04-07");
    expect(days).toContain("2026-04-10");
    expect(days).not.toContain("2026-04-11");
    expect(days).not.toContain("2026-04-12");
  });
});
