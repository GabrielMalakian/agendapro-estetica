"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

export interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: boolean;
}

interface MobileShellProps {
  items: MobileNavItem[];
  children: React.ReactNode;
  /** Texto pequeno ao lado da marca, ex.: "Área do profissional". */
  contextLabel?: string;
}

/**
 * Casca mobile-first usada nas áreas do profissional e do cliente: header
 * enxuto e barra de navegação inferior, que é o padrão que essas pessoas
 * esperam no celular. No desktop a barra vira uma linha de abas no topo.
 */
export function MobileShell({ items, children, contextLabel }: MobileShellProps) {
  const pathname = usePathname();

  const isActive = (item: MobileNavItem) =>
    item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          <BrandMark size="sm" />
          {contextLabel && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {contextLabel}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu compact />
          </div>
        </div>

        {/* Abas no desktop */}
        <nav
          className="mx-auto hidden w-full max-w-3xl gap-1 px-4 pb-2 sm:flex"
          aria-label="Navegação"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                isActive(item)
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main
        id="conteudo"
        className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 sm:pb-8"
      >
        {children}
      </main>

      {/* Barra inferior no celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden"
        aria-label="Navegação"
      >
        <ul className="mx-auto flex max-w-3xl">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[0.6875rem] transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className={cn("size-5", active && "scale-110")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
