import type { UUID } from "./common";
import type { Role } from "./user";

/** Política de cancelamento aplicada na área do cliente e no admin. */
export interface CancellationPolicy {
  /** Antecedência mínima (horas) para cancelar sem penalidade. */
  minHoursBefore: number;
  /** Percentual cobrado quando o cancelamento é fora do prazo (0–1). */
  lateFeeRate: number;
  /** Permite reagendar fora do prazo em vez de cancelar. */
  allowRescheduleInstead: boolean;
  description: string;
}

/** Política de sinal/pagamento antecipado. */
export interface DepositPolicy {
  enabled: boolean;
  /** Percentual do valor do serviço cobrado como sinal (0–1). */
  rate: number;
  /** Só exige sinal em serviços acima deste valor. */
  minServicePrice: number;
  /** Exige sinal de qualquer cliente marcado como risco de no-show. */
  requireForNoShowRisk: boolean;
}

/** Regra de no-show: N faltas passam a exigir pagamento antecipado. */
export interface NoShowPolicy {
  enabled: boolean;
  maxNoShows: number;
  /** Janela de apuração em dias. */
  windowDays: number;
  action: "REQUIRE_DEPOSIT" | "BLOCK_ONLINE_BOOKING" | "WARN_ONLY";
}

/** Parâmetros que alimentam o motor de disponibilidade. */
export interface BookingRules {
  /** Antecedência mínima entre agora e o início do atendimento (minutos). */
  minAdvanceMinutes: number;
  /** Até quantos dias no futuro o cliente pode agendar. */
  maxAdvanceDays: number;
  /** Granularidade da grade de horários (minutos). */
  slotIntervalMinutes: number;
  /** Permite encaixe fora da grade (apenas admin/profissional). */
  allowOverbooking: boolean;
}

export interface AppearanceSettings {
  /** Cor primária em OKLCH ou HEX — aplicada como `--brand`. */
  primaryColor: string;
  logoUrl: string | null;
  /** Nome curto exibido no cabeçalho e no manifest do PWA. */
  displayName: string;
}

/** Recursos protegidos pela matriz de permissões. */
export const PERMISSION_RESOURCES = [
  "dashboard",
  "agenda",
  "appointments",
  "clients",
  "services",
  "professionals",
  "finance",
  "reports",
  "communication",
  "settings",
] as const;
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const PERMISSION_RESOURCE_LABELS: Record<PermissionResource, string> = {
  dashboard: "Dashboard",
  agenda: "Agenda",
  appointments: "Agendamentos",
  clients: "Clientes",
  services: "Serviços",
  professionals: "Profissionais",
  finance: "Financeiro",
  reports: "Relatórios",
  communication: "Comunicação",
  settings: "Configurações",
};

export const PERMISSION_ACTIONS = ["read", "write"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionMatrix = Record<
  Role,
  Record<PermissionResource, PermissionAction[]>
>;

export interface Settings {
  companyId: UUID;
  cancellationPolicy: CancellationPolicy;
  depositPolicy: DepositPolicy;
  noShowPolicy: NoShowPolicy;
  bookingRules: BookingRules;
  appearance: AppearanceSettings;
  permissions: PermissionMatrix;
  /** Módulos de segmento habilitados além do segmento principal da empresa. */
  enabledSegmentModules: string[];
}
