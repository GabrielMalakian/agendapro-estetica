"use client";

import { getDatabase, mutateDatabase } from "../store/database-store";
import type { Database } from "../database";

/**
 * Infraestrutura comum dos repositórios.
 *
 * Todo repositório expõe métodos assíncronos porque, quando o backend NestJS
 * existir, a única coisa que muda é o corpo do método: `readDb(...)` vira
 * `fetch('/api/...')`. Nenhuma assinatura de método precisa mudar, e nenhum
 * componente de UI precisa ser tocado.
 */

const MIN_LATENCY_MS = 200;
const MAX_LATENCY_MS = 400;

/** Simula a latência de rede para que os estados de loading sejam reais. */
export function networkDelay(): Promise<void> {
  const ms =
    MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Leitura: espera a latência e devolve uma projeção da base. */
export async function readDb<T>(project: (db: Database) => T): Promise<T> {
  await networkDelay();
  return clone(project(getDatabase()));
}

/** Escrita: espera a latência, aplica a mutação e devolve o resultado. */
export async function writeDb<T>(
  apply: (db: Database) => { db: Database; result: T },
): Promise<T> {
  await networkDelay();
  let result!: T;
  mutateDatabase((db) => {
    const outcome = apply(db);
    result = outcome.result;
    return outcome.db;
  });
  return clone(result);
}

/**
 * Cópia defensiva: a UI nunca recebe uma referência viva do store, do mesmo
 * jeito que não receberia ao consumir JSON de uma API.
 */
function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Erro de repositório com código legível — espelha o `HttpException` do Nest. */
export class RepositoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export function notFound(entity: string): never {
  throw new RepositoryError("NOT_FOUND", `${entity} não encontrado.`, 404);
}

/** UUID v4 — no backend vem do `@default(uuid())` do Prisma. */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Substitui um item de uma coleção por id, preservando a ordem. */
export function replaceById<T extends { id: string }>(
  items: T[],
  id: string,
  patch: (item: T) => T,
): T[] {
  return items.map((item) => (item.id === id ? patch(item) : item));
}
