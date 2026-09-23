import { addDays, startOfDay } from "date-fns";

import type {
  Appointment,
  Client,
  Contraindication,
  EvolutionRecord,
  Professional,
  Quote,
  Service,
  TreatmentPlan,
  TreatmentStep,
} from "@/types";

import type { Random } from "./rng";

interface Context {
  random: Random;
  clients: Client[];
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
}

export interface SegmentSeed {
  evolutionRecords: EvolutionRecord[];
  contraindications: Contraindication[];
  treatmentPlans: TreatmentPlan[];
  quotes: Quote[];
}

const CONTRAINDICATION_LABELS: [string, Contraindication["severity"]][] = [
  ["Gestação", "HIGH"],
  ["Uso de isotretinoína", "HIGH"],
  ["Alergia a lidocaína", "HIGH"],
  ["Hipertensão controlada", "MEDIUM"],
  ["Dermatite atópica", "MEDIUM"],
  ["Pele fototipo VI", "LOW"],
  ["Uso de ácido no último mês", "LOW"],
];

const TREATMENT_TITLES = [
  "Protocolo facial — manchas e textura",
  "Protocolo corporal — flacidez",
  "Plano de depilação a laser",
  "Protocolo de rejuvenescimento",
];

const STEP_TITLES = [
  "Avaliação e fotografia inicial",
  "Sessão de limpeza preparatória",
  "Aplicação do protocolo principal",
  "Sessão de manutenção",
  "Home care orientado",
  "Reavaliação com comparativo",
  "Alta do protocolo",
];

export function buildSegmentData(context: Context): SegmentSeed {
  const { random, clients, appointments, professionals, services } = context;
  const today = startOfDay(new Date());

  const evolutionRecords: EvolutionRecord[] = [];
  const contraindications: Contraindication[] = [];
  const treatmentPlans: TreatmentPlan[] = [];
  const quotes: Quote[] = [];

  /* ------------------------------ AESTHETIC ------------------------------ */
  const aestheticServiceIds = new Set(
    services
      .filter((service) => service.category === "SKIN" || service.category === "BODY")
      .map((service) => service.id),
  );

  const aestheticDone = appointments.filter(
    (appointment) =>
      appointment.status === "COMPLETED" &&
      aestheticServiceIds.has(appointment.serviceId),
  );

  const sessionCounter = new Map<string, number>();
  for (const appointment of random.sample(aestheticDone, 45)) {
    const key = `${appointment.clientId}|${appointment.serviceId}`;
    const sessionNumber = (sessionCounter.get(key) ?? 0) + 1;
    sessionCounter.set(key, sessionNumber);

    evolutionRecords.push({
      id: random.uuid(),
      clientId: appointment.clientId,
      appointmentId: appointment.id,
      professionalId: appointment.professionalId,
      sessionNumber,
      description: random.pick([
        "Protocolo aplicado conforme planejado. Pele respondeu bem ao ativo.",
        "Reduzida a potência do equipamento por sensibilidade relatada.",
        "Extração completa, sem sangramento. Máscara calmante ao final.",
        "Sessão de manutenção. Manter intervalo de 21 dias.",
      ]),
      reactions: random.pick([
        "Eritema leve, resolvido em 20 minutos.",
        "Sem reações adversas.",
        "Sem reações adversas.",
        "Leve desconforto durante a extração.",
      ]),
      createdAt: appointment.endsAt,
      photos: random.chance(0.55)
        ? [
            { id: random.uuid(), label: "BEFORE", takenAt: appointment.startsAt },
            { id: random.uuid(), label: "AFTER", takenAt: appointment.endsAt },
          ]
        : [],
    });
  }

  for (const client of random.sample(clients, 12)) {
    const [label, severity] = random.pick(CONTRAINDICATION_LABELS);
    contraindications.push({
      id: random.uuid(),
      clientId: client.id,
      label,
      severity,
      notes: random.pick([
        "Informado pelo próprio cliente na anamnese.",
        "Confirmado com atestado apresentado na recepção.",
        "Revisar a cada seis meses.",
        "",
      ]),
    });
  }

  /* ------------------------ PLANOS E ORÇAMENTOS --------------------------- */
  const planLead =
    professionals.find((pro) => pro.specialty.includes("Biomédica")) ??
    professionals[0];
  const planClients = random.sample(clients, 8);

  for (const client of planClients) {
    const stepCount = random.int(3, 5);
    const steps: TreatmentStep[] = Array.from({ length: stepCount }, (_, index) => ({
      id: random.uuid(),
      order: index + 1,
      title: STEP_TITLES[index % STEP_TITLES.length],
      /* Campo herdado do módulo odontológico; na estética não há dente. */
      tooth: "—",
      status:
        index === 0
          ? "DONE"
          : index === 1
            ? random.weighted([
                ["DONE", 4],
                ["IN_PROGRESS", 3],
                ["PENDING", 3],
              ])
            : random.weighted([
                ["PENDING", 6],
                ["IN_PROGRESS", 2],
                ["SKIPPED", 1],
              ]),
      price: random.int(2, 14) * 100,
    }));

    const plan: TreatmentPlan = {
      id: random.uuid(),
      clientId: client.id,
      professionalId: planLead.id,
      title: random.pick(TREATMENT_TITLES),
      createdAt: addDays(today, -random.int(10, 150)).toISOString(),
      steps,
    };
    treatmentPlans.push(plan);

    quotes.push({
      id: random.uuid(),
      clientId: client.id,
      treatmentPlanId: plan.id,
      number: `ORC-${String(quotes.length + 1).padStart(4, "0")}`,
      status: random.weighted([
        ["APPROVED", 5],
        ["PENDING", 3],
        ["REJECTED", 2],
      ]),
      items: steps.map((step) => ({
        id: random.uuid(),
        description: `${step.title}${step.tooth !== "—" ? ` — dente ${step.tooth}` : ""}`,
        quantity: 1,
        unitPrice: step.price,
      })),
      discount: random.chance(0.4) ? random.int(1, 3) * 50 : 0,
      createdAt: plan.createdAt,
      validUntil: addDays(new Date(plan.createdAt), 30).toISOString(),
      attachments: random.chance(0.5)
        ? [
            {
              id: random.uuid(),
              name: "avaliacao-fotografica.pdf",
              mimeType: "application/pdf",
              sizeKb: random.int(220, 1800),
            },
          ]
        : [],
    });
  }

  return { evolutionRecords, contraindications, treatmentPlans, quotes };
}
