import { parseISO, set } from "date-fns";

import type { Interval } from "./types";

/** Combina um dia com uma hora `HH:mm` no fuso local. */
export function atTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return set(day, {
    hours: hours ?? 0,
    minutes: minutes ?? 0,
    seconds: 0,
    milliseconds: 0,
  });
}

/** Converte `yyyy-MM-dd` em meia-noite local daquele dia. */
export function parseDayKey(date: string): Date {
  return parseISO(`${date}T00:00:00`);
}

/** `yyyy-MM-dd` de uma data, no fuso local. */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function contains(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

export function isEmpty(interval: Interval): boolean {
  return interval.end <= interval.start;
}

/** Ordena e funde intervalos que se tocam ou se sobrepõem. */
export function normalize(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((interval) => !isEmpty(interval))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      if (interval.end > last.end) last.end = interval.end;
    } else {
      merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
    }
  }
  return merged;
}

/** `base` menos todos os intervalos de `cuts`. */
export function subtract(base: Interval[], cuts: Interval[]): Interval[] {
  const holes = normalize(cuts);
  let result = normalize(base);

  for (const hole of holes) {
    const next: Interval[] = [];
    for (const piece of result) {
      if (!overlaps(piece, hole)) {
        next.push(piece);
        continue;
      }
      if (piece.start < hole.start) {
        next.push({ start: piece.start, end: new Date(Math.min(piece.end.getTime(), hole.start.getTime())) });
      }
      if (piece.end > hole.end) {
        next.push({ start: new Date(Math.max(piece.start.getTime(), hole.end.getTime())), end: piece.end });
      }
    }
    result = next.filter((piece) => !isEmpty(piece));
  }

  return result;
}

/** Interseção entre duas listas de intervalos. */
export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const left = normalize(a);
  const right = normalize(b);
  const result: Interval[] = [];

  for (const first of left) {
    for (const second of right) {
      const start = new Date(Math.max(first.start.getTime(), second.start.getTime()));
      const end = new Date(Math.min(first.end.getTime(), second.end.getTime()));
      if (start < end) result.push({ start, end });
    }
  }

  return normalize(result);
}
