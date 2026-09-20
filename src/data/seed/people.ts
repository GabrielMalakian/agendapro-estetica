import { addDays, formatISO, startOfDay, subDays, subYears } from "date-fns";

import type { Client, ClientTag, Unit, User } from "@/types";

import { DEMO_IDS } from "./organization";
import type { Random } from "./rng";

const FIRST_NAMES = [
  "Amanda", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela",
  "Helena", "Isabela", "Juliana", "Karina", "Larissa", "Mariana", "Natália",
  "Patrícia", "Renata", "Sabrina", "Tatiane", "Vanessa", "Yasmin",
  "André", "Bruno", "Caio", "Diego", "Eduardo", "Fábio", "Gustavo", "Henrique",
  "Igor", "João", "Leonardo", "Marcelo", "Nelson", "Otávio", "Paulo",
  "Rodrigo", "Samuel", "Thiago", "Vinícius", "Wagner",
];

const LAST_NAMES = [
  "Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Figueiredo", "Gonçalves",
  "Henriques", "Iglesias", "Jardim", "Klein", "Lopes", "Martins", "Nogueira",
  "Oliveira", "Pereira", "Queiroz", "Ramos", "Santos", "Teixeira", "Vasconcelos",
];

const STREETS = [
  "Rua das Acácias", "Av. Silva Jardim", "Rua Padre Anchieta", "Rua Bispo Dom José",
  "Av. Iguaçu", "Rua Trajano Reis", "Rua Mateus Leme", "Av. República Argentina",
  "Rua Brigadeiro Franco", "Rua Emiliano Perneta",
];

const NEIGHBORHOODS = [
  "Centro", "Batel", "Água Verde", "Bigorrilho", "Juvevê", "Cabral",
  "Portão", "Rebouças", "Mercês", "Alto da XV",
];

const NOTE_SNIPPETS = [
  "Prefere atendimento no fim da tarde.",
  "Gosta de café sem açúcar na chegada.",
  "Cliente indicada por Mariana Santos.",
  "Sempre traz a filha nas férias escolares.",
  "Costuma remarcar com pouca antecedência.",
  "Trabalha em home office, tem flexibilidade de horário.",
  "",
  "",
];

const HEALTH_SNIPPETS = [
  "Alergia a níquel — evitar alicates não higienizados.",
  "Pele sensível, reage a ácidos em alta concentração.",
  "Uso contínuo de anticoagulante (informado pelo cliente).",
  "Sem restrições relatadas.",
  "Sem restrições relatadas.",
  "Gestante — evitar procedimentos com laser.",
  "",
];

/** Gera um CPF fictício com dígitos verificadores válidos. */
function fakeCpf(random: Random): string {
  const base = Array.from({ length: 9 }, () => random.int(0, 9));
  const digit = (digits: number[]): number => {
    const weightStart = digits.length + 1;
    const sum = digits.reduce(
      (acc, value, index) => acc + value * (weightStart - index),
      0,
    );
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = digit(base);
  const d2 = digit([...base, d1]);
  return [...base, d1, d2].join("");
}

function fakePhone(random: Random): string {
  return `41${random.int(9, 9)}${random.int(10000000, 99999999)}`;
}

export function buildClients(random: Random, units: Unit[]): {
  clients: Client[];
  clientUser: User;
} {
  const today = startOfDay(new Date());
  const clients: Client[] = [];
  const usedNames = new Set<string>();

  const clientUser: User = {
    id: DEMO_IDS.userClient,
    name: "Gabriel Lima",
    email: "cliente@demo.com",
    avatarUrl: null,
    role: "CLIENT",
    companyId: DEMO_IDS.company,
    unitId: units[0].id,
  };

  // Cliente da demo — primeiro da lista, sempre na unidade Centro.
  clients.push({
    id: DEMO_IDS.clientGabriel,
    unitId: units[0].id,
    name: "Gabriel Lima",
    cpf: fakeCpf(random),
    phone: "41996540011",
    whatsapp: "41996540011",
    email: "cliente@demo.com",
    birthDate: formatISO(subYears(subDays(today, 120), 31), {
      representation: "date",
    }),
    address: "Rua Mateus Leme, 1204 — Juvevê, Curitiba/PR",
    notes: "Cliente da demonstração. Prefere sábado de manhã.",
    createdAt: subDays(today, 420).toISOString(),
    tags: ["VIP", "RECORRENTE"],
    healthNotes: "Sem restrições relatadas.",
    notificationPreferences: { whatsapp: true, email: true, push: true },
    userId: clientUser.id,
  });

  while (clients.length < 40) {
    const first = random.pick(FIRST_NAMES);
    const last = random.pick(LAST_NAMES);
    const name = `${first} ${last}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const createdDaysAgo = random.int(3, 900);
    const unit = random.weighted([
      [units[0], 3],
      [units[1], 2],
    ]);

    const tags: ClientTag[] = [];
    if (createdDaysAgo < 45) tags.push("NOVO");
    if (createdDaysAgo > 180 && random.chance(0.45)) tags.push("RECORRENTE");
    if (random.chance(0.12)) tags.push("VIP");
    if (random.chance(0.1)) tags.push("ATRASA");
    if (random.chance(0.15)) tags.push("INDICACAO");

    const slug = `${first}.${last}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

    clients.push({
      id: random.uuid(),
      unitId: unit.id,
      name,
      cpf: fakeCpf(random),
      phone: fakePhone(random),
      whatsapp: fakePhone(random),
      email: `${slug}@exemplo.com.br`,
      birthDate: formatISO(
        subYears(subDays(today, random.int(0, 364)), random.int(19, 62)),
        { representation: "date" },
      ),
      address: `${random.pick(STREETS)}, ${random.int(30, 2400)} — ${random.pick(
        NEIGHBORHOODS,
      )}, Curitiba/PR`,
      notes: random.pick(NOTE_SNIPPETS),
      createdAt: addDays(today, -createdDaysAgo).toISOString(),
      tags,
      healthNotes: random.pick(HEALTH_SNIPPETS),
      notificationPreferences: {
        whatsapp: random.chance(0.92),
        email: random.chance(0.6),
        push: random.chance(0.35),
      },
    });
  }

  return { clients, clientUser };
}

export function buildAdminUser(units: Unit[]): User {
  return {
    id: DEMO_IDS.userAdmin,
    name: "Marina Alves",
    email: "admin@demo.com",
    avatarUrl: null,
    role: "ADMIN",
    companyId: DEMO_IDS.company,
    unitId: units[0].id,
  };
}
