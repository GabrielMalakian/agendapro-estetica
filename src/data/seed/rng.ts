/**
 * Gerador pseudoaleatório determinístico.
 *
 * O seed precisa ser reprodutível: a mesma semente sempre produz a mesma base
 * de demonstração, o que evita divergência entre execuções e mantém gráficos e
 * relatórios estáveis entre recarregamentos.
 */

/** mulberry32 — pequeno, rápido e suficiente para dados fictícios. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Random {
  /** Float em [0, 1). */
  next(): number;
  /** Inteiro em [min, max] inclusivo. */
  int(min: number, max: number): number;
  /** Elemento aleatório do array (o array não pode ser vazio). */
  pick<T>(items: readonly T[]): T;
  /** Escolha ponderada: `weighted([["a", 3], ["b", 1]])`. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
  /** `true` com a probabilidade informada (0–1). */
  chance(probability: number): boolean;
  /** Cópia embaralhada do array. */
  shuffle<T>(items: readonly T[]): T[];
  /** Subconjunto aleatório de tamanho `count`. */
  sample<T>(items: readonly T[], count: number): T[];
  /** UUID v4 determinístico (formato válido, valor previsível). */
  uuid(): string;
}

const HEX = "0123456789abcdef";

export function createRandom(seed: number): Random {
  const rng = createRng(seed);

  const int = (min: number, max: number): number =>
    Math.floor(rng() * (max - min + 1)) + min;

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error("createRandom.pick: lista vazia");
    }
    return items[int(0, items.length - 1)];
  };

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  return {
    next: rng,
    int,
    pick,
    shuffle,
    chance: (probability) => rng() < probability,
    weighted: <T,>(entries: readonly (readonly [T, number])[]): T => {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let threshold = rng() * total;
      for (const [value, weight] of entries) {
        threshold -= weight;
        if (threshold <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
    sample: <T,>(items: readonly T[], count: number): T[] =>
      shuffle(items).slice(0, Math.min(count, items.length)),
    uuid: () => {
      let out = "";
      for (let i = 0; i < 32; i += 1) {
        if (i === 12) {
          out += "4";
        } else if (i === 16) {
          out += HEX[(int(0, 15) & 0x3) | 0x8];
        } else {
          out += HEX[int(0, 15)];
        }
        if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
      }
      return out;
    },
  };
}

/** Semente padrão da demo — trocar aqui regenera toda a base fictícia. */
export const DEMO_SEED = 20260920;
