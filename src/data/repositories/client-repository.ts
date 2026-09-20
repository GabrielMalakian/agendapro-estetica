"use client";

import { differenceInDays } from "date-fns";

import type { Database } from "../database";
import type {
  Appointment,
  Client,
  ClientMetrics,
  ClientPackage,
  ClientTag,
} from "@/types";

import { newId, nowIso, notFound, readDb, replaceById, writeDb } from "./core";

/** Filtro de segmentação usado na listagem de clientes do admin. */
export const CLIENT_SEGMENTS = [
  "ALL",
  "NEW",
  "RECURRING",
  "INACTIVE_90",
  "WITH_NO_SHOW",
] as const;
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number];

export const CLIENT_SEGMENT_LABELS: Record<ClientSegment, string> = {
  ALL: "Todos",
  NEW: "Novos (30 dias)",
  RECURRING: "Recorrentes (3+ visitas)",
  INACTIVE_90: "Inativos há 90 dias",
  WITH_NO_SHOW: "Com faltas",
};

export interface ClientFilters {
  unitId?: string;
  search?: string;
  segment?: ClientSegment;
  tag?: ClientTag;
}

export interface ClientWithMetrics extends Client {
  metrics: ClientMetrics;
}

/** Calcula as métricas da ficha do cliente a partir dos atendimentos. */
export function computeClientMetrics(
  clientId: string,
  appointments: Appointment[],
): ClientMetrics {
  const own = appointments.filter((item) => item.clientId === clientId);
  const completed = own.filter((item) => item.status === "COMPLETED");
  const noShows = own.filter((item) => item.status === "NO_SHOW");
  const cancellations = own.filter((item) => item.status === "CANCELLED");

  const totalSpent = completed.reduce((sum, item) => sum + item.price, 0);

  const byProfessional = new Map<string, number>();
  for (const item of completed) {
    byProfessional.set(
      item.professionalId,
      (byProfessional.get(item.professionalId) ?? 0) + 1,
    );
  }
  const favorite = [...byProfessional.entries()].sort((a, b) => b[1] - a[1])[0];

  const now = Date.now();
  const past = completed
    .filter((item) => new Date(item.startsAt).getTime() <= now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const future = own
    .filter(
      (item) =>
        new Date(item.startsAt).getTime() > now &&
        item.status !== "CANCELLED" &&
        item.status !== "NO_SHOW",
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return {
    totalAppointments: own.length,
    completed: completed.length,
    noShows: noShows.length,
    cancellations: cancellations.length,
    totalSpent,
    averageTicket: completed.length > 0 ? totalSpent / completed.length : 0,
    favoriteProfessionalId: favorite?.[0] ?? null,
    lastVisitAt: past[0]?.startsAt ?? null,
    nextVisitAt: future[0]?.startsAt ?? null,
  };
}

function matchesSegment(
  segment: ClientSegment,
  client: Client,
  metrics: ClientMetrics,
): boolean {
  switch (segment) {
    case "NEW":
      return differenceInDays(new Date(), new Date(client.createdAt)) <= 30;
    case "RECURRING":
      return metrics.completed >= 3;
    case "INACTIVE_90":
      return (
        metrics.lastVisitAt === null ||
        differenceInDays(new Date(), new Date(metrics.lastVisitAt)) > 90
      );
    case "WITH_NO_SHOW":
      return metrics.noShows > 0;
    default:
      return true;
  }
}

function withMetrics(db: Database, client: Client): ClientWithMetrics {
  return { ...client, metrics: computeClientMetrics(client.id, db.appointments) };
}

/** Clientes, fichas e pacotes contratados. Contrato §3. */
export const clientRepository = {
  /** `GET /clients` */
  list: (filters: ClientFilters = {}): Promise<ClientWithMetrics[]> =>
    readDb((db) => {
      const term = filters.search?.trim().toLowerCase();
      return db.clients
        .filter((client) => {
          if (filters.unitId && client.unitId !== filters.unitId) return false;
          if (filters.tag && !client.tags.includes(filters.tag)) return false;
          if (term) {
            const haystack =
              `${client.name} ${client.email} ${client.phone} ${client.cpf}`.toLowerCase();
            if (!haystack.includes(term)) return false;
          }
          return true;
        })
        .map((client) => withMetrics(db, client))
        .filter((client) =>
          matchesSegment(filters.segment ?? "ALL", client, client.metrics),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }),

  /** `GET /clients/:id` */
  get: (id: string): Promise<ClientWithMetrics | null> =>
    readDb((db) => {
      const client = db.clients.find((item) => item.id === id);
      return client ? withMetrics(db, client) : null;
    }),

  /** `GET /clients/by-user/:userId` — resolve o cliente logado. */
  getByUserId: (userId: string): Promise<ClientWithMetrics | null> =>
    readDb((db) => {
      const client = db.clients.find((item) => item.userId === userId);
      return client ? withMetrics(db, client) : null;
    }),

  /** `POST /clients` */
  create: (
    input: Omit<Client, "id" | "createdAt">,
  ): Promise<Client> =>
    writeDb((db) => {
      const client: Client = { ...input, id: newId(), createdAt: nowIso() };
      return { db: { ...db, clients: [...db.clients, client] }, result: client };
    }),

  /** `PATCH /clients/:id` */
  update: (id: string, patch: Partial<Client>): Promise<Client> =>
    writeDb((db) => {
      const current = db.clients.find((item) => item.id === id);
      if (!current) notFound("Cliente");
      const updated: Client = { ...current, ...patch, id };
      return {
        db: { ...db, clients: replaceById(db.clients, id, () => updated) },
        result: updated,
      };
    }),

  /** `DELETE /clients/:id` */
  remove: (id: string): Promise<void> =>
    writeDb((db) => ({
      db: { ...db, clients: db.clients.filter((item) => item.id !== id) },
      result: undefined,
    })),

  /** `GET /clients/:id/packages` */
  listPackages: (clientId: string): Promise<ClientPackage[]> =>
    readDb((db) => db.clientPackages.filter((item) => item.clientId === clientId)),

  /** `GET /client-packages?unitId=` */
  listAllPackages: (unitId?: string): Promise<ClientPackage[]> =>
    readDb((db) => {
      if (!unitId) return db.clientPackages;
      const packageIds = new Set(
        db.packages.filter((pkg) => pkg.unitId === unitId).map((pkg) => pkg.id),
      );
      return db.clientPackages.filter((item) => packageIds.has(item.packageId));
    }),

  /** `POST /clients/:id/packages` */
  purchasePackage: (
    input: Omit<ClientPackage, "id">,
  ): Promise<ClientPackage> =>
    writeDb((db) => {
      const clientPackage: ClientPackage = { ...input, id: newId() };
      return {
        db: { ...db, clientPackages: [...db.clientPackages, clientPackage] },
        result: clientPackage,
      };
    }),

  /** `POST /client-packages/:id/consume` */
  consumeSession: (clientPackageId: string): Promise<ClientPackage> =>
    writeDb((db) => {
      const current = db.clientPackages.find((item) => item.id === clientPackageId);
      if (!current) notFound("Pacote do cliente");
      const updated = { ...current, sessionsUsed: current.sessionsUsed + 1 };
      return {
        db: {
          ...db,
          clientPackages: replaceById(db.clientPackages, clientPackageId, () => updated),
        },
        result: updated,
      };
    }),
};
