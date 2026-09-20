import { describe, expect, it } from "vitest";

import {
  at,
  CLIENT_ID,
  emptyExtras,
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
  SERVICE_ID,
  SUNDAY,
  TEST_DAY,
  UNIT_ID,
} from "./fixtures";
import { validateAppointment, type ValidateAppointmentInput } from "./validation";

function baseInput(
  overrides: Partial<ValidateAppointmentInput> = {},
): ValidateAppointmentInput {
  return {
    draft: {
      unitId: UNIT_ID,
      clientId: CLIENT_ID,
      professionalId: PRO_ID,
      serviceId: SERVICE_ID,
      startsAt: at(TEST_DAY, "10:00"),
    },
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

function codes(result: ReturnType<typeof validateAppointment>): string[] {
  return result.errors.map((error) => error.code);
}

describe("validateAppointment — caminho feliz", () => {
  it("aprova um agendamento válido", () => {
    const result = validateAppointment(baseInput());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("calcula o fim somando duração e buffer quando endsAt não vem", () => {
    // 10:00 + 75min = 11:15; um atendimento às 11:15 não deve conflitar.
    const result = validateAppointment(
      baseInput({
        appointments: [makeAppointment(TEST_DAY, "11:15", "12:00")],
      }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateAppointment — sobreposições", () => {
  it("rejeita sobreposição de profissional e aponta o agendamento em conflito", () => {
    const existing = makeAppointment(TEST_DAY, "10:30", "11:30", { id: "conflito" });
    const result = validateAppointment(baseInput({ appointments: [existing] }));

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("PROFESSIONAL_CONFLICT");
    const error = result.errors.find((item) => item.code === "PROFESSIONAL_CONFLICT");
    expect(error?.conflictingAppointmentId).toBe("conflito");
    expect(error?.field).toBe("professionalId");
    expect(error?.message).toContain("10:30");
  });

  it("rejeita sobreposição de sala mesmo com profissionais diferentes", () => {
    const service = makeService({ requiresRoom: true, roomIds: [ROOM_ID, ROOM_ID_2] });
    const existing = makeAppointment(TEST_DAY, "10:00", "11:15", {
      id: "sala-ocupada",
      professionalId: "outro-pro",
      roomId: ROOM_ID,
    });

    const result = validateAppointment(
      baseInput({
        service,
        draft: { ...baseInput().draft, roomId: ROOM_ID },
        appointments: [existing],
      }),
    );

    expect(codes(result)).toContain("ROOM_CONFLICT");
    expect(codes(result)).not.toContain("PROFESSIONAL_CONFLICT");
  });

  it("rejeita sobreposição do mesmo cliente em dois profissionais", () => {
    const existing = makeAppointment(TEST_DAY, "10:00", "11:15", {
      id: "cliente-ocupado",
      professionalId: "outro-pro",
    });

    const result = validateAppointment(baseInput({ appointments: [existing] }));
    expect(codes(result)).toContain("CLIENT_CONFLICT");
  });

  it("não considera conflito um atendimento cancelado ou com falta", () => {
    for (const status of ["CANCELLED", "NO_SHOW"] as const) {
      const result = validateAppointment(
        baseInput({
          appointments: [makeAppointment(TEST_DAY, "10:00", "11:15", { status })],
        }),
      );
      expect(result.valid).toBe(true);
    }
  });

  it("não conflita consigo mesmo ao reagendar", () => {
    const existing = makeAppointment(TEST_DAY, "10:00", "11:15", { id: "mesmo" });
    const result = validateAppointment(
      baseInput({
        draft: { ...baseInput().draft, id: "mesmo" },
        appointments: [existing],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("aceita atendimentos que apenas encostam (fim = início)", () => {
    const result = validateAppointment(
      baseInput({
        appointments: [makeAppointment(TEST_DAY, "08:45", "10:00")],
      }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateAppointment — regras de cadastro", () => {
  it("rejeita profissional não habilitado no serviço", () => {
    const professional = makeProfessional({ serviceIds: [] });
    expect(codes(validateAppointment(baseInput({ professional })))).toContain(
      "PROFESSIONAL_NOT_QUALIFIED",
    );
  });

  it("rejeita serviço inativo", () => {
    const service = makeService({ active: false });
    expect(codes(validateAppointment(baseInput({ service })))).toContain(
      "SERVICE_INACTIVE",
    );
  });

  it("exige sala quando o serviço requer", () => {
    const service = makeService({ requiresRoom: true, roomIds: [ROOM_ID] });
    expect(codes(validateAppointment(baseInput({ service })))).toContain(
      "ROOM_REQUIRED",
    );
  });

  it("rejeita sala não liberada para o serviço", () => {
    const service = makeService({ requiresRoom: true, roomIds: [ROOM_ID] });
    const result = validateAppointment(
      baseInput({ service, draft: { ...baseInput().draft, roomId: ROOM_ID_2 } }),
    );
    expect(codes(result)).toContain("ROOM_NOT_ALLOWED");
  });

  it("rejeita intervalo invertido", () => {
    const result = validateAppointment(
      baseInput({
        draft: {
          ...baseInput().draft,
          startsAt: at(TEST_DAY, "11:00"),
          endsAt: at(TEST_DAY, "10:00"),
        },
      }),
    );
    expect(codes(result)).toEqual(["INVALID_RANGE"]);
  });
});

describe("validateAppointment — janelas e encaixe", () => {
  it("rejeita horário fora do funcionamento da unidade", () => {
    const result = validateAppointment(
      baseInput({ draft: { ...baseInput().draft, startsAt: at(TEST_DAY, "19:00") } }),
    );
    expect(codes(result)).toContain("OUTSIDE_BUSINESS_HOURS");
  });

  it("rejeita dia em que a unidade não abre", () => {
    const result = validateAppointment(
      baseInput({ draft: { ...baseInput().draft, startsAt: at(SUNDAY, "10:00") } }),
    );
    expect(codes(result)).toContain("OUTSIDE_BUSINESS_HOURS");
  });

  it("rejeita feriado", () => {
    const result = validateAppointment(
      baseInput({
        holidays: [{ id: "h", unitId: UNIT_ID, date: TEST_DAY, name: "Feriado" }],
      }),
    );
    expect(codes(result)).toContain("HOLIDAY");
  });

  it("rejeita horário em folga aprovada", () => {
    const professional = makeProfessional({
      timeOff: [
        {
          id: "off",
          professionalId: PRO_ID,
          type: "DAY_OFF",
          status: "APPROVED",
          startDate: TEST_DAY,
          endDate: TEST_DAY,
          allDay: true,
          reason: "Folga",
        },
      ],
    });
    expect(codes(validateAppointment(baseInput({ professional })))).toContain(
      "TIME_OFF",
    );
  });

  it("rejeita horário dentro de um bloqueio de agenda", () => {
    const result = validateAppointment(
      baseInput({
        scheduleBlocks: [
          {
            id: "b",
            unitId: UNIT_ID,
            professionalId: PRO_ID,
            startsAt: at(TEST_DAY, "09:30"),
            endsAt: at(TEST_DAY, "11:00"),
            reason: "Reunião",
          },
        ],
      }),
    );
    expect(codes(result)).toContain("SCHEDULE_BLOCK");
  });

  it("rejeita antecedência insuficiente", () => {
    const result = validateAppointment(
      baseInput({
        draft: { ...baseInput().draft, startsAt: at("2026-04-06", "09:00") },
        now: new Date(2026, 3, 6, 8, 30),
      }),
    );
    expect(codes(result)).toContain("TOO_SOON");
  });

  it("rejeita data além da janela máxima", () => {
    const result = validateAppointment(
      baseInput({ rules: makeRules({ maxAdvanceDays: 1 }) }),
    );
    expect(codes(result)).toContain("TOO_FAR");
  });

  it("encaixe ignora os erros de janela", () => {
    const result = validateAppointment(
      baseInput({
        allowOverbooking: true,
        draft: { ...baseInput().draft, startsAt: at(TEST_DAY, "19:00") },
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("encaixe NÃO ignora sobreposição de profissional", () => {
    const result = validateAppointment(
      baseInput({
        allowOverbooking: true,
        appointments: [makeAppointment(TEST_DAY, "10:00", "11:15")],
      }),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("PROFESSIONAL_CONFLICT");
  });

  it("acumula múltiplos erros em uma mesma validação", () => {
    const professional = makeProfessional({ serviceIds: [] });
    const result = validateAppointment(
      baseInput({
        professional,
        draft: { ...baseInput().draft, startsAt: at(SUNDAY, "22:00") },
      }),
    );
    expect(result.errors.length).toBeGreaterThan(1);
    expect(codes(result)).toContain("PROFESSIONAL_NOT_QUALIFIED");
    expect(codes(result)).toContain("OUTSIDE_BUSINESS_HOURS");
  });
});
