import { addDays, formatISO, startOfDay } from "date-fns";

import type {
  BusinessHours,
  Company,
  Holiday,
  MessageTemplate,
  Package,
  Professional,
  Room,
  Service,
  Settings,
  Unit,
  User,
  Weekday,
  WorkingHours,
} from "@/types";

import type { Random } from "./rng";

/** Ids fixos: a demo precisa de credenciais estáveis e links previsíveis. */
export const DEMO_IDS = {
  company: "11111111-1111-4111-8111-111111111111",
  unitCentro: "22222222-2222-4222-8222-222222222221",
  unitJardins: "22222222-2222-4222-8222-222222222222",
  userAdmin: "33333333-3333-4333-8333-333333333331",
  userPro: "33333333-3333-4333-8333-333333333332",
  userClient: "33333333-3333-4333-8333-333333333333",
  professionalAna: "44444444-4444-4444-8444-444444444441",
  clientGabriel: "55555555-5555-4555-8555-555555555551",
} as const;

export const COMPANY_SLUG = "clinica-lumiere";

export function buildCompany(): Company {
  return {
    id: DEMO_IDS.company,
    name: "Clínica Lumière",
    slug: COMPANY_SLUG,
    segment: "AESTHETIC",
    logoUrl: null,
  };
}

/** Segunda a sexta 9h–19h com intervalo, sábado 9h–17h, domingo fechado. */
function standardHours(overrides?: Partial<BusinessHours>[]): BusinessHours[] {
  const base: BusinessHours[] = [
    { weekday: 0, openTime: "09:00", closeTime: "13:00", closed: true },
    {
      weekday: 1,
      openTime: "09:00",
      closeTime: "19:00",
      breakStart: "12:30",
      breakEnd: "13:30",
      closed: false,
    },
    {
      weekday: 2,
      openTime: "09:00",
      closeTime: "19:00",
      breakStart: "12:30",
      breakEnd: "13:30",
      closed: false,
    },
    {
      weekday: 3,
      openTime: "09:00",
      closeTime: "19:00",
      breakStart: "12:30",
      breakEnd: "13:30",
      closed: false,
    },
    {
      weekday: 4,
      openTime: "09:00",
      closeTime: "20:00",
      breakStart: "12:30",
      breakEnd: "13:30",
      closed: false,
    },
    {
      weekday: 5,
      openTime: "09:00",
      closeTime: "20:00",
      breakStart: "12:30",
      breakEnd: "13:30",
      closed: false,
    },
    { weekday: 6, openTime: "09:00", closeTime: "17:00", closed: false },
  ];
  if (!overrides) return base;
  return base.map((hours) => {
    const patch = overrides.find((item) => item.weekday === hours.weekday);
    return patch ? { ...hours, ...patch } : hours;
  });
}

export function buildUnits(): Unit[] {
  return [
    {
      id: DEMO_IDS.unitCentro,
      companyId: DEMO_IDS.company,
      name: "Unidade Centro",
      address: "Rua Marechal Deodoro, 482 — Centro, Curitiba/PR",
      phone: "4132145588",
      whatsapp: "41991234567",
      businessHours: standardHours(),
    },
    {
      id: DEMO_IDS.unitJardins,
      companyId: DEMO_IDS.company,
      name: "Unidade Jardins",
      address: "Av. Sete de Setembro, 3011 — Batel, Curitiba/PR",
      phone: "4133671020",
      whatsapp: "41998887766",
      businessHours: standardHours([
        { weekday: 1, openTime: "10:00", closeTime: "20:00" },
        { weekday: 6, openTime: "09:00", closeTime: "15:00" },
      ]),
    },
  ];
}

export function buildHolidays(random: Random, units: Unit[]): Holiday[] {
  const today = startOfDay(new Date());
  const dates = [
    { offset: 12, name: "Feriado municipal" },
    { offset: 27, name: "Confraternização da equipe" },
    { offset: -18, name: "Feriado nacional" },
  ];
  return units.flatMap((unit) =>
    dates.map(({ offset, name }) => ({
      id: random.uuid(),
      unitId: unit.id,
      date: formatISO(addDays(today, offset), { representation: "date" }),
      name,
    })),
  );
}

