/**
 * Entidades dos módulos condicionais por segmento.
 *
 * TODO(LGPD): tudo neste arquivo relacionado a evolução clínica, fotos e
 * documentos é dado pessoal sensível. No backend real: cifragem em repouso,
 * consentimento registrado por titular, retenção com prazo definido e log de
 * acesso por usuário. Nesta demo os registros são fictícios e as imagens são
 * placeholders gerados por CSS — não há upload.
 */
import type { ISODateTimeString, UUID } from "./common";

/* -------------------------------------------------------------------------
 * AESTHETIC — pacotes, ficha de evolução, antes/depois
 * ---------------------------------------------------------------------- */

export interface EvolutionRecord {
  id: UUID;
  clientId: UUID;
  appointmentId: UUID;
  professionalId: UUID;
  sessionNumber: number;
  /** Observações do procedimento (texto livre, fictício na demo). */
  description: string;
  /** Reações e intercorrências relatadas. */
  reactions: string;
  createdAt: ISODateTimeString;
  /** Placeholders de galeria antes/depois — sem upload real. */
  photos: { id: UUID; label: "BEFORE" | "AFTER"; takenAt: ISODateTimeString }[];
}

export const CONTRAINDICATION_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type ContraindicationSeverity =
  (typeof CONTRAINDICATION_SEVERITIES)[number];

export interface Contraindication {
  id: UUID;
  clientId: UUID;
  label: string;
  severity: ContraindicationSeverity;
  notes: string;
}

/* -------------------------------------------------------------------------
 * DENTAL — plano de tratamento e orçamento
 * ---------------------------------------------------------------------- */

export const TREATMENT_STEP_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "SKIPPED",
] as const;
export type TreatmentStepStatus = (typeof TREATMENT_STEP_STATUSES)[number];

export const TREATMENT_STEP_STATUS_LABELS: Record<TreatmentStepStatus, string> =
  {
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    DONE: "Concluída",
    SKIPPED: "Dispensada",
  };

export interface TreatmentStep {
  id: UUID;
  order: number;
  title: string;
  /** Dente ou região (notação FDI simplificada, fictícia). */
  tooth: string;
  status: TreatmentStepStatus;
  price: number;
  appointmentId?: UUID;
}

export interface TreatmentPlan {
  id: UUID;
  clientId: UUID;
  professionalId: UUID;
  title: string;
  createdAt: ISODateTimeString;
  steps: TreatmentStep[];
}

export const QUOTE_STATUSES = ["APPROVED", "PENDING", "REJECTED"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  REJECTED: "Recusado",
};

export interface QuoteItem {
  id: UUID;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: UUID;
  clientId: UUID;
  treatmentPlanId?: UUID;
  number: string;
  status: QuoteStatus;
  items: QuoteItem[];
  discount: number;
  createdAt: ISODateTimeString;
  validUntil: ISODateTimeString;
  /** Anexos mockados: nome e tipo, sem arquivo real. */
  attachments: { id: UUID; name: string; mimeType: string; sizeKb: number }[];
}
