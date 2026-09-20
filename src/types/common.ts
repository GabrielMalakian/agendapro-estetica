/**
 * Tipos base compartilhados.
 *
 * Convenções (espelham o contrato da futura API NestJS + Prisma):
 * - identificadores são UUID v4 em string;
 * - datas trafegam como ISO 8601 em string (`2026-09-20T13:30:00.000Z`);
 * - horas do dia trafegam como `HH:mm` no fuso da unidade;
 * - enums são UPPER_SNAKE_CASE;
 * - campos em camelCase.
 */

/** UUID v4 em string. Alias semântico — o backend valida o formato. */
export type UUID = string;

/** Data/hora completa em ISO 8601 UTC. Ex.: `2026-09-20T13:30:00.000Z`. */
export type ISODateTimeString = string;

/** Data sem hora em ISO 8601. Ex.: `1990-04-17`. */
export type ISODateString = string;

/** Hora do dia em 24h. Ex.: `09:30`. */
export type TimeString = string;

/** Dia da semana: 0 = domingo … 6 = sábado (compatível com `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** Envelope de listagem paginada — o backend devolverá neste formato. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Intervalo de datas fechado usado por filtros e relatórios. */
export interface DateRange {
  from: ISODateString;
  to: ISODateString;
}

/** Erro de domínio tipado, devolvido pelas validações de agendamento. */
export interface DomainError {
  code: string;
  message: string;
  field?: string;
}
