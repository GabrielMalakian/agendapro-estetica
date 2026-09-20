import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import type { ISODateTimeString } from "@/types";

/** Aceita `Date` ou ISO string e devolve sempre um `Date`. */
export function toDate(value: Date | string): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const NUMBER = new Intl.NumberFormat("pt-BR");

export function formatCurrency(value: number): string {
  return BRL.format(value);
}

/** Versão curta para eixos de gráfico e cards: `R$ 12,4 mil`. */
export function formatCurrencyCompact(value: number): string {
  return BRL_COMPACT.format(value);
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/* --------------------------------- datas -------------------------------- */

export function formatDate(value: Date | string): string {
  return format(toDate(value), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateLong(value: Date | string): string {
  return format(toDate(value), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDateShort(value: Date | string): string {
  return format(toDate(value), "dd/MM", { locale: ptBR });
}

export function formatWeekdayShort(value: Date | string): string {
  return format(toDate(value), "EEEEEE", { locale: ptBR }).replace(".", "");
}

export function formatWeekdayLong(value: Date | string): string {
  return format(toDate(value), "EEEE", { locale: ptBR });
}

export function formatTime(value: Date | string): string {
  return format(toDate(value), "HH:mm", { locale: ptBR });
}

export function formatDateTime(value: Date | string): string {
  return format(toDate(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatMonthYear(value: Date | string): string {
  return format(toDate(value), "MMMM 'de' yyyy", { locale: ptBR });
}

/** "Hoje", "Amanhã", "Ontem" ou a data por extenso curta. */
export function formatRelativeDay(value: Date | string): string {
  const date = toDate(value);
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  if (isYesterday(date)) return "Ontem";
  return format(date, "EEEE, d 'de' MMM", { locale: ptBR });
}

export function formatDistanceToNow(value: Date | string): string {
  return formatDistanceToNowStrict(toDate(value), {
    locale: ptBR,
    addSuffix: true,
  });
}

export function daysFromNow(value: Date | string): number {
  return differenceInCalendarDays(toDate(value), new Date());
}

/** `90` → `1h30`; `45` → `45min`. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, "0")}`;
}

/** Contagem regressiva legível: `em 2h15`, `em 12min`, `agora`. */
export function formatCountdown(target: Date | string): string {
  const diffMs = toDate(target).getTime() - Date.now();
  if (diffMs <= 0) return "agora";
  const totalMinutes = Math.floor(diffMs / 60_000);
  if (totalMinutes < 1) return "em menos de 1min";
  if (totalMinutes < 60) return `em ${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return `em ${hours}h${minutes > 0 ? String(minutes).padStart(2, "0") : ""}`;
  const days = Math.floor(hours / 24);
  return `em ${days} ${days === 1 ? "dia" : "dias"}`;
}

/* ------------------------------- documentos ------------------------------ */

export function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

/** Iniciais para o fallback do avatar: "Ana Souza" → "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Primeiro nome — usado em saudações e listas compactas. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Slug ASCII simples, sem acento — usado na página pública. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Pluralização simples em pt-BR. */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** Chave estável `yyyy-MM-dd` para agrupar por dia (timezone local). */
export function dayKey(value: Date | ISODateTimeString): string {
  return format(toDate(value), "yyyy-MM-dd");
}
