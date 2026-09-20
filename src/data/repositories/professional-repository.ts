"use client";

import type { Professional, TimeOff } from "@/types";

import { newId, notFound, readDb, replaceById, writeDb } from "./core";

export interface ProfessionalFilters {
  unitId?: string;
  serviceId?: string;
  search?: string;
  onlyActive?: boolean;
}

/** Profissionais, grades de horário e folgas. Contrato §5. */
export const professionalRepository = {
  /** `GET /professionals` */
  list: (filters: ProfessionalFilters = {}): Promise<Professional[]> =>
    readDb((db) => {
      const term = filters.search?.trim().toLowerCase();
      return db.professionals.filter((pro) => {
        if (filters.unitId && pro.unitId !== filters.unitId) return false;
        if (filters.onlyActive && !pro.active) return false;
        if (filters.serviceId && !pro.serviceIds.includes(filters.serviceId)) {
          return false;
        }
        if (term && !pro.name.toLowerCase().includes(term)) return false;
        return true;
      });
    }),

  /** `GET /professionals/:id` */
  get: (id: string): Promise<Professional | null> =>
    readDb((db) => db.professionals.find((pro) => pro.id === id) ?? null),

  /** `GET /professionals/by-user/:userId` — resolve o profissional logado. */
  getByUserId: (userId: string): Promise<Professional | null> =>
    readDb((db) => db.professionals.find((pro) => pro.userId === userId) ?? null),

  /** `POST /professionals` */
  create: (input: Omit<Professional, "id">): Promise<Professional> =>
    writeDb((db) => {
      const professional: Professional = { ...input, id: newId() };
      const services = db.services.map((service) =>
        professional.serviceIds.includes(service.id)
          ? {
              ...service,
              professionalIds: [...service.professionalIds, professional.id],
            }
          : service,
      );
      return {
        db: {
          ...db,
          professionals: [...db.professionals, professional],
          services,
        },
        result: professional,
      };
    }),

  /** `PATCH /professionals/:id` */
  update: (id: string, patch: Partial<Professional>): Promise<Professional> =>
    writeDb((db) => {
      const current = db.professionals.find((pro) => pro.id === id);
      if (!current) notFound("Profissional");
      const updated: Professional = { ...current, ...patch, id };
      const services = db.services.map((service) => {
        const shouldHave = updated.serviceIds.includes(service.id);
        const has = service.professionalIds.includes(id);
        if (shouldHave === has) return service;
        return {
          ...service,
          professionalIds: shouldHave
            ? [...service.professionalIds, id]
            : service.professionalIds.filter((proId) => proId !== id),
        };
      });
      return {
        db: {
          ...db,
          professionals: replaceById(db.professionals, id, () => updated),
          services,
        },
        result: updated,
      };
    }),

  /** `DELETE /professionals/:id` — soft delete. */
  deactivate: (id: string): Promise<Professional> =>
    writeDb((db) => {
      const current = db.professionals.find((pro) => pro.id === id);
      if (!current) notFound("Profissional");
      const updated = { ...current, active: false };
      return {
        db: {
          ...db,
          professionals: replaceById(db.professionals, id, () => updated),
        },
        result: updated,
      };
    }),

  /** `POST /professionals/:id/time-off` */
  addTimeOff: (
    professionalId: string,
    input: Omit<TimeOff, "id" | "professionalId">,
  ): Promise<TimeOff> =>
    writeDb((db) => {
      const current = db.professionals.find((pro) => pro.id === professionalId);
      if (!current) notFound("Profissional");
      const timeOff: TimeOff = { ...input, id: newId(), professionalId };
      return {
        db: {
          ...db,
          professionals: replaceById(db.professionals, professionalId, (pro) => ({
            ...pro,
            timeOff: [...pro.timeOff, timeOff],
          })),
        },
        result: timeOff,
      };
    }),

  /** `DELETE /professionals/:id/time-off/:timeOffId` */
  removeTimeOff: (professionalId: string, timeOffId: string): Promise<void> =>
    writeDb((db) => ({
      db: {
        ...db,
        professionals: replaceById(db.professionals, professionalId, (pro) => ({
          ...pro,
          timeOff: pro.timeOff.filter((item) => item.id !== timeOffId),
        })),
      },
      result: undefined,
    })),

  /** `PATCH /professionals/:id/time-off/:timeOffId` */
  updateTimeOffStatus: (
    professionalId: string,
    timeOffId: string,
    status: TimeOff["status"],
  ): Promise<void> =>
    writeDb((db) => ({
      db: {
        ...db,
        professionals: replaceById(db.professionals, professionalId, (pro) => ({
          ...pro,
          timeOff: pro.timeOff.map((item) =>
            item.id === timeOffId ? { ...item, status } : item,
          ),
        })),
      },
      result: undefined,
    })),
};
