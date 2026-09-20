import type { Database } from "../database";

import { buildAppointments } from "./appointments";
import {
  assignTimeOff,
  buildCompany,
  buildHolidays,
  buildMessageTemplates,
  buildPackages,
  buildProfessionals,
  buildRooms,
  buildServices,
  buildSettings,
  buildUnits,
} from "./organization";
import { buildAdminUser, buildClients } from "./people";
import { createRandom, DEMO_SEED } from "./rng";
import { buildSegmentData } from "./segment";

export { DEMO_IDS, COMPANY_SLUG } from "./organization";

/**
 * Monta a base fictícia completa da demonstração.
 *
 * É chamada uma única vez, no cliente, quando não existe base persistida no
 * localStorage. No backend real este arquivo vira um `prisma/seed.ts`.
 */
export function createSeedDatabase(seed: number = DEMO_SEED): Database {
  const random = createRandom(seed);

  const company = buildCompany();
  const units = buildUnits();
  const holidays = buildHolidays(random, units);
  const rooms = buildRooms(random, units);
  const services = buildServices(random, units, rooms);
  const { users: professionalUsers, professionals } = buildProfessionals(
    random,
    units,
    services,
  );
  assignTimeOff(random, professionals);

  const packages = buildPackages(random, units, services);
  const { clients, clientUser } = buildClients(random, units);
  const adminUser = buildAdminUser(units);

  const {
    appointments,
    payments,
    reviews,
    clientPackages,
    notifications,
    waitlist,
    scheduleBlocks,
  } = buildAppointments({
    random,
    units,
    rooms,
    services,
    professionals,
    clients,
    holidays,
    packages,
  });

  const { evolutionRecords, contraindications, treatmentPlans, quotes } =
    buildSegmentData({ random, clients, appointments, professionals, services });

  return {
    companies: [company],
    units,
    holidays,
    rooms,
    users: [adminUser, ...professionalUsers, clientUser],
    professionals,
    services,
    clients,
    appointments,
    scheduleBlocks,
    packages,
    clientPackages,
    payments,
    reviews,
    notifications,
    messageTemplates: buildMessageTemplates(random, units),
    waitlist,
    evolutionRecords,
    contraindications,
    treatmentPlans,
    quotes,
    settings: buildSettings(),
  };
}