export function buildRooms(random: Random, units: Unit[]): Room[] {
  const layout: { name: string; type: Room["type"] }[] = [
    { name: "Sala Facial 1", type: "ROOM" },
    { name: "Sala Facial 2", type: "ROOM" },
    { name: "Sala Corporal 1", type: "ROOM" },
    { name: "Sala Corporal 2", type: "ROOM" },
    { name: "Sala de Massagem", type: "ROOM" },
    { name: "Consultório de Avaliação", type: "ROOM" },
    { name: "Cabine Express", type: "CHAIR" },
    { name: "Laser Diodo", type: "EQUIPMENT" },
    { name: "Criolipólise", type: "EQUIPMENT" },
  ];
  return units.flatMap((unit) =>
    layout.map((room) => ({
      id: random.uuid(),
      unitId: unit.id,
      name: room.name,
      type: room.type,
    })),
  );
}

interface ServiceBlueprint {
  name: string;
  description: string;
  category: Service["category"];
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  requiresRoom: boolean;
  roomMatch?: RegExp;
}

/** Catálogo da clínica: estética facial, estética corporal e bem-estar. */
const SERVICE_BLUEPRINTS: ServiceBlueprint[] = [
  // Estética facial
  { name: "Avaliação estética", description: "Consulta inicial com análise de pele e plano de tratamento.", category: "SKIN", durationMinutes: 40, bufferMinutes: 10, price: 80, requiresRoom: true, roomMatch: /Consultório/ },
  { name: "Limpeza de pele", description: "Extração, alta frequência e máscara calmante.", category: "SKIN", durationMinutes: 70, bufferMinutes: 15, price: 180, requiresRoom: true, roomMatch: /Sala Facial/ },
  { name: "Procedimento facial", description: "Protocolo de revitalização com ativos e máscara final.", category: "SKIN", durationMinutes: 60, bufferMinutes: 15, price: 240, requiresRoom: true, roomMatch: /Sala Facial/ },
  { name: "Peeling de diamante", description: "Esfoliação mecânica com ativos clareadores.", category: "SKIN", durationMinutes: 60, bufferMinutes: 15, price: 220, requiresRoom: true, roomMatch: /Sala Facial/ },
  { name: "Microagulhamento facial", description: "Indução percutânea de colágeno.", category: "SKIN", durationMinutes: 80, bufferMinutes: 20, price: 340, requiresRoom: true, roomMatch: /Sala Facial/ },
  { name: "Radiofrequência facial", description: "Estímulo de colágeno com aquecimento controlado.", category: "SKIN", durationMinutes: 50, bufferMinutes: 10, price: 260, requiresRoom: true, roomMatch: /Sala Facial/ },
  { name: "Hidratação facial", description: "Máscara nutritiva com ácido hialurônico.", category: "SKIN", durationMinutes: 45, bufferMinutes: 10, price: 160, requiresRoom: true, roomMatch: /Sala Facial/ },
  { name: "Revitalização com skinbooster", description: "Microinfusão de ativos hidratantes.", category: "SKIN", durationMinutes: 60, bufferMinutes: 20, price: 490, requiresRoom: true, roomMatch: /Sala Facial/ },
  { name: "Retorno pós-procedimento", description: "Reavaliação rápida após o protocolo.", category: "SKIN", durationMinutes: 20, bufferMinutes: 5, price: 60, requiresRoom: true, roomMatch: /Consultório/ },
  // Estética corporal
  { name: "Drenagem linfática", description: "Sessão manual de 60 minutos.", category: "BODY", durationMinutes: 60, bufferMinutes: 10, price: 160, requiresRoom: true, roomMatch: /Sala Corporal/ },
  { name: "Massagem modeladora", description: "Manobras firmes para contorno corporal.", category: "BODY", durationMinutes: 60, bufferMinutes: 10, price: 180, requiresRoom: true, roomMatch: /Sala Corporal/ },
  { name: "Radiofrequência corporal", description: "Tratamento de flacidez em área localizada.", category: "BODY", durationMinutes: 50, bufferMinutes: 15, price: 240, requiresRoom: true, roomMatch: /Sala Corporal/ },
  { name: "Detox corporal com argila", description: "Esfoliação, argila e envolvimento térmico.", category: "BODY", durationMinutes: 70, bufferMinutes: 15, price: 210, requiresRoom: true, roomMatch: /Sala Corporal/ },
  { name: "Criolipólise", description: "Sessão de congelamento de gordura localizada.", category: "BODY", durationMinutes: 60, bufferMinutes: 20, price: 690, requiresRoom: true, roomMatch: /Criolipólise/ },
  { name: "Depilação a laser — axilas", description: "Sessão com laser de diodo.", category: "BODY", durationMinutes: 30, bufferMinutes: 10, price: 150, requiresRoom: true, roomMatch: /Laser/ },
  { name: "Depilação a laser — pernas", description: "Sessão completa com laser de diodo.", category: "BODY", durationMinutes: 50, bufferMinutes: 10, price: 320, requiresRoom: true, roomMatch: /Laser/ },
  // Bem-estar
  { name: "Massagem relaxante", description: "Sessão de relaxamento com óleos essenciais.", category: "WELLNESS", durationMinutes: 60, bufferMinutes: 10, price: 170, requiresRoom: true, roomMatch: /Massagem/ },
  { name: "Reflexologia podal", description: "Estímulo de pontos reflexos dos pés.", category: "WELLNESS", durationMinutes: 50, bufferMinutes: 10, price: 140, requiresRoom: true, roomMatch: /Massagem/ },
  { name: "Ritual de aromaterapia", description: "Massagem longa com blend aromático.", category: "WELLNESS", durationMinutes: 90, bufferMinutes: 15, price: 280, requiresRoom: true, roomMatch: /Massagem/ },
  { name: "Design de sobrancelhas", description: "Modelagem com pinça e acabamento.", category: "WELLNESS", durationMinutes: 30, bufferMinutes: 5, price: 70, requiresRoom: true, roomMatch: /Cabine/ },
];

