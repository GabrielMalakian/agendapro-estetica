/**
 * Gera os ícones PNG do PWA sem depender de biblioteca de imagem.
 *
 * Desenha um quadrado arredondado na cor da marca com o símbolo de agenda
 * (moldura de calendário, duas argolas e um ponteiro), amostrando 3×3 por
 * pixel para as bordas saírem suaves. Rode com:
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BRAND = [31, 111, 122]; // #1f6f7a
const INK = [255, 255, 255];

/** CRC32 — exigido por cada chunk do PNG. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Codifica RGBA (8 bits, sem entrelaçamento) em PNG. */
function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro "None"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidade
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Retângulo de cantos arredondados: ponto dentro? */
function inRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Cor do ícone em coordenadas normalizadas (0–1).
 * `safe` recua o desenho para caber na zona segura dos ícones maskable.
 */
function sample(u, v, maskable) {
  // Zona segura: o conteúdo de um ícone maskable fica nos 80% centrais.
  const inset = maskable ? 0.1 : 0;
  const scale = 1 - inset * 2;
  const x = (u - inset) / scale;
  const y = (v - inset) / scale;

  const outsideBackground = maskable
    ? false // maskable pinta o quadro inteiro; o SO recorta
    : !inRoundedRect(u, v, 0.02, 0.02, 0.98, 0.98, 0.22);
  if (outsideBackground) return null;
  if (x < 0 || x > 1 || y < 0 || y > 1) return BRAND;

  // Moldura do calendário
  const outer = inRoundedRect(x, y, 0.2, 0.26, 0.8, 0.82, 0.1);
  const inner = inRoundedRect(x, y, 0.27, 0.33, 0.73, 0.75, 0.06);
  if (outer && !inner) return INK;

  // Faixa superior preenchida
  if (outer && y >= 0.26 && y <= 0.4) return INK;

  // Argolas
  const ring = (cx) => Math.hypot(x - cx, y - 0.22) <= 0.045;
  if (ring(0.36) || ring(0.64)) return INK;

  // Ponteiro do relógio dentro do calendário
  const center = [0.5, 0.58];
  const distance = Math.hypot(x - center[0], y - center[1]);
  if (distance <= 0.14 && distance >= 0.105) return INK;
  // ponteiro das horas (para cima) e dos minutos (para a direita)
  if (Math.abs(x - center[0]) <= 0.018 && y <= center[1] && y >= center[1] - 0.09) {
    return INK;
  }
  if (Math.abs(y - center[1]) <= 0.018 && x >= center[0] && x <= center[0] + 0.075) {
    return INK;
  }

  return BRAND;
}

function render(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const SAMPLES = 3;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const u = (px + (sx + 0.5) / SAMPLES) / size;
          const v = (py + (sy + 0.5) / SAMPLES) / size;
          const color = sample(u, v, maskable);
          if (color) {
            r += color[0];
            g += color[1];
            b += color[2];
            a += 255;
          }
        }
      }

      const total = SAMPLES * SAMPLES;
      const offset = (py * size + px) * 4;
      const opaque = a / 255;
      rgba[offset] = opaque > 0 ? Math.round(r / opaque) : 0;
      rgba[offset + 1] = opaque > 0 ? Math.round(g / opaque) : 0;
      rgba[offset + 2] = opaque > 0 ? Math.round(b / opaque) : 0;
      rgba[offset + 3] = Math.round(a / total);
    }
  }

  return encodePng(size, size, rgba);
}

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true },
];

for (const target of targets) {
  writeFileSync(join(outDir, target.file), render(target.size, target.maskable));
  console.log(`✓ ${target.file} (${target.size}×${target.size})`);
}
