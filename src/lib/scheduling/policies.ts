import { differenceInHours, differenceInDays, parseISO } from "date-fns";

import type {
  Appointment,
  CancellationPolicy,
  DepositPolicy,
  NoShowPolicy,
  Service,
} from "@/types";

/** Resultado da avaliação da política de cancelamento. */
export interface CancellationCheck {
  allowed: boolean;
  /** Dentro do prazo? Se não, pode haver cobrança. */
  withinDeadline: boolean;
  /** Valor que seria cobrado (0 quando dentro do prazo). */
  feeAmount: number;
  hoursUntilStart: number;
  message: string;
}

/** Aplica a política de cancelamento configurada a um atendimento. */
export function checkCancellation(
  appointment: Appointment,
  policy: CancellationPolicy,
  now: Date,
): CancellationCheck {
  const start = parseISO(appointment.startsAt);
  const hoursUntilStart = differenceInHours(start, now);

  if (appointment.status === "CANCELLED") {
    return {
      allowed: false,
      withinDeadline: true,
      feeAmount: 0,
      hoursUntilStart,
      message: "Este atendimento já está cancelado.",
    };
  }

  if (
    appointment.status === "COMPLETED" ||
    appointment.status === "NO_SHOW" ||
    start <= now
  ) {
    return {
      allowed: false,
      withinDeadline: false,
      feeAmount: 0,
      hoursUntilStart,
      message: "Não é possível cancelar um atendimento que já passou.",
    };
  }

  const withinDeadline = hoursUntilStart >= policy.minHoursBefore;
  const feeAmount = withinDeadline
    ? 0
    : Math.round(appointment.price * policy.lateFeeRate * 100) / 100;

  return {
    allowed: true,
    withinDeadline,
    feeAmount,
    hoursUntilStart,
    message: withinDeadline
      ? "Cancelamento dentro do prazo, sem cobrança."
      : `Faltam menos de ${policy.minHoursBefore}h para o atendimento. O cancelamento pode gerar cobrança de ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" },
        ).format(feeAmount)}.`,
  };
}

/** Quanto de sinal cobrar neste agendamento, segundo a política. */
export function computeDeposit(
  service: Service,
  policy: DepositPolicy,
  options: { clientAtRisk?: boolean } = {},
): number {
  if (!policy.enabled) return 0;
  const required =
    service.price >= policy.minServicePrice ||
    (policy.requireForNoShowRisk && options.clientAtRisk === true);
  if (!required) return 0;
  return Math.round(service.price * policy.rate * 100) / 100;
}

export interface NoShowCheck {
  atRisk: boolean;
  count: number;
  action: NoShowPolicy["action"];
  message: string | null;
}

/** Avalia a regra de no-show (ex.: 3 faltas em 180 dias → exigir sinal). */
export function checkNoShowRule(
  clientAppointments: Appointment[],
  policy: NoShowPolicy,
  now: Date,
): NoShowCheck {
  if (!policy.enabled) {
    return { atRisk: false, count: 0, action: policy.action, message: null };
  }

  const count = clientAppointments.filter(
    (appointment) =>
      appointment.status === "NO_SHOW" &&
      differenceInDays(now, parseISO(appointment.startsAt)) <= policy.windowDays,
  ).length;

  const atRisk = count >= policy.maxNoShows;
  if (!atRisk) {
    return { atRisk, count, action: policy.action, message: null };
  }

  const messages: Record<NoShowPolicy["action"], string> = {
    REQUIRE_DEPOSIT: `Cliente com ${count} faltas nos últimos ${policy.windowDays} dias — exigir pagamento antecipado.`,
    BLOCK_ONLINE_BOOKING: `Cliente com ${count} faltas — agendamento online bloqueado, marcar apenas pela recepção.`,
    WARN_ONLY: `Atenção: cliente com ${count} faltas nos últimos ${policy.windowDays} dias.`,
  };

  return { atRisk, count, action: policy.action, message: messages[policy.action] };
}
