"use client";

import { CalendarPlus, Home, PackageOpen, UserRound } from "lucide-react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { RoleGuard } from "@/components/layout/role-guard";

const NAV = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/agendar", label: "Agendar", icon: CalendarPlus, matchPrefix: true },
  { href: "/app/agendamentos", label: "Meus horários", icon: PackageOpen, matchPrefix: true },
  { href: "/app/perfil", label: "Perfil", icon: UserRound, matchPrefix: true },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow="CLIENT">
      <MobileShell items={NAV}>{children}</MobileShell>
    </RoleGuard>
  );
}
