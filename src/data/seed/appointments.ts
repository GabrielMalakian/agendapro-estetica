import {
  addDays,
  addMinutes,
  differenceInMinutes,
  isBefore,
  set,
  startOfDay,
} from "date-fns";

import type {
  Appointment,
  AppointmentStatus,
  Client,
  ClientPackage,
  Holiday,
  Notification,
  Package,
  Payment,
  PaymentMethod,
  Professional,
  Review,
  Room,
  ScheduleBlock,
  Service,
  Unit,
  WaitlistEntry,
  Weekday,
} from "@/types";

import { DEMO_IDS } from "./organization";
import type { Random } from "./rng";

const PAST_DAYS = 60;
const FUTURE_DAYS = 30;

interface Context {
  random: Random;
  units: Unit[];
  rooms: Room[];
  services: Service[];
  professionals: Professional[];
  clients: Client[];
  holidays: Holiday[];
  packages: Package[];
}

export interface AppointmentSeed {
  appointments: Appointment[];
  payments: Payment[];
  reviews: Review[];
  clientPackages: ClientPackage[];
  notifications: Notification[];
  waitlist: WaitlistEntry[];
  scheduleBlocks: ScheduleBlock[];
}

function parseTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
}

/** Status coerente com a posição do atendimento na linha do tempo. */
function pickStatus(random: Random, date: Date, now: Date): AppointmentStatus {
  if (isBefore(date, now)) {
    return random.weighted<AppointmentStatus>([
      ["COMPLETED", 78],
      ["CANCELLED", 10],
      ["NO_SHOW", 7],
      ["CONFIRMED", 5],
    ]);
  }
  const hoursAhead = differenceInMinutes(date, now) / 60;
  if (hoursAhead < 48) {
    return random.weighted<AppointmentStatus>([
      ["CONFIRMED", 7],
      ["SCHEDULED", 3],
    ]);
  }
  return random.weighted<AppointmentStatus>([
    ["SCHEDULED", 7],
    ["CONFIRMED", 3],
  ]);
}

