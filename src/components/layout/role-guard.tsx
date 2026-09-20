"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/lib/auth/use-session";
import { ROLE_HOME, type Role } from "@/types";

import { AppBootScreen } from "./app-boot-screen";

interface RoleGuardProps {
  allow: Role;
  children: React.ReactNode;
}

/**
 * Guard de layout por papel — **UX, não segurança**.
 *
 * Sem sessão → `/login`. Com sessão de outro papel → área própria daquele
 * papel. Enquanto a sessão hidrata, mostra a tela de carregamento, o que
 * evita o flash de "deslogado" em quem já está autenticado.
 *
 * Com o backend real, a mesma decisão passa a existir também no
 * `middleware.ts` (lendo o cookie de sessão) e nos guards do NestJS. Ver
 * `src/lib/auth/README.md`.
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== allow) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [ready, user, allow, router]);

  if (!ready || !user || user.role !== allow) {
    return <AppBootScreen />;
  }

  return <>{children}</>;
}
