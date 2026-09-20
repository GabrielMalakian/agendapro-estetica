import { describe, expect, it } from "vitest";

import type { CancellationPolicy, DepositPolicy, NoShowPolicy } from "@/types";

import { checkCancellation, checkNoShowRule, computeDeposit } from "./policies";
import { at, makeAppointment, makeService, NOW, TEST_DAY } from "./fixtures";

const cancellationPolicy: CancellationPolicy = {
  minHoursBefore: 12,
  lateFeeRate: 0.5,
  allowRescheduleInstead: true,
  description: "",
};

describe("checkCancellation", () => {
  it("permite cancelar sem cobrança dentro do prazo", () => {
    const result = checkCancellation(
      makeAppointment(TEST_DAY, "10:00", "11:15"),
      cancellationPolicy,
      NOW,
    );
    expect(result.allowed).toBe(true);
    expect(result.withinDeadline).toBe(true);
    expect(result.feeAmount).toBe(0);
  });

  it("cobra a taxa quando falta menos que o prazo mínimo", () => {
    const result = checkCancellation(
      makeAppointment("2026-04-06", "14:00", "15:15"),
      cancellationPolicy,
      NOW,
    );
    expect(result.allowed).toBe(true);
    expect(result.withinDeadline).toBe(false);
    expect(result.feeAmount).toBe(60); // 50% de R$ 120
    expect(result.message).toContain("R$");
  });

  it("não permite cancelar atendimento já concluído", () => {
    const result = checkCancellation(
      makeAppointment("2026-04-01", "10:00", "11:15", { status: "COMPLETED" }),
      cancellationPolicy,
      NOW,
    );
    expect(result.allowed).toBe(false);
  });

  it("não permite cancelar duas vezes", () => {
    const result = checkCancellation(
      makeAppointment(TEST_DAY, "10:00", "11:15", { status: "CANCELLED" }),
      cancellationPolicy,
      NOW,
    );
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("já está cancelado");
  });
});

describe("computeDeposit", () => {
  const policy: DepositPolicy = {
    enabled: true,
    rate: 0.3,
    minServicePrice: 250,
    requireForNoShowRisk: true,
  };

  it("não cobra sinal abaixo do valor mínimo", () => {
    expect(computeDeposit(makeService({ price: 120 }), policy)).toBe(0);
  });

  it("cobra o percentual configurado acima do valor mínimo", () => {
    expect(computeDeposit(makeService({ price: 400 }), policy)).toBe(120);
  });

  it("cobra sinal de cliente em risco mesmo abaixo do mínimo", () => {
    expect(
      computeDeposit(makeService({ price: 120 }), policy, { clientAtRisk: true }),
    ).toBe(36);
  });

  it("não cobra nada quando a política está desligada", () => {
    expect(
      computeDeposit(makeService({ price: 900 }), { ...policy, enabled: false }),
    ).toBe(0);
  });
});

describe("checkNoShowRule", () => {
  const policy: NoShowPolicy = {
    enabled: true,
    maxNoShows: 3,
    windowDays: 180,
    action: "REQUIRE_DEPOSIT",
  };

  const noShow = (day: string) =>
    makeAppointment(day, "10:00", "11:15", { status: "NO_SHOW" });

  it("não marca risco abaixo do limite", () => {
    const result = checkNoShowRule([noShow("2026-03-01"), noShow("2026-02-01")], policy, NOW);
    expect(result.atRisk).toBe(false);
    expect(result.count).toBe(2);
    expect(result.message).toBeNull();
  });

  it("marca risco ao atingir o limite dentro da janela", () => {
    const result = checkNoShowRule(
      [noShow("2026-03-01"), noShow("2026-02-01"), noShow("2026-01-10")],
      policy,
      NOW,
    );
    expect(result.atRisk).toBe(true);
    expect(result.message).toContain("pagamento antecipado");
  });

  it("ignora faltas fora da janela de apuração", () => {
    const result = checkNoShowRule(
      [noShow("2024-01-01"), noShow("2024-02-01"), noShow("2024-03-01")],
      policy,
      NOW,
    );
    expect(result.atRisk).toBe(false);
  });

  it("não avalia nada com a política desligada", () => {
    const result = checkNoShowRule(
      [noShow("2026-03-01"), noShow("2026-02-01"), noShow("2026-01-10")],
      { ...policy, enabled: false },
      NOW,
    );
    expect(result.atRisk).toBe(false);
  });
});

describe("fixtures", () => {
  it("at() produz ISO no fuso local", () => {
    expect(new Date(at(TEST_DAY, "10:00")).getHours()).toBe(10);
  });
});
