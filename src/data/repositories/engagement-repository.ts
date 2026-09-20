"use client";

import type {
  Contraindication,
  EvolutionRecord,
  MessageTemplate,
  Notification,
  Quote,
  Review,
  TreatmentPlan,
  WaitlistEntry,
} from "@/types";

import { newId, nowIso, notFound, readDb, replaceById, writeDb } from "./core";

/** Avaliações, lista de espera, comunicação e módulos por segmento. §9. */
export const engagementRepository = {
  /* ------------------------------ avaliações ---------------------------- */

  /** `GET /reviews` */
  listReviews: (filters: { unitId?: string; clientId?: string; professionalId?: string } = {}): Promise<
    Review[]
  > =>
    readDb((db) => {
      const appointmentById = new Map(db.appointments.map((item) => [item.id, item]));
      return db.reviews
        .filter((review) => {
          const appointment = appointmentById.get(review.appointmentId);
          if (!appointment) return false;
          if (filters.unitId && appointment.unitId !== filters.unitId) return false;
          if (filters.clientId && review.clientId !== filters.clientId) return false;
          if (
            filters.professionalId &&
            appointment.professionalId !== filters.professionalId
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),

  /** `POST /reviews` */
  createReview: (
    input: Omit<Review, "id" | "createdAt">,
  ): Promise<Review> =>
    writeDb((db) => {
      const review: Review = { ...input, id: newId(), createdAt: nowIso() };
      return { db: { ...db, reviews: [...db.reviews, review] }, result: review };
    }),

  /* --------------------------- lista de espera --------------------------- */

  /** `GET /waitlist?unitId=` */
  listWaitlist: (unitId?: string): Promise<WaitlistEntry[]> =>
    readDb((db) =>
      db.waitlist
        .filter((entry) => !unitId || entry.unitId === unitId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    ),

  /** `POST /waitlist` */
  createWaitlistEntry: (
    input: Omit<WaitlistEntry, "id" | "createdAt" | "status">,
  ): Promise<WaitlistEntry> =>
    writeDb((db) => {
      const entry: WaitlistEntry = {
        ...input,
        id: newId(),
        status: "WAITING",
        createdAt: nowIso(),
      };
      return { db: { ...db, waitlist: [...db.waitlist, entry] }, result: entry };
    }),

  /** `PATCH /waitlist/:id` */
  updateWaitlistStatus: (
    id: string,
    status: WaitlistEntry["status"],
  ): Promise<WaitlistEntry> =>
    writeDb((db) => {
      const current = db.waitlist.find((entry) => entry.id === id);
      if (!current) notFound("Entrada da lista de espera");
      const updated = { ...current, status };
      return {
        db: { ...db, waitlist: replaceById(db.waitlist, id, () => updated) },
        result: updated,
      };
    }),

  /** `DELETE /waitlist/:id` */
  removeWaitlistEntry: (id: string): Promise<void> =>
    writeDb((db) => ({
      db: { ...db, waitlist: db.waitlist.filter((entry) => entry.id !== id) },
      result: undefined,
    })),

  /* ---------------------------- comunicação ------------------------------ */

  /** `GET /message-templates?unitId=` */
  listTemplates: (unitId?: string): Promise<MessageTemplate[]> =>
    readDb((db) =>
      db.messageTemplates.filter((item) => !unitId || item.unitId === unitId),
    ),

  /** `PATCH /message-templates/:id` */
  updateTemplate: (
    id: string,
    patch: Partial<MessageTemplate>,
  ): Promise<MessageTemplate> =>
    writeDb((db) => {
      const current = db.messageTemplates.find((item) => item.id === id);
      if (!current) notFound("Template");
      const updated = { ...current, ...patch, id };
      return {
        db: {
          ...db,
          messageTemplates: replaceById(db.messageTemplates, id, () => updated),
        },
        result: updated,
      };
    }),

  /** `GET /notifications?unitId=` — a "caixa de saída" mockada. */
  listNotifications: (filters: { unitId?: string; status?: Notification["status"][] } = {}): Promise<
    Notification[]
  > =>
    readDb((db) =>
      db.notifications
        .filter((item) => {
          if (filters.unitId && item.unitId !== filters.unitId) return false;
          if (filters.status && !filters.status.includes(item.status)) return false;
          return true;
        })
        .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor)),
    ),

  /** `POST /notifications/:id/resend` */
  resendNotification: (id: string): Promise<Notification> =>
    writeDb((db) => {
      const current = db.notifications.find((item) => item.id === id);
      if (!current) notFound("Mensagem");
      const updated: Notification = { ...current, status: "SENT", sentAt: nowIso() };
      return {
        db: {
          ...db,
          notifications: replaceById(db.notifications, id, () => updated),
        },
        result: updated,
      };
    }),

  /** `DELETE /notifications/:id` — cancela um envio agendado. */
  cancelNotification: (id: string): Promise<Notification> =>
    writeDb((db) => {
      const current = db.notifications.find((item) => item.id === id);
      if (!current) notFound("Mensagem");
      const updated: Notification = { ...current, status: "CANCELLED" };
      return {
        db: {
          ...db,
          notifications: replaceById(db.notifications, id, () => updated),
        },
        result: updated,
      };
    }),

  /* -------------------------- módulos por segmento ----------------------- */

  /** `GET /clients/:id/evolution` */
  listEvolution: (clientId: string): Promise<EvolutionRecord[]> =>
    readDb((db) =>
      db.evolutionRecords
        .filter((item) => item.clientId === clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ),

  /** `POST /clients/:id/evolution` */
  createEvolution: (
    input: Omit<EvolutionRecord, "id" | "createdAt">,
  ): Promise<EvolutionRecord> =>
    writeDb((db) => {
      const record: EvolutionRecord = { ...input, id: newId(), createdAt: nowIso() };
      return {
        db: { ...db, evolutionRecords: [...db.evolutionRecords, record] },
        result: record,
      };
    }),

  /** `GET /clients/:id/contraindications` */
  listContraindications: (clientId: string): Promise<Contraindication[]> =>
    readDb((db) => db.contraindications.filter((item) => item.clientId === clientId)),

  /** `GET /clients/:id/treatment-plans` */
  listTreatmentPlans: (clientId: string): Promise<TreatmentPlan[]> =>
    readDb((db) => db.treatmentPlans.filter((item) => item.clientId === clientId)),

  /** `PATCH /treatment-plans/:planId/steps/:stepId` */
  updateTreatmentStep: (
    planId: string,
    stepId: string,
    status: TreatmentPlan["steps"][number]["status"],
  ): Promise<TreatmentPlan> =>
    writeDb((db) => {
      const current = db.treatmentPlans.find((item) => item.id === planId);
      if (!current) notFound("Plano de tratamento");
      const updated: TreatmentPlan = {
        ...current,
        steps: current.steps.map((step) =>
          step.id === stepId ? { ...step, status } : step,
        ),
      };
      return {
        db: {
          ...db,
          treatmentPlans: replaceById(db.treatmentPlans, planId, () => updated),
        },
        result: updated,
      };
    }),

  /** `GET /clients/:id/quotes` */
  listQuotes: (clientId: string): Promise<Quote[]> =>
    readDb((db) => db.quotes.filter((item) => item.clientId === clientId)),

  /** `PATCH /quotes/:id` */
  updateQuoteStatus: (id: string, status: Quote["status"]): Promise<Quote> =>
    writeDb((db) => {
      const current = db.quotes.find((item) => item.id === id);
      if (!current) notFound("Orçamento");
      const updated = { ...current, status };
      return {
        db: { ...db, quotes: replaceById(db.quotes, id, () => updated) },
        result: updated,
      };
    }),
};
