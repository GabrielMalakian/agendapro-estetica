"use client";

import { CalendarDays, TrendingUp, Users } from "lucide-react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { RoleGuard } from "@/components/layout/role-guard";

const NAV = [
  { href: "/pro", label: "Agenda", icon: CalendarDays },
  { href: "/pro/clientes", label: "Clientes", icon: Users, matchPrefix: true },
  { href: "/pro/producao", label: "Produção", icon: TrendingUp, matchPrefix: true },
];

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow="PROFESSIONAL">
      <MobileShell items={NAV} contextLabel="Área do profissional">
        {children}
      </MobileShell>
    </RoleGuard>
  );
}
