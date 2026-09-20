"use client";

import type { Package, Service, ServiceCategory } from "@/types";

import { newId, notFound, readDb, replaceById, writeDb } from "./core";

export interface ServiceFilters {
  unitId?: string;
  search?: string;
  category?: ServiceCategory;
  professionalId?: string;
  onlyActive?: boolean;
}

/** Serviços, combos e pacotes. Contrato em `docs/api-contract.md` §4. */
export const serviceRepository = {
  /** `GET /services` */
  list: (filters: ServiceFilters = {}): Promise<Service[]> =>
    readDb((db) => {
      const term = filters.search?.trim().toLowerCase();
      return db.services.filter((service) => {
        if (filters.unitId && service.unitId !== filters.unitId) return false;
        if (filters.category && service.category !== filters.category) return false;
        if (filters.onlyActive && !service.active) return false;
        if (
          filters.professionalId &&
          !service.professionalIds.includes(filters.professionalId)
        ) {
          return false;
        }
        if (term && !service.name.toLowerCase().includes(term)) return false;
        return true;
      });
    }),

  /** `GET /services/:id` */
  get: (id: string): Promise<Service | null> =>
    readDb((db) => db.services.find((service) => service.id === id) ?? null),

  /** `POST /services` */
  create: (input: Omit<Service, "id">): Promise<Service> =>
    writeDb((db) => {
      const service: Service = { ...input, id: newId() };
      const professionals = db.professionals.map((pro) =>
        service.professionalIds.includes(pro.id)
          ? { ...pro, serviceIds: [...pro.serviceIds, service.id] }
          : pro,
      );
      return {
        db: { ...db, services: [...db.services, service], professionals },
        result: service,
      };
    }),

  /** `PATCH /services/:id` */
  update: (id: string, patch: Partial<Service>): Promise<Service> =>
    writeDb((db) => {
      const current = db.services.find((service) => service.id === id);
      if (!current) notFound("Serviço");
      const updated: Service = { ...current, ...patch, id };
      // mantém o vínculo inverso serviço ↔ profissional coerente
      const professionals = db.professionals.map((pro) => {
        const shouldHave = updated.professionalIds.includes(pro.id);
        const has = pro.serviceIds.includes(id);
        if (shouldHave === has) return pro;
        return {
          ...pro,
          serviceIds: shouldHave
            ? [...pro.serviceIds, id]
            : pro.serviceIds.filter((serviceId) => serviceId !== id),
        };
      });
      return {
        db: {
          ...db,
          services: replaceById(db.services, id, () => updated),
          professionals,
        },
        result: updated,
      };
    }),

  /** `DELETE /services/:id` — soft delete: vira inativo. */
  deactivate: (id: string): Promise<Service> =>
    writeDb((db) => {
      const current = db.services.find((service) => service.id === id);
      if (!current) notFound("Serviço");
      const updated = { ...current, active: false };
      return {
        db: { ...db, services: replaceById(db.services, id, () => updated) },
        result: updated,
      };
    }),

  /** `GET /packages?unitId=` */
  listPackages: (unitId?: string): Promise<Package[]> =>
    readDb((db) =>
      unitId ? db.packages.filter((pkg) => pkg.unitId === unitId) : db.packages,
    ),

  /** `POST /packages` */
  createPackage: (input: Omit<Package, "id">): Promise<Package> =>
    writeDb((db) => {
      const pkg: Package = { ...input, id: newId() };
      return { db: { ...db, packages: [...db.packages, pkg] }, result: pkg };
    }),

  /** `PATCH /packages/:id` */
  updatePackage: (id: string, patch: Partial<Package>): Promise<Package> =>
    writeDb((db) => {
      const current = db.packages.find((pkg) => pkg.id === id);
      if (!current) notFound("Pacote");
      const updated = { ...current, ...patch, id };
      return {
        db: { ...db, packages: replaceById(db.packages, id, () => updated) },
        result: updated,
      };
    }),
};
