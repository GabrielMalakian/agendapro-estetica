"use client";

import { Download, Plus, Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { ClientFormDialog } from "@/components/forms/client-form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_SEGMENT_LABELS,
  CLIENT_SEGMENTS,
  clientRepository,
  type ClientSegment,
  type ClientWithMetrics,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { csvNumber, downloadCsv } from "@/lib/csv";
import {
  formatCurrency,
  formatDate,
  formatPhone,
  initials,
} from "@/lib/format";

export function ClientsView() {
  const router = useRouter();
  const { activeUnitId } = useSession();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<ClientSegment>("ALL");
  const [formOpen, setFormOpen] = useState(false);

  const {
    data: clients,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      activeUnitId
        ? clientRepository.list({
            unitId: activeUnitId,
            search: search || undefined,
            segment,
          })
        : Promise.resolve([]),
    [activeUnitId, search, segment],
  );

  const rows = clients ?? [];

  const exportCsv = () => {
    downloadCsv(`clientes-${segment.toLowerCase()}`, rows, [
      { header: "Nome", value: (row) => row.name },
      { header: "Telefone", value: (row) => formatPhone(row.phone) },
      { header: "E-mail", value: (row) => row.email },
      { header: "Atendimentos", value: (row) => row.metrics.completed },
      { header: "Faltas", value: (row) => row.metrics.noShows },
      { header: "Total gasto", value: (row) => csvNumber(row.metrics.totalSpent) },
      { header: "Ticket médio", value: (row) => csvNumber(row.metrics.averageTicket) },
      {
        header: "Última visita",
        value: (row) => (row.metrics.lastVisitAt ? formatDate(row.metrics.lastVisitAt) : "—"),
      },
    ]);
    toast.success("CSV gerado.");
  };

  const columns: Column<ClientWithMetrics>[] = [
    {
      id: "name",
      header: "Cliente",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-accent text-xs text-accent-foreground">
              {initials(row.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatPhone(row.phone)}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "tags",
      header: "Marcadores",
      cell: (row) =>
        row.tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[0.625rem]">
                {tag}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      id: "completed",
      header: "Atendimentos",
      sortValue: (row) => row.metrics.completed,
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.metrics.completed,
    },
    {
      id: "noShows",
      header: "Faltas",
      sortValue: (row) => row.metrics.noShows,
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) =>
        row.metrics.noShows > 0 ? (
          <span className="text-destructive">{row.metrics.noShows}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      id: "totalSpent",
      header: "Total gasto",
      sortValue: (row) => row.metrics.totalSpent,
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => formatCurrency(row.metrics.totalSpent),
    },
    {
      id: "lastVisit",
      header: "Última visita",
      sortValue: (row) => row.metrics.lastVisitAt ?? "",
      cell: (row) =>
        row.metrics.lastVisitAt ? (
          <span className="text-sm whitespace-nowrap">
            {formatDate(row.metrics.lastVisitAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">nunca veio</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description={`${rows.length} ${rows.length === 1 ? "cliente" : "clientes"} em ${CLIENT_SEGMENT_LABELS[segment].toLowerCase()}`}
        actions={
          <>
            <Button variant="outline" className="gap-1.5" onClick={exportCsv}>
              <Download className="size-4" aria-hidden />
              Exportar CSV
            </Button>
            <Button className="gap-1.5" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Novo cliente
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="client-search" className="text-xs">
            Buscar
          </Label>
          <div className="relative">
            <Search
              className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="client-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, telefone, e-mail ou CPF"
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:w-56">
          <Label htmlFor="segment" className="text-xs">
            Segmento
          </Label>
          <Select
            value={segment}
            onValueChange={(value) => setSegment(value as ClientSegment)}
          >
            <SelectTrigger id="segment" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_SEGMENTS.map((item) => (
                <SelectItem key={item} value={item}>
                  {CLIENT_SEGMENT_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <DataTable
          caption="Lista de clientes da unidade"
          rows={rows}
          columns={columns}
          loading={loading && !clients}
          onRowClick={(row) => router.push(`/admin/clientes/${row.id}`)}
          empty={{
            title:
              segment === "ALL"
                ? "Nenhum cliente cadastrado"
                : "Nenhum cliente neste segmento",
            description:
              segment === "ALL"
                ? "Cadastre o primeiro cliente para começar a agendar."
                : "Experimente outro segmento ou limpe a busca.",
            action: (
              <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
                <UserPlus className="size-3.5" aria-hidden />
                Cadastrar cliente
              </Button>
            ),
          }}
        />
      )}

      {activeUnitId && (
        <ClientFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          unitId={activeUnitId}
          onSaved={() => reload()}
        />
      )}
    </div>
  );
}