export function buildAppointments(context: Context): AppointmentSeed {
  const { random, units, rooms, services, professionals, clients, holidays, packages } =
    context;

  const now = new Date();
  const today = startOfDay(now);

  const appointments: Appointment[] = [];
  const payments: Payment[] = [];
  const reviews: Review[] = [];
  const clientPackages: ClientPackage[] = [];
  const notifications: Notification[] = [];
  const waitlist: WaitlistEntry[] = [];
  const scheduleBlocks: ScheduleBlock[] = [];

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const holidayDates = new Set(holidays.map((holiday) => `${holiday.unitId}|${holiday.date}`));
  const clientsByUnit = new Map<string, Client[]>();
  for (const client of clients) {
    const list = clientsByUnit.get(client.unitId) ?? [];
    list.push(client);
    clientsByUnit.set(client.unitId, list);
  }

  /* ---------------------- pacotes vendidos aos clientes ------------------- */
  const packageBuyers = random.sample(clients, 14);
  for (const client of packageBuyers) {
    const available = packages.filter((pkg) => pkg.unitId === client.unitId);
    if (available.length === 0) continue;
    const pkg = random.pick(available);
    const purchasedAt = addDays(today, -random.int(10, 200));
    clientPackages.push({
      id: random.uuid(),
      clientId: client.id,
      packageId: pkg.id,
      sessionsUsed: random.int(1, Math.max(1, pkg.totalSessions - 2)),
      purchasedAt: purchasedAt.toISOString(),
      expiresAt: addDays(purchasedAt, pkg.validityDays).toISOString(),
    });
  }
  // O cliente da demo sempre tem um pacote em andamento e visível.
  const demoUnitPackages = packages.filter((pkg) => pkg.unitId === units[0].id);
  if (demoUnitPackages.length > 0 && !clientPackages.some((cp) => cp.clientId === DEMO_IDS.clientGabriel)) {
    const pkg = demoUnitPackages[0];
    const purchasedAt = addDays(today, -70);
    clientPackages.push({
      id: random.uuid(),
      clientId: DEMO_IDS.clientGabriel,
      packageId: pkg.id,
      sessionsUsed: Math.min(6, pkg.totalSessions - 1),
      purchasedAt: purchasedAt.toISOString(),
      expiresAt: addDays(purchasedAt, pkg.validityDays).toISOString(),
    });
  }

  const packageByClient = new Map(clientPackages.map((cp) => [cp.clientId, cp]));

  /* ------------------------------ agendamentos ---------------------------- */
  for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset += 1) {
    const day = addDays(today, offset);
    const weekday = day.getDay() as Weekday;
    const dateKey = day.toISOString().slice(0, 10);

    for (const unit of units) {
      const hours = unit.businessHours.find((item) => item.weekday === weekday);
      if (!hours || hours.closed) continue;
      if (holidayDates.has(`${unit.id}|${dateKey}`)) continue;

      const unitPros = professionals.filter((pro) => pro.unitId === unit.id);
      const unitClients = clientsByUnit.get(unit.id) ?? clients;
      if (unitClients.length === 0) continue;

      for (const pro of unitPros) {
        const grid = pro.workingHours.find((item) => item.weekday === weekday);
        if (!grid || !grid.enabled) continue;

        const onTimeOff = pro.timeOff.some(
          (off) =>
            off.status === "APPROVED" &&
            off.allDay &&
            dateKey >= off.startDate &&
            dateKey <= off.endDate,
        );
        if (onTimeOff) continue;

        const dayStart = parseTime(day, grid.startTime);
        const dayEnd = parseTime(day, grid.endTime);
        let cursor = addMinutes(dayStart, random.int(0, 3) * 15);

        // 1 a 4 atendimentos por profissional por dia, com lacunas entre eles.
        const target = random.weighted([
          [0, 2],
          [1, 3],
          [2, 4],
          [3, 3],
          [4, 2],
        ]);

        for (let i = 0; i < target; i += 1) {
          const eligible = pro.serviceIds
            .map((id) => serviceById.get(id))
            .filter((service): service is Service => Boolean(service?.active));
          if (eligible.length === 0) break;

          const service = random.pick(eligible);
          const total = service.durationMinutes + service.bufferMinutes;
          const endsAt = addMinutes(cursor, total);
          if (endsAt > dayEnd) break;

          // pula o intervalo de almoço
          if (grid.breakStart && grid.breakEnd) {
            const breakStart = parseTime(day, grid.breakStart);
            const breakEnd = parseTime(day, grid.breakEnd);
            if (cursor < breakEnd && endsAt > breakStart) {
              cursor = breakEnd;
              i -= 1;
              if (addMinutes(cursor, total) > dayEnd) break;
              continue;
            }
          }

          const client = random.pick(unitClients);
          const status = pickStatus(random, cursor, now);
          const room =
            service.requiresRoom && service.roomIds.length > 0
              ? rooms.find((item) => item.id === random.pick(service.roomIds))
              : undefined;

          const usesPackage =
            status === "COMPLETED" &&
            packageByClient.get(client.id)?.clientId === client.id &&
            random.chance(0.25);

          const price = usesPackage ? 0 : service.price;
          const paymentStatus =
            status === "COMPLETED"
              ? usesPackage
                ? "PAID"
                : random.weighted<Appointment["paymentStatus"]>([
                    ["PAID", 88],
                    ["PARTIAL", 7],
                    ["PENDING", 5],
                  ])
              : status === "CONFIRMED" && service.price >= 250 && random.chance(0.5)
                ? "PARTIAL"
                : "PENDING";

          const method: PaymentMethod | undefined =
            paymentStatus === "PENDING"
              ? undefined
              : random.weighted<PaymentMethod>([
                  ["PIX", 40],
                  ["CREDIT", 30],
                  ["DEBIT", 18],
                  ["CASH", 12],
                ]);

          const appointment: Appointment = {
            id: random.uuid(),
            unitId: unit.id,
            clientId: client.id,
            professionalId: pro.id,
            serviceId: service.id,
            roomId: room?.id,
            startsAt: cursor.toISOString(),
            endsAt: endsAt.toISOString(),
            status,
            price,
            paymentStatus,
            paymentMethod: method,
            depositAmount:
              paymentStatus === "PARTIAL"
                ? Math.round(service.price * 0.3)
                : undefined,
            notes: random.chance(0.18)
              ? random.pick([
                  "Cliente pediu para avisar 30min antes.",
                  "Levar produto que ficou reservado.",
                  "Primeira vez com este profissional.",
                  "Retorno de procedimento anterior.",
                ])
              : "",
            createdBy: random.chance(0.6) ? DEMO_IDS.userAdmin : client.id,
            source: random.weighted<Appointment["source"]>([
              ["INTERNAL", 6],
              ["ONLINE", 4],
            ]),
            createdAt: addDays(cursor, -random.int(1, 20)).toISOString(),
            clientPackageId: usesPackage ? packageByClient.get(client.id)?.id : undefined,
            professionalNotes:
              status === "COMPLETED" && random.chance(0.3)
                ? random.pick([
                    "Procedimento sem intercorrências.",
                    "Pele reagiu bem, manter protocolo.",
                    "Sugerido retorno em 30 dias.",
                    "Cliente elogiou o resultado.",
                  ])
                : undefined,
            cancelledAt:
              status === "CANCELLED"
                ? addDays(cursor, -random.int(0, 3)).toISOString()
                : undefined,
            cancellationReason:
              status === "CANCELLED"
                ? random.pick([
                    "Imprevisto pessoal",
                    "Doente",
                    "Remarcou para outra data",
                    "Viagem de trabalho",
                  ])
                : undefined,
          };

          appointments.push(appointment);

          const paidAmount =
            paymentStatus === "PAID"
              ? price
              : (appointment.depositAmount ?? Math.round(service.price * 0.3));

          // Atendimento coberto por pacote tem preço zero: já foi pago na
          // compra do pacote, então não gera lançamento no caixa do dia.
          if (paymentStatus !== "PENDING" && method && paidAmount > 0) {
            payments.push({
              id: random.uuid(),
              appointmentId: appointment.id,
              amount: paidAmount,
              method,
              paidAt: (paymentStatus === "PAID"
                ? endsAt
                : new Date(appointment.createdAt)
              ).toISOString(),
            });
          }

          if (status === "COMPLETED" && random.chance(0.42)) {
            reviews.push({
              id: random.uuid(),
              appointmentId: appointment.id,
              clientId: client.id,
              rating: random.weighted([
                [5, 62],
                [4, 24],
                [3, 8],
                [2, 4],
                [1, 2],
              ]),
              comment: random.pick([
                "Atendimento impecável, saí super satisfeita.",
                "Pontual e caprichoso. Voltarei com certeza.",
                "Gostei bastante, só achei a espera um pouco longa.",
                "Resultado ficou exatamente como eu queria.",
                "Ambiente agradável e equipe muito atenciosa.",
                "",
              ]),
              createdAt: addDays(endsAt, random.int(0, 3)).toISOString(),
            });
          }

          cursor = addMinutes(endsAt, random.int(0, 4) * 15);
        }
      }
    }
  }

  /* ----------- agendamentos garantidos para as contas da demo ------------- */
  ensureDemoAppointments({
    random,
    appointments,
    services,
    professionals,
    rooms,
    units,
    now,
    today,
  });

  /* ------------------------------ bloqueios ------------------------------- */
  const blockedPro = professionals[0];
  scheduleBlocks.push({
    id: random.uuid(),
    unitId: blockedPro.unitId,
    professionalId: blockedPro.id,
    startsAt: parseTime(addDays(today, 3), "16:00").toISOString(),
    endsAt: parseTime(addDays(today, 3), "18:00").toISOString(),
    reason: "Reunião de equipe",
  });
  scheduleBlocks.push({
    id: random.uuid(),
    unitId: units[1].id,
    professionalId: null,
    roomId: rooms.find((room) => room.unitId === units[1].id && room.type === "EQUIPMENT")?.id,
    startsAt: parseTime(addDays(today, 6), "09:00").toISOString(),
    endsAt: parseTime(addDays(today, 6), "12:00").toISOString(),
    reason: "Manutenção preventiva do laser",
  });

  /* --------------------------- lista de espera ---------------------------- */
  for (const client of random.sample(clients, 6)) {
    // Só serviços que alguém executa: um serviço sem profissional habilitado
    // não pode virar entrada de lista de espera com preferência de pessoa.
    const available = services.filter(
      (service) =>
        service.unitId === client.unitId &&
        service.active &&
        service.professionalIds.length > 0,
    );
    if (available.length === 0) continue;
    const service = random.pick(available);
    waitlist.push({
      id: random.uuid(),
      unitId: client.unitId,
      clientId: client.id,
      serviceId: service.id,
      professionalId: random.chance(0.5) ? random.pick(service.professionalIds) : undefined,
      preferredWindow: random.weighted([
        ["ANY", 3],
        ["MORNING", 3],
        ["AFTERNOON", 3],
        ["EVENING", 2],
      ]),
      notes: random.pick([
        "Avisar se abrir vaga nesta semana.",
        "Só consegue depois das 18h.",
        "Pode vir com 1h de aviso.",
        "",
      ]),
      status: random.weighted([
        ["WAITING", 6],
        ["OFFERED", 2],
        ["BOOKED", 1],
        ["DROPPED", 1],
      ]),
      createdAt: addDays(today, -random.int(0, 14)).toISOString(),
    });
  }

  /* ----------------------- caixa de saída de mensagens -------------------- */
  const upcoming = appointments
    .filter((appointment) => new Date(appointment.startsAt) > now)
    .slice(0, 40);
  const past = appointments
    .filter((appointment) => new Date(appointment.startsAt) <= now)
    .slice(-30);

  for (const appointment of upcoming) {
    for (const [template, offsetHours] of [
      ["REMINDER_48H", 48],
      ["REMINDER_24H", 24],
    ] as const) {
      const scheduledFor = addMinutes(
        new Date(appointment.startsAt),
        -offsetHours * 60,
      );
      notifications.push({
        id: random.uuid(),
        unitId: appointment.unitId,
        recipientId: appointment.clientId,
        appointmentId: appointment.id,
        channel: "WHATSAPP",
        template,
        body: "",
        status: scheduledFor < now ? "SENT" : "SCHEDULED",
        scheduledFor: scheduledFor.toISOString(),
        sentAt: scheduledFor < now ? scheduledFor.toISOString() : null,
      });
    }
  }

  for (const appointment of past) {
    notifications.push({
      id: random.uuid(),
      unitId: appointment.unitId,
      recipientId: appointment.clientId,
      appointmentId: appointment.id,
      channel: random.weighted([
        ["WHATSAPP", 8],
        ["EMAIL", 2],
      ]),
      template: appointment.status === "COMPLETED" ? "REVIEW_REQUEST" : "CANCELLATION",
      body: "",
      status: random.weighted([
        ["SENT", 9],
        ["FAILED", 1],
      ]),
      scheduledFor: appointment.endsAt,
      sentAt: appointment.endsAt,
    });
  }

  appointments.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return {
    appointments,
    payments,
    reviews,
    clientPackages,
    notifications,
    waitlist,
    scheduleBlocks,
  };
}

