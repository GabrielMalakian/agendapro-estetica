"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DATABASE_VERSION, type Database } from "../database";
import { createSeedDatabase } from "../seed";
import { buildSettings } from "../seed/organization";

/** Chave `yyyy-MM-dd` do dia em que a base foi gerada. */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Estado inicial vazio.
 *
 * O seed é caro e é relativo a "hoje"; gerá-lo durante a renderização no
 * servidor produziria dados diferentes dos do cliente e quebraria a
 * hidratação. Por isso a base começa vazia e só é preenchida no cliente,
 * dentro de `onRehydrateStorage`. Enquanto `hydrated` é falso a UI mostra
 * skeletons.
 */
function emptyDatabase(): Database {
  return {
    companies: [],
    units: [],
    holidays: [],
    rooms: [],
    users: [],
    professionals: [],
    services: [],
    clients: [],
    appointments: [],
    scheduleBlocks: [],
    packages: [],
    clientPackages: [],
    payments: [],
    reviews: [],
    notifications: [],
    messageTemplates: [],
    waitlist: [],
    evolutionRecords: [],
    contraindications: [],
    treatmentPlans: [],
    quotes: [],
    settings: buildSettings(),
  };
}

interface DatabaseState {
  db: Database;
  /** Dia em que o seed foi gerado — a base é refeita quando o dia vira. */
  seededOn: string;
  hydrated: boolean;
  /** Aplica uma mutação imutável sobre a base. */
  mutate: (recipe: (db: Database) => Database) => void;
  /** Recria a base a partir do seed (botão "Reiniciar demonstração"). */
  reset: () => void;
  /**
   * Conclui a hidratação: semeia a base se ela estiver vazia ou desatualizada
   * e libera a UI. É uma ação do próprio store (e não uma chamada a
   * `useDatabaseStore.setState`) porque `onRehydrateStorage` roda durante a
   * criação do store, quando a constante exportada ainda não existe.
   */
  finishHydration: () => void;
}

export const DATABASE_STORAGE_KEY = "agendapro.database.v1";

export const useDatabaseStore = create<DatabaseState>()(
  persist(
    (set) => ({
      db: emptyDatabase(),
      seededOn: "",
      hydrated: false,
      mutate: (recipe) => set((state) => ({ db: recipe(state.db) })),
      reset: () =>
        set({ db: createSeedDatabase(), seededOn: todayKey(), hydrated: true }),
      finishHydration: () =>
        set((state) => {
          if (state.hydrated) return state;
          // O seed é relativo a "hoje": base de outro dia deixaria a agenda e
          // os gráficos vazios, então regeneramos.
          const stale =
            state.seededOn !== todayKey() || state.db.companies.length === 0;
          if (!stale) return { hydrated: true };

          try {
            return {
              db: createSeedDatabase(),
              seededOn: todayKey(),
              hydrated: true,
            };
          } catch (cause) {
            // Um erro aqui derrubaria a aplicação inteira antes do primeiro
            // paint. Preferimos abrir vazio, com o motivo no console, a
            // mostrar "Application error" em cima de uma tela branca.
            console.error("Falha ao gerar a base de demonstração:", cause);
            return { db: emptyDatabase(), seededOn: todayKey(), hydrated: true };
          }
        }),
    }),
    {
      name: DATABASE_STORAGE_KEY,
      version: DATABASE_VERSION,
      partialize: (state) => ({ db: state.db, seededOn: state.seededOn }),
      onRehydrateStorage: () => (state) => {
        state?.finishHydration();
      },
    },
  ),
);

/** Leitura síncrona da base fora de componentes (usada pelos repositórios). */
export function getDatabase(): Database {
  return useDatabaseStore.getState().db;
}

/** Escrita fora de componentes (usada pelos repositórios). */
export function mutateDatabase(recipe: (db: Database) => Database): void {
  useDatabaseStore.getState().mutate(recipe);
}