/** Combos: serviços compostos cuja duração é a soma dos itens. */
const COMBO_BLUEPRINTS: {
  name: string;
  description: string;
  category: Service["category"];
  items: string[];
  price: number;
}[] = [
  {
    name: "Protocolo Facial Completo",
    description: "Limpeza de pele seguida de hidratação facial na mesma sessão.",
    category: "SKIN",
    items: ["Limpeza de pele", "Hidratação facial"],
    price: 290,
  },
  {
    name: "Ritual Corpo & Mente",
    description: "Drenagem linfática e massagem relaxante em sequência.",
    category: "BODY",
    items: ["Drenagem linfática", "Massagem relaxante"],
    price: 280,
  },
];

export function buildServices(
  random: Random,
  units: Unit[],
  rooms: Room[],
): Service[] {
  const services: Service[] = [];

  for (const unit of units) {
    const unitRooms = rooms.filter((room) => room.unitId === unit.id);
    const byName = new Map<string, Service>();

    for (const blueprint of SERVICE_BLUEPRINTS) {
      const matching = blueprint.roomMatch
        ? unitRooms.filter((room) => blueprint.roomMatch!.test(room.name))
        : [];
      const service: Service = {
        id: random.uuid(),
        unitId: unit.id,
        name: blueprint.name,
        description: blueprint.description,
        category: blueprint.category,
        durationMinutes: blueprint.durationMinutes,
        bufferMinutes: blueprint.bufferMinutes,
        price: blueprint.price,
        professionalIds: [],
        requiresRoom: blueprint.requiresRoom,
        roomIds: matching.map((room) => room.id),
        active: true,
      };
      byName.set(blueprint.name, service);
      services.push(service);
    }

    for (const combo of COMBO_BLUEPRINTS) {
      const items = combo.items
        .map((name) => byName.get(name))
        .filter((item): item is Service => Boolean(item));
      const comboService: Service = {
        id: random.uuid(),
        unitId: unit.id,
        name: combo.name,
        description: combo.description,
        category: combo.category,
        durationMinutes: items.reduce((sum, i) => sum + i.durationMinutes, 0),
        bufferMinutes: 10,
        price: combo.price,
        professionalIds: [],
        requiresRoom: items.some((i) => i.requiresRoom),
        roomIds: Array.from(new Set(items.flatMap((i) => i.roomIds))),
        active: true,
        comboServiceIds: items.map((i) => i.id),
      };
      services.push(comboService);
    }
  }

  return services;
}

