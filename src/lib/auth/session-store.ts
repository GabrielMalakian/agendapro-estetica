"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getDatabase } from "@/data/store/database-store";
import type { Role, User } from "@/types";

/**
 * AUTENTICAÇÃO FAKE — apenas para a demonstração.
 * Ver `src/lib/auth/README.md` para onde entra o JWT real.
 */

export const DEMO_CREDENTIALS: { email: string; password: string; role: Role }[] =
  [
    { email: "admin@demo.com", password: "demo123", role: "ADMIN" },
    { email: "pro@demo.com", password: "demo123", role: "PROFESSIONAL" },
    { email: "cliente@demo.com", password: "demo123", role: "CLIENT" },
  ];

export interface SessionState {
  user: User | null;
  /** Unidade ativa no seletor do header (somente admin troca livremente). */
  activeUnitId: string | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  signInAs: (role: Role) => boolean;
  signOut: () => void;
  setActiveUnit: (unitId: string) => void;
}

export const SESSION_STORAGE_KEY = "agendapro.session.v1";

function defaultUnitFor(user: User): string | null {
  const db = getDatabase();
  if (user.unitId) return user.unitId;
  return db.units[0]?.id ?? null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      activeUnitId: null,
      hydrated: false,

      signIn: (email, password) => {
        const credential = DEMO_CREDENTIALS.find(
          (item) => item.email === email.trim().toLowerCase(),
        );
        if (!credential) {
          return { ok: false, error: "E-mail não encontrado nesta demonstração." };
        }
        if (credential.password !== password) {
          return { ok: false, error: "Senha incorreta. Use demo123." };
        }
        const user = getDatabase().users.find((item) => item.email === credential.email);
        if (!user) {
          return { ok: false, error: "Base de demonstração ainda carregando. Tente de novo." };
        }
        set({ user, activeUnitId: defaultUnitFor(user) });
        return { ok: true };
      },

      signInAs: (role) => {
        const credential = DEMO_CREDENTIALS.find((item) => item.role === role);
        if (!credential) return false;
        const user = getDatabase().users.find((item) => item.email === credential.email);
        if (!user) return false;
        set({ user, activeUnitId: defaultUnitFor(user) });
        return true;
      },

      signOut: () => set({ user: null, activeUnitId: null }),

      setActiveUnit: (unitId) => set({ activeUnitId: unitId }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        user: state.user,
        activeUnitId: state.activeUnitId,
      }),
      onRehydrateStorage: () => () => {
        useSessionStore.setState({ hydrated: true });
      },
    },
  ),
);
