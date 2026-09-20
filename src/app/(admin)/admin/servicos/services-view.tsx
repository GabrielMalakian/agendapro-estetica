"use client";

import { Layers, Pencil, Plus, Power, Scissors, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { ServiceFormDialog } from "@/components/forms/service-form-dialog";
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
import { professionalRepository, serviceRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { formatCurrency, formatDuration } from "@/lib/format";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type Service,
  type ServiceCategory,
} from "@/types";

const ANY = "__any__";

export function ServicesView() {
  const { activeUnitId } = useSession();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ANY);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const {
    data: services,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      activeUnitId
        ? serviceRepository.list({
            unitId: activeUnitId,
            search: search || undefined,
            category: category === ANY ? undefined : (category as ServiceCategory),
          })
        : Promise.resolve([]),
    [activeUnitId, search, category],
  );

  const { data: professionals } = useAsyncData(
    () => (activeUnitId ? professionalRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  const rows = services ?? [];

  const toggleActive = async (service: Service) => {
    if (service.active) {
      await serviceRepository.deactivate(service.id);
      toast.success(`"${service.name}" desativado.`, {
        description: "Ele deixa de aparecer no agendamento online.",
      });
    } else {
      await serviceRepository.update(service.id, { active: true });
      toast.success(`"${service.name}" reativado.`);
    }
    reload();
  };

  const columns: Column<Service>[] = [
    {
      id: "name",
      header: "Serviço",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-medium">
            {row.comboServiceIds && (
              <Layers className="size-3.5 shrink-0 text-primary" aria-label="Combo" />
            )}
            {row.name}
          </p>
          {row.description && (
            <p className="truncate text-xs text-muted-foreground">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: "Categoria",
      sortValue: (row) => row.category,
      cell: (row) => (
        <Badge variant="outline">{SERVICE_CATEGORY_LABELS[row.category]}</Badge>
      ),
    },
    {
      id: "duration",
      header: "Duração",
      sortValue: (row) => row.durationMinutes + row.bufferMinutes,
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-sm">{formatDuration(row.durationMinutes)}</p>
          {row.bufferMinutes > 0 && (
            <p className="text-xs text-muted-foreground">
              +{formatDuration(row.bufferMinutes)} buffer
            </p>
          )}
        </div>
      ),
    },
    {
      id: "professionals",
      header: "Profissionais",
      sortValue: (row) => row.professionalIds.length,
      cell: (row) => {
        const names = row.professionalIds
          .map((id) => (professionals ?? []).find((pro) => pro.id === id)?.name)
          .filter(Boolean);
        return (
          <span className="text-xs text-muted-foreground">
            {names.length === 0 ? "nenhum" : names.join(", ")}
          </span>
        );
      },
    },
    {
      id: "room",
      header: "Recurso",
      cell: (row) =>
        row.requiresRoom ? (
          <Badge variant="secondary" className="text-[0.625rem]">
            {row.roomIds.length} sala(s)
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "price",
      header: "Preço",
      sortValue: (row) => row.price,
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => formatCurrency(row.price),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => (row.active ? 0 : 1),
      cell: (row) => (
        <Badge variant={row.active ? "default" : "outline"}>
          {row.active ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      headerClassName: "w-24",
      cell: (row) => (
        <div
          className="flex justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Editar ${row.name}`}
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={row.active ? `Desativar ${row.name}` : `Reativar ${row.name}`}
            onClick={() => toggleActive(row)}
          >
            <Power className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Serviços"
        description={`${rows.filter((item) => item.active).length} ativos de ${rows.length} cadastrados`}
        actions={
          <Button
            className="gap-1.5"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Novo serviço
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="service-search" className="text-xs">
            Buscar
          </Label>
          <div className="relative">
            <Search
              className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="service-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome do serviço"
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:w-56">
          <Label htmlFor="service-category-filter" className="text-xs">
            Categoria
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="service-category-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Todas</SelectItem>
              {SERVICE_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {SERVICE_CATEGORY_LABELS[item]}
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
          caption="Catálogo de serviços da unidade"
          rows={rows}
          columns={columns}
          loading={loading && !services}
          empty={{
            title: "Nenhum serviço cadastrado",
            description: "Cadastre os serviços para que eles apareçam na agenda.",
            action: (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Scissors className="size-3.5" aria-hidden />
                Criar serviço
              </Button>
            ),
          }}
        />
      )}

      {activeUnitId && (
        <ServiceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          unitId={activeUnitId}
          service={editing}
          onSaved={() => reload()}
        />
      )}
    </div>
  );
}
