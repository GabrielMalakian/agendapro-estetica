"use client";

/**
 * Troca da cor primária em runtime.
 *
 * A aplicação **não** grava uma cor pronta: extrai matiz e croma da cor
 * escolhida e escreve apenas `--brand-hue` e `--brand-chroma`. A
 * luminosidade de cada token continua definida por modo em `globals.css`.
 *
 * Isso importa: um estilo inline em `documentElement` vence a classe
 * `.dark`, então gravar `--brand-soft` claro deixaria o fundo do item ativo
 * da sidebar claro no modo escuro, com texto claro em cima — ilegível. Do
 * jeito atual, escolher um azul-marinho continua produzindo um azul claro
 * legível no escuro e um azul escuro no claro.
 */

export interface BrandTone {
  /** Matiz OKLCH, 0–360. */
  hue: number;
  /** Croma OKLCH, já limitado a uma faixa utilizável. */
  chroma: number;
}

/** Croma mínimo abaixo do qual a cor lê como cinza. */
const MIN_CHROMA = 0.02;
/** Croma máximo: acima disso a interface fica berrante. */
const MAX_CHROMA = 0.19;

/** Extrai matiz e croma OKLCH de um `#rrggbb`. */
export function hexToBrandTone(hex: string): BrandTone | null {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const toLinear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  const r = toLinear(parseInt(normalized.slice(0, 2), 16));
  const g = toLinear(parseInt(normalized.slice(2, 4), 16));
  const b = toLinear(parseInt(normalized.slice(4, 6), 16));

  // sRGB linear → LMS → OKLab (Björn Ottosson)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.sqrt(okA * okA + okB * okB);
  const hue = ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360;

  return {
    hue: Number(hue.toFixed(1)),
    chroma: Number(Math.min(MAX_CHROMA, Math.max(MIN_CHROMA, chroma)).toFixed(3)),
  };
}

/** Aplica a cor primária no documento. Passar `null` restaura o padrão. */
export function applyBrandColor(color: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!color) {
    root.style.removeProperty("--brand-hue");
    root.style.removeProperty("--brand-chroma");
    return;
  }

  const tone = hexToBrandTone(color);
  if (!tone) return;

  root.style.setProperty("--brand-hue", String(tone.hue));
  root.style.setProperty("--brand-chroma", String(tone.chroma));
}
