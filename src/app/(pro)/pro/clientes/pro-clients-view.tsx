"use client";

import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appointmentRepository, clientRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useCurrentProfessional } from "@/hooks/use-current-professional";
import { formatCurrency, formatDate, formatPhone, initials } from "@/lib/format";

/**
 * "Meus clientes": apenas quem já foi atendido por este profissional.
 * O recorte vem dos agendamentos, não da base inteira da unidade — é isso
 * que diferencia esta tela da lista do admin.
 */
export function ProClientsView() {
  const { professional } = useCurrentProfessional();
  const [search, setSearch] = useState("");

  const {
    data: appointments,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      professional
        ? appointmentRepository.list({ professionalId: professional.id })
        : Promise.resolve([]),
    [professional?.id],
    { enabled: Boolean(professional) },
  );

  const { data: clients } = useAsyncData(
    () =>
      professional
        ? clientRepository.list({ unitId: professional.unitId })
        : Promise.resolve([]),
    [professional?.unitId],
    { enabled: Boolean(professional) },
  );

  const rows = useMemo(() => {
    const own = appointments ?? [];
    const byClient = new Map<
      string,
      { count: number; lastAt: string; spent: number }
    >();

    for (const appointment of own) {
      if (appointment.status === "CANCELLED") continue;
      const current = byClient.get(appointment.clientId) ?? {
        count: 0,
        lastAt: "",
        spent: 0,
      };
      if (appointment.status === "COMPLETED") {
        current.count += 1;
        current.spent += appointment.price;
      }
      if (appointment.startsAt > current.lastAt) current.lastAt = appointment.startsAt;
      byClient.set(appointment.clientId, current);
    }

    const term = search.trim().toLowerCase();

    return (clients ?? [])
      .filter((client) => byClient.has(client.id))
      .filter((client) => !term || client.name.toLowerCase().includes(term))
      .map((client) => ({ client, stats: byClient.get(client.id)! }))
      .sort((a, b) => b.stats.lastAt.localeCompare(a.stats.lastAt));
  }, [appointments, clients, search]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Meus clientes
        </h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "pessoa atendida" : "pessoas atendidas"} por você.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="pro-client-search" className="sr-only">
          Buscar cliente
        </Label>
        <div className="relative">
          <Search
            className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="pro-client-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pelo nome"
            className="pl-8"
          />
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !appointments ? (
        <ListSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Ninguém com esse nome" : "Você ainda não atendeu ninguém"}
          description={
            search
              ? "Tente outro termo de busca."
              : "Os clientes aparecem aqui depois do primeiro atendimento."
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ client, stats }) => (
            <li
              key={client.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                  {initials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{client.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatPhone(client.phone)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.count} com você · último em {formatDate(stats.lastAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium tabular-nums">
                  {formatCurrency(stats.spent)}
                </p>
                {client.metrics.noShows > 0 && (
                  <Badge variant="outline" className="mt-1 text-[0.625rem]">
                    {client.metrics.noShows} falta(s)
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