/** Grade padrão de trabalho do profissional. */
function workingHours(
  days: Weekday[],
  startTime: string,
  endTime: string,
  withBreak = true,
): WorkingHours[] {
  return ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({
    weekday,
    startTime,
    endTime,
    breakStart: withBreak ? "12:30" : undefined,
    breakEnd: withBreak ? "13:30" : undefined,
    enabled: days.includes(weekday),
  }));
}

interface ProfessionalBlueprint {
  name: string;
  email: string;
  specialty: string;
  unitIndex: 0 | 1;
  categories: Service["category"][];
  days: Weekday[];
  startTime: string;
  endTime: string;
  commissionRate: number;
}

const PROFESSIONAL_BLUEPRINTS: ProfessionalBlueprint[] = [
  {
    name: "Ana Souza",
    email: "pro@demo.com",
    specialty: "Esteticista facial",
    unitIndex: 0,
    categories: ["SKIN"],
    days: [1, 2, 3, 4, 5, 6],
    startTime: "09:00",
    endTime: "19:00",
    commissionRate: 0.4,
  },
  {
    name: "Bruno Ferraz",
    email: "bruno.ferraz@clinicalumiere.com.br",
    specialty: "Massoterapeuta",
    unitIndex: 0,
    categories: ["WELLNESS"],
    days: [2, 3, 4, 5, 6],
    startTime: "10:00",
    endTime: "20:00",
    commissionRate: 0.45,
  },
  {
    name: "Carla Mendes",
    email: "carla.mendes@clinicalumiere.com.br",
    specialty: "Biomédica esteta",
    unitIndex: 0,
    categories: ["SKIN", "BODY"],
    days: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "18:00",
    commissionRate: 0.35,
  },
  {
    name: "Diego Nakamura",
    email: "diego.nakamura@clinicalumiere.com.br",
    specialty: "Fisioterapeuta dermatofuncional",
    unitIndex: 1,
    categories: ["BODY"],
    days: [1, 2, 3, 4, 5],
    startTime: "08:00",
    endTime: "17:00",
    commissionRate: 0.5,
  },
  {
    name: "Elisa Prado",
    email: "elisa.prado@clinicalumiere.com.br",
    specialty: "Esteticista corporal",
    unitIndex: 1,
    categories: ["BODY", "SKIN"],
    days: [1, 3, 4, 5, 6],
    startTime: "09:00",
    endTime: "18:00",
    commissionRate: 0.38,
  },
  {
    name: "Felipe Moura",
    email: "felipe.moura@clinicalumiere.com.br",
    specialty: "Terapeuta corporal",
    unitIndex: 1,
    categories: ["WELLNESS", "BODY"],
    days: [2, 3, 4, 5, 6],
    startTime: "10:00",
    endTime: "20:00",
    commissionRate: 0.42,
  },
];

export interface ProfessionalSeed {
  users: User[];
  professionals: Professional[];
}

export function buildProfessionals(
  random: Random,
  units: Unit[],
  services: Service[],
): ProfessionalSeed {
  const users: User[] = [];
  const professionals: Professional[] = [];

  PROFESSIONAL_BLUEPRINTS.forEach((blueprint, index) => {
    const unit = units[blueprint.unitIndex];
    const isAna = blueprint.email === "pro@demo.com";
    const userId = isAna ? DEMO_IDS.userPro : random.uuid();
    const professionalId = isAna ? DEMO_IDS.professionalAna : random.uuid();

    users.push({
      id: userId,
      name: blueprint.name,
      email: blueprint.email,
      avatarUrl: null,
      role: "PROFESSIONAL",
      companyId: DEMO_IDS.company,
      unitId: unit.id,
    });

    const eligible = services.filter(
      (service) =>
        service.unitId === unit.id &&
        blueprint.categories.includes(service.category),
    );

    professionals.push({
      id: professionalId,
      unitId: unit.id,
      userId,
      name: blueprint.name,
      avatarUrl: null,
      specialty: blueprint.specialty,
      serviceIds: eligible.map((service) => service.id),
      workingHours: workingHours(
        blueprint.days,
        blueprint.startTime,
        blueprint.endTime,
        index % 3 !== 2,
      ),
      timeOff: [],
      commissionRate: blueprint.commissionRate,
      active: true,
    });
  });

  // vínculo inverso: quais profissionais atendem cada serviço
  for (const service of services) {
    service.professionalIds = professionals
      .filter((pro) => pro.serviceIds.includes(service.id))
      .map((pro) => pro.id);
  }

  return { users, professionals };
}

