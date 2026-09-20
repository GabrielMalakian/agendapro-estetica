"use client";

/**
 * Troca da cor primária em runtime.
 *
 * Toda a paleta deriva de `--brand` (ver `globals.css`), então a tela de
 * Aparência só precisa reescrever esse token — nenhum componente conhece a
 * cor diretamente.
 */

/** Converte `#1f6f7a` em `oklch(...)` aproximado, aceito pelo CSS moderno. */
export function hexToOklch(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;

  const toLinear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  const r = toLinear(parseInt(normalized.slice(0, 2), 16));
  const g = toLinear(parseInt(normalized.slice(2, 4), 16));
  const b = toLinear(parseInt(normalized.slice(4, 6), 16));

  // sRGB linear → LMS (matriz do OKLab)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.sqrt(okA * okA + okB * okB);
  const hue = (Math.atan2(okB, okA) * 180) / Math.PI;

  return `oklch(${okL.toFixed(3)} ${chroma.toFixed(3)} ${((hue + 360) % 360).toFixed(1)})`;
}

/** Aplica a cor primária no documento. Passar `null` restaura o padrão. */
export function applyBrandColor(color: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!color) {
    root.style.removeProperty("--brand");
    root.style.removeProperty("--brand-ring");
    root.style.removeProperty("--brand-soft");
    return;
  }

  const oklch = color.startsWith("#") ? hexToOklch(color) : color;
  root.style.setProperty("--brand", oklch);
  // O anel de foco e o acento suave derivam da mesma cor.
  root.style.setProperty(
    "--brand-ring",
    oklch.replace(/oklch\(([\d.]+)/, (_, lightness: string) =>
      `oklch(${Math.min(0.78, Number(lightness) + 0.12).toFixed(3)}`,
    ),
  );
  root.style.setProperty(
    "--brand-soft",
    oklch
      .replace(/oklch\(([\d.]+)/, () => "oklch(0.95")
      .replace(/ ([\d.]+) /, " 0.025 "),
  );
}
