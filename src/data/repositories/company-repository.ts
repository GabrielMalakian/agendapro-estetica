"use client";

import type {
  Company,
  Holiday,
  Room,
  Settings,
  Unit,
  User,
} from "@/types";

import { newId, notFound, readDb, replaceById, writeDb } from "./core";

/**
 * Empresa, unidades, salas, feriados e configurações.
 *
 * Contrato REST correspondente em `docs/api-contract.md` §1 e §10.
 */
export const companyRepository = {
  /** `GET /companies/current` */
  getCompany: (): Promise<Company | null> =>
    readDb((db) => db.companies[0] ?? null),

  /** `GET /companies/by-slug/:slug` — usado pela página pública. */
  getCompanyBySlug: (slug: string): Promise<Company | null> =>
    readDb((db) => db.companies.find((item) => item.slug === slug) ?? null),

  /** `PATCH /companies/:id` */
  updateCompany: (id: string, patch: Partial<Company>): Promise<Company> =>
    writeDb((db) => {
      const current = db.companies.find((item) => item.id === id);
      if (!current) notFound("Empresa");
      const updated = { ...current, ...patch, id };
      return {
        db: { ...db, companies: replaceById(db.companies, id, () => updated) },
        result: updated,
      };
    }),

  /** `GET /units` */
  listUnits: (companyId?: string): Promise<Unit[]> =>
    readDb((db) =>
      companyId
        ? db.units.filter((unit) => unit.companyId === companyId)
        : db.units,
    ),

  /** `GET /units/:id` */
  getUnit: (id: string): Promise<Unit | null> =>
    readDb((db) => db.units.find((unit) => unit.id === id) ?? null),

  /** `PATCH /units/:id` */
  updateUnit: (id: string, patch: Partial<Unit>): Promise<Unit> =>
    writeDb((db) => {
      const current = db.units.find((unit) => unit.id === id);
      if (!current) notFound("Unidade");
      const updated = { ...current, ...patch, id };
      return {
        db: { ...db, units: replaceById(db.units, id, () => updated) },
        result: updated,
      };
    }),

  /** `POST /units` */
  createUnit: (input: Omit<Unit, "id">): Promise<Unit> =>
    writeDb((db) => {
      const unit: Unit = { ...input, id: newId() };
      return { db: { ...db, units: [...db.units, unit] }, result: unit };
    }),

  /** `GET /rooms?unitId=` */
  listRooms: (unitId?: string): Promise<Room[]> =>
    readDb((db) =>
      unitId ? db.rooms.filter((room) => room.unitId === unitId) : db.rooms,
    ),

  /** `POST /rooms` */
  createRoom: (input: Omit<Room, "id">): Promise<Room> =>
    writeDb((db) => {
      const room: Room = { ...input, id: newId() };
      return { db: { ...db, rooms: [...db.rooms, room] }, result: room };
    }),

  /** `DELETE /rooms/:id` */
  deleteRoom: (id: string): Promise<void> =>
    writeDb((db) => ({
      db: { ...db, rooms: db.rooms.filter((room) => room.id !== id) },
      result: undefined,
    })),

  /** `GET /holidays?unitId=` */
  listHolidays: (unitId?: string): Promise<Holiday[]> =>
    readDb((db) =>
      unitId
        ? db.holidays.filter((holiday) => holiday.unitId === unitId)
        : db.holidays,
    ),

  /** `POST /holidays` */
  createHoliday: (input: Omit<Holiday, "id">): Promise<Holiday> =>
    writeDb((db) => {
      const holiday: Holiday = { ...input, id: newId() };
      return {
        db: { ...db, holidays: [...db.holidays, holiday] },
        result: holiday,
      };
    }),

  /** `DELETE /holidays/:id` */
  deleteHoliday: (id: string): Promise<void> =>
    writeDb((db) => ({
      db: { ...db, holidays: db.holidays.filter((item) => item.id !== id) },
      result: undefined,
    })),

  /** `GET /settings` */
  getSettings: (): Promise<Settings> => readDb((db) => db.settings),

  /** `PATCH /settings` */
  updateSettings: (patch: Partial<Settings>): Promise<Settings> =>
    writeDb((db) => {
      const settings = { ...db.settings, ...patch };
      return { db: { ...db, settings }, result: settings };
    }),

  /** `GET /users` */
  listUsers: (): Promise<User[]> => readDb((db) => db.users),
};