/** Férias e folgas pontuais para a agenda ter buracos realistas. */
export function assignTimeOff(random: Random, professionals: Professional[]): void {
  const today = startOfDay(new Date());
  const iso = (date: Date) => formatISO(date, { representation: "date" });

  professionals.forEach((pro, index) => {
    if (index === 1) {
      pro.timeOff.push({
        id: random.uuid(),
        professionalId: pro.id,
        type: "VACATION",
        status: "APPROVED",
        startDate: iso(addDays(today, 14)),
        endDate: iso(addDays(today, 21)),
        allDay: true,
        reason: "Férias programadas",
      });
    }
    if (index === 3) {
      pro.timeOff.push({
        id: random.uuid(),
        professionalId: pro.id,
        type: "DAY_OFF",
        status: "APPROVED",
        startDate: iso(addDays(today, 5)),
        endDate: iso(addDays(today, 5)),
        allDay: true,
        reason: "Congresso de estética avançada",
      });
    }
    if (index === 0) {
      pro.timeOff.push({
        id: random.uuid(),
        professionalId: pro.id,
        type: "BLOCK",
        status: "APPROVED",
        startDate: iso(addDays(today, 2)),
        endDate: iso(addDays(today, 2)),
        startTime: "15:00",
        endTime: "17:00",
        allDay: false,
        reason: "Curso de protocolos faciais",
      });
      pro.timeOff.push({
        id: random.uuid(),
        professionalId: pro.id,
        type: "DAY_OFF",
        status: "PENDING",
        startDate: iso(addDays(today, 24)),
        endDate: iso(addDays(today, 24)),
        allDay: true,
        reason: "Compromisso pessoal",
      });
    }
  });
}

export function buildPackages(
  random: Random,
  units: Unit[],
  services: Service[],
): Package[] {
  const packageable = [
    { serviceName: "Depilação a laser — axilas", sessions: 10, discount: 0.2 },
    { serviceName: "Limpeza de pele", sessions: 5, discount: 0.15 },
    { serviceName: "Drenagem linfática", sessions: 10, discount: 0.22 },
    { serviceName: "Massagem relaxante", sessions: 4, discount: 0.12 },
    { serviceName: "Microagulhamento facial", sessions: 4, discount: 0.18 },
  ];

  return units.flatMap((unit) =>
    packageable.flatMap(({ serviceName, sessions, discount }) => {
      const service = services.find(
        (item) => item.unitId === unit.id && item.name === serviceName,
      );
      if (!service) return [];
      return [
        {
          id: random.uuid(),
          unitId: unit.id,
          name: `${serviceName} — ${sessions} sessões`,
          serviceId: service.id,
          totalSessions: sessions,
          price: Math.round(service.price * sessions * (1 - discount)),
          validityDays: 365,
          active: true,
        } satisfies Package,
      ];
    }),
  );
}

