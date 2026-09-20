import type { Appointment, AppointmentStatus } from "@/types";

/**
 * Modelo de exibição da agenda.
 *
 * A grade não conhece as entidades cruas: recebe itens já resolvidos (nome do
 * cliente, do serviço, etc.), o que mantém a renderização barata e permite
 * reaproveitar a mesma grade nas visões por profissional e por sala.
 */
export interface AgendaItem {
  id: string;
  /** Coluna a que o item pertence (profissional ou sala). */
  columnId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  title: string;
  subtitle: string;
  /** Texto auxiliar — normalmente o valor. */
  meta?: string;
  /** Bloqueios não são arrastáveis nem clicáveis para detalhe. */
  kind: "APPOINTMENT" | "BLOCK";
  source: Appointment | null;
}

export interface AgendaColumn {
  id: string;
  name: string;
  subtitle?: string;
  /** Desabilita o arrastar-e-soltar nesta coluna (ex.: profissional de folga). */
  disabled?: boolean;
  disabledReason?: string;
}

export type AgendaGrouping = "PROFESSIONAL" | "ROOM";
export type AgendaView = "DAY" | "WEEK" | "MONTH";
