import { buildCompany, buildRooms, buildServices, buildUnits } from "@/data/seed/organization";
import { createRandom, DEMO_SEED } from "@/data/seed/rng";
import type { Service, Unit } from "@/types";

/**
 * Conteúdo da página de apresentação.
 *
 * A vitrine não conversa com o `localStorage` — ela é renderizada no servidor,
 * antes de qualquer hidratação. Para não duplicar preços e endereços, o que
 * ela mostra vem das mesmas funções puras que montam o seed: `buildUnits` e
 * `buildServices` não dependem de `Date`, então a saída é idêntica no servidor
 * e no cliente. Mudou o catálogo da demonstração, mudou a vitrine junto.
 */

const random = createRandom(DEMO_SEED);

export const clinic = buildCompany();

const units = buildUnits();
const rooms = buildRooms(random, units);
const services = buildServices(random, units, rooms);

/** Unidade principal — a que aparece no bloco de contato. */
export const mainUnit: Unit = units[0];
export const allUnits: Unit[] = units;

function serviceByName(name: string): Service {
  const service = services.find(
    (item) => item.unitId === mainUnit.id && item.name === name,
  );
  if (!service) throw new Error(`Serviço "${name}" não existe no catálogo da demo.`);
  return service;
}

export interface ShowcaseService {
  service: Service;
  /** Foto do procedimento, em `public/images`. */
  image: string;
  /** Texto alternativo — descreve a cena, não o serviço. */
  alt: string;
}

/**
 * Os seis procedimentos que a vitrine destaca. A ordem importa: começa pelo
 * carro-chefe e termina nos tratamentos de manutenção.
 */
export const showcaseServices: ShowcaseService[] = [
  {
    service: serviceByName("Limpeza de pele"),
    image: "/images/servico-limpeza-de-pele.jpg",
    alt: "Esteticista aplicando máscara facial em uma cliente deitada na maca",
  },
  {
    service: serviceByName("Procedimento facial"),
    image: "/images/servico-procedimento-facial.jpg",
    alt: "Profissional usando aparelho de tratamento facial em sala clara de clínica",
  },
  {
    service: serviceByName("Massagem relaxante"),
    image: "/images/servico-massagem-relaxante.jpg",
    alt: "Mãos de massoterapeuta durante uma massagem nas costas",
  },
  {
    service: serviceByName("Drenagem linfática"),
    image: "/images/servico-drenagem-linfatica.jpg",
    alt: "Sessão de drenagem linfática em ambiente tranquilo",
  },
  {
    service: serviceByName("Avaliação estética"),
    image: "/images/servico-avaliacao-estetica.jpg",
    alt: "Profissional realizando análise de pele em consultório com equipamento",
  },
  {
    service: serviceByName("Depilação a laser — axilas"),
    image: "/images/ambiente-sala-de-atendimento.jpg",
    alt: "Sala de atendimento de clínica de estética com maca e equipamentos",
  },
];

/** Números de vitrine — fictícios, coerentes com o porte da clínica da demo. */
export const clinicHighlights = [
  { value: "12 anos", label: "cuidando de pele e bem-estar" },
  { value: `${units.length} unidades`, label: "em Curitiba" },
  { value: "4,9", label: "média das avaliações" },
];