export function buildMessageTemplates(
  random: Random,
  units: Unit[],
): MessageTemplate[] {
  const templates: Omit<MessageTemplate, "id" | "unitId">[] = [
    {
      key: "REMINDER_48H",
      channel: "WHATSAPP",
      offsetHours: 48,
      enabled: true,
      body: "Oi {{cliente}}! Passando para lembrar do seu {{servico}} com {{profissional}} em {{data}} às {{hora}}, na {{unidade}}. Podemos confirmar?",
    },
    {
      key: "REMINDER_24H",
      channel: "WHATSAPP",
      offsetHours: 24,
      enabled: true,
      body: "{{cliente}}, seu horário é amanhã às {{hora}} ({{servico}} com {{profissional}}). Responda SIM para confirmar ou NÃO para remarcar.",
    },
    {
      key: "REMINDER_2H",
      channel: "WHATSAPP",
      offsetHours: 2,
      enabled: true,
      body: "Tudo certo, {{cliente}}? Seu {{servico}} começa às {{hora}}. Estamos te esperando na {{unidade}}!",
    },
    {
      key: "CONFIRMATION",
      channel: "WHATSAPP",
      offsetHours: null,
      enabled: true,
      body: "Agendamento confirmado, {{cliente}}! {{servico}} com {{profissional}} em {{data}} às {{hora}}. Valor: {{valor}}.",
    },
    {
      key: "CANCELLATION",
      channel: "WHATSAPP",
      offsetHours: null,
      enabled: true,
      body: "{{cliente}}, seu {{servico}} de {{data}} às {{hora}} foi cancelado. Quer remarcar? É só responder por aqui.",
    },
    {
      key: "REVIEW_REQUEST",
      channel: "WHATSAPP",
      offsetHours: null,
      enabled: true,
      body: "{{cliente}}, como foi seu atendimento com {{profissional}}? Avalie em 1 minuto e nos ajude a melhorar.",
    },
    {
      key: "BIRTHDAY",
      channel: "EMAIL",
      offsetHours: null,
      enabled: false,
      body: "Feliz aniversário, {{cliente}}! Preparamos um mimo para você na {{unidade}} neste mês.",
    },
    {
      key: "WAITLIST_OFFER",
      channel: "WHATSAPP",
      offsetHours: null,
      enabled: true,
      body: "Boa notícia, {{cliente}}! Abriu uma vaga de {{servico}} em {{data}} às {{hora}}. Quer garantir?",
    },
  ];

  return units.flatMap((unit) =>
    templates.map((template) => ({
      ...template,
      id: random.uuid(),
      unitId: unit.id,
    })),
  );
}

export function buildSettings(): Settings {
  return {
    companyId: DEMO_IDS.company,
    cancellationPolicy: {
      minHoursBefore: 12,
      lateFeeRate: 0.5,
      allowRescheduleInstead: true,
      description:
        "Cancelamentos com menos de 12 horas de antecedência podem gerar cobrança de 50% do valor do serviço. Reagendar dentro do mesmo mês não gera cobrança.",
    },
    depositPolicy: {
      enabled: true,
      rate: 0.3,
      minServicePrice: 250,
      requireForNoShowRisk: true,
    },
    noShowPolicy: {
      enabled: true,
      maxNoShows: 3,
      windowDays: 180,
      action: "REQUIRE_DEPOSIT",
    },
    bookingRules: {
      minAdvanceMinutes: 120,
      maxAdvanceDays: 60,
      slotIntervalMinutes: 15,
      allowOverbooking: true,
    },
    appearance: {
      primaryColor: "#7d4648",
      logoUrl: null,
      displayName: "Clínica Lumière",
    },
    permissions: {
      ADMIN: {
        dashboard: ["read", "write"],
        agenda: ["read", "write"],
        appointments: ["read", "write"],
        clients: ["read", "write"],
        services: ["read", "write"],
        professionals: ["read", "write"],
        finance: ["read", "write"],
        reports: ["read", "write"],
        communication: ["read", "write"],
        settings: ["read", "write"],
      },
      PROFESSIONAL: {
        dashboard: [],
        agenda: ["read", "write"],
        appointments: ["read", "write"],
        clients: ["read"],
        services: ["read"],
        professionals: [],
        finance: [],
        reports: [],
        communication: [],
        settings: [],
      },
      CLIENT: {
        dashboard: [],
        agenda: [],
        appointments: ["read", "write"],
        clients: [],
        services: ["read"],
        professionals: ["read"],
        finance: [],
        reports: [],
        communication: [],
        settings: [],
      },
    },
    enabledSegmentModules: ["AESTHETIC"],
  };
}
