"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, useSessionActions } from "@/lib/auth/use-session";

/**
 * Seletor de unidade do header do admin.
 *
 * O multitenancy está modelado (todo dado carrega `companyId`/`unitId`), mas
 * não implementado: aqui a troca só muda o filtro do cliente. No backend real
 * a unidade acessível vem do JWT e o Prisma filtra por ela.
 */
export function UnitSwitcher() {
  const { units, activeUnit } = useSession();
  const { setActiveUnit } = useSessionActions();

  if (units.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 max-w-[15rem] justify-between gap-2"
          aria-label="Trocar de unidade"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate text-sm">
              {activeUnit?.name ?? "Selecione a unidade"}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Unidades
        </DropdownMenuLabel>
        {units.map((unit) => (
          <DropdownMenuItem
            key={unit.id}
            onSelect={() => setActiveUnit(unit.id)}
            className="gap-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{unit.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {unit.address}
              </span>
            </span>
            {unit.id === activeUnit?.id && (
              <Check className="size-4 shrink-0 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