/**
 * Garante que a conta de cliente e a de profissional da demo tenham sempre
 * um próximo atendimento visível, mesmo que o sorteio não tenha produzido um.
 */
function ensureDemoAppointments(input: {
  random: Random;
  appointments: Appointment[];
  services: Service[];
  professionals: Professional[];
  rooms: Room[];
  units: Unit[];
  now: Date;
  today: Date;
}): void {
  const { random, appointments, services, professionals, rooms, units, now, today } =
    input;

  const ana = professionals.find((pro) => pro.id === DEMO_IDS.professionalAna);
  if (!ana) return;

  const anaServices = services.filter((service) =>
    ana.serviceIds.includes(service.id),
  );
  if (anaServices.length === 0) return;

  const place = (dayOffset: number, time: string, serviceIndex: number) => {
    const service = anaServices[serviceIndex % anaServices.length];
    const [hours, minutes] = time.split(":").map(Number);
    const startsAt = set(addDays(today, dayOffset), {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });
    if (startsAt <= now) return;

    // não empilhar sobre um atendimento já existente da Ana
    const endsAt = addMinutes(
      startsAt,
      service.durationMinutes + service.bufferMinutes,
    );
    const conflict = appointments.some(
      (item) =>
        item.professionalId === ana.id &&
        item.status !== "CANCELLED" &&
        new Date(item.startsAt) < endsAt &&
        new Date(item.endsAt) > startsAt,
    );
    if (conflict) return;

    appointments.push({
      id: random.uuid(),
      unitId: ana.unitId,
      clientId: DEMO_IDS.clientGabriel,
      professionalId: ana.id,
      serviceId: service.id,
      roomId:
        service.requiresRoom && service.roomIds.length > 0
          ? rooms.find((room) => room.id === service.roomIds[0])?.id
          : undefined,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: dayOffset <= 1 ? "CONFIRMED" : "SCHEDULED",
      price: service.price,
      paymentStatus: "PENDING",
      notes: "Agendado pelo app.",
      createdBy: DEMO_IDS.userClient,
      source: "ONLINE",
      createdAt: addDays(now, -2).toISOString(),
    });
  };

  // Um hoje/amanhã e outro na semana seguinte.
  const nextBusinessOffset = (() => {
    for (let offset = 0; offset <= 7; offset += 1) {
      const day = addDays(today, offset);
      const grid = ana.workingHours.find((item) => item.weekday === day.getDay());
      if (grid?.enabled) return offset;
    }
    return 1;
  })();

  place(nextBusinessOffset, "16:30", 0);
  place(nextBusinessOffset + 7, "10:00", 1);

  // Atendimentos passados do cliente da demo, para o histórico não ficar vazio.
  const unit = units[0];
  for (let i = 1; i <= 5; i += 1) {
    const service = anaServices[i % anaServices.length];
    const startsAt = set(addDays(today, -i * 21), {
      hours: 10,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });
    appointments.push({
      id: random.uuid(),
      unitId: unit.id,
      clientId: DEMO_IDS.clientGabriel,
      professionalId: ana.id,
      serviceId: service.id,
      roomId:
        service.requiresRoom && service.roomIds.length > 0
          ? service.roomIds[0]
          : undefined,
      startsAt: startsAt.toISOString(),
      endsAt: addMinutes(
        startsAt,
        service.durationMinutes + service.bufferMinutes,
      ).toISOString(),
      status: i === 4 ? "NO_SHOW" : "COMPLETED",
      price: service.price,
      paymentStatus: i === 4 ? "PENDING" : "PAID",
      paymentMethod: i === 4 ? undefined : "PIX",
      notes: "",
      createdBy: DEMO_IDS.userClient,
      source: "ONLINE",
      createdAt: addDays(startsAt, -5).toISOString(),
      professionalNotes: i === 4 ? undefined : "Atendimento sem intercorrências.",
    });
  }
}
