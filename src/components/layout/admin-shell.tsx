"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  MessageSquareText,
  Menu,
  Scissors,
  Settings,
  Users,
  UserSquare2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UnitSwitcher } from "@/components/layout/unit-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDatabaseStore } from "@/data/store/database-store";
import { cn } from "@/lib/utils";
import type { PermissionResource } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  resource: PermissionResource;
  /** Marca ativo também nas subrotas. */
  matchPrefix?: boolean;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Operação",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard" },
      { href: "/admin/agenda", label: "Agenda", icon: CalendarDays, resource: "agenda", matchPrefix: true },
      {
        href: "/admin/agendamentos",
        label: "Agendamentos",
        icon: ClipboardList,
        resource: "appointments",
        matchPrefix: true,
      },
      { href: "/admin/clientes", label: "Clientes", icon: Users, resource: "clients", matchPrefix: true },
    ],
  },
  {
    group: "Cadastros",
    items: [
      { href: "/admin/servicos", label: "Serviços", icon: Scissors, resource: "services", matchPrefix: true },
      {
        href: "/admin/profissionais",
        label: "Profissionais",
        icon: UserSquare2,
        resource: "professionals",
        matchPrefix: true,
      },
    ],
  },
  {
    group: "Gestão",
    items: [
      { href: "/admin/financeiro", label: "Financeiro", icon: CreditCard, resource: "finance", matchPrefix: true },
      { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, resource: "reports", matchPrefix: true },
      {
        href: "/admin/comunicacao",
        label: "Comunicação",
        icon: MessageSquareText,
        resource: "communication",
        matchPrefix: true,
      },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings, resource: "settings", matchPrefix: true },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) return pathname.startsWith(item.href);
  return pathname === item.href;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 px-3 py-4" aria-label="Navegação principal">
      {NAV.map((section) => (
        <div key={section.group}>
          <p className="px-3 pb-2 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function PublicPageLink() {
  const slug = useDatabaseStore((state) => state.db.companies[0]?.slug);
  if (!slug) return null;

  return (
    <Link
      href={`/${slug}`}
      target="_blank"
      className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
      Ver página pública
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o menu ao navegar no celular.
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="flex min-h-svh bg-muted/40">
      {/* Sidebar fixa no desktop */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Link href="/admin" className="rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <BrandMark />
          </Link>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <NavLinks />
        </ScrollArea>
        <PublicPageLink />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="h-16 justify-center border-b border-border px-5">
                <SheetTitle className="text-left">
                  <BrandMark />
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100svh-4rem)]">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
                <PublicPageLink />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <UnitSwitcher />

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main id="conteudo" className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
