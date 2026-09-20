"use client";

import { useDatabaseStore } from "@/data/store/database-store";
import type { Role, Unit, User } from "@/types";

import { useSessionStore } from "./session-store";

export interface SessionSnapshot {
  user: User | null;
  role: Role | null;
  /** Falso até o `localStorage` ser lido — evita flicker na primeira pintura. */
  ready: boolean;
  activeUnitId: string | null;
  activeUnit: Unit | null;
  units: Unit[];
}

/**
 * Sessão fake pronta para uso na UI.
 *
 * `ready` só fica verdadeiro quando a sessão **e** a base de demonstração
 * terminaram de hidratar; enquanto isso, os layouts mostram skeleton.
 */
export function useSession(): SessionSnapshot {
  const user = useSessionStore((state) => state.user);
  const activeUnitId = useSessionStore((state) => state.activeUnitId);
  const sessionHydrated = useSessionStore((state) => state.hydrated);
  const dbHydrated = useDatabaseStore((state) => state.hydrated);
  const units = useDatabaseStore((state) => state.db.units);

  const resolvedUnitId = activeUnitId ?? user?.unitId ?? units[0]?.id ?? null;

  return {
    user,
    role: user?.role ?? null,
    ready: sessionHydrated && dbHydrated,
    activeUnitId: resolvedUnitId,
    activeUnit: units.find((unit) => unit.id === resolvedUnitId) ?? null,
    units,
  };
}

/** Ações de sessão, separadas da leitura para não re-renderizar à toa. */
export function useSessionActions() {
  const signIn = useSessionStore((state) => state.signIn);
  const signInAs = useSessionStore((state) => state.signInAs);
  const signOut = useSessionStore((state) => state.signOut);
  const setActiveUnit = useSessionStore((state) => state.setActiveUnit);
  return { signIn, signInAs, signOut, setActiveUnit };
}
