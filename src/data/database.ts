import type {
  Appointment,
  Client,
  ClientPackage,
  Company,
  Contraindication,
  EvolutionRecord,
  Holiday,
  MessageTemplate,
  Notification,
  Package,
  Payment,
  Professional,
  Quote,
  Review,
  Room,
  ScheduleBlock,
  Service,
  Settings,
  TreatmentPlan,
  Unit,
  User,
  WaitlistEntry,
} from "@/types";

/**
 * Formato da "base de dados" em memória.
 *
 * Cada coleção corresponde a uma tabela do PostgreSQL no backend futuro. Os
 * repositórios em `src/data/repositories` são a única porta de entrada: nenhum
 * componente de UI toca nestas coleções diretamente.
 */
export interface Database {
  companies: Company[];
  units: Unit[];
  holidays: Holiday[];
  rooms: Room[];
  users: User[];
  professionals: Professional[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  scheduleBlocks: ScheduleBlock[];
  packages: Package[];
  clientPackages: ClientPackage[];
  payments: Payment[];
  reviews: Review[];
  notifications: Notification[];
  messageTemplates: MessageTemplate[];
  waitlist: WaitlistEntry[];
  evolutionRecords: EvolutionRecord[];
  contraindications: Contraindication[];
  treatmentPlans: TreatmentPlan[];
  quotes: Quote[];
  settings: Settings;
}

/** Versão do schema persistido — incrementar invalida o cache do localStorage. */
export const DATABASE_VERSION = 1;
