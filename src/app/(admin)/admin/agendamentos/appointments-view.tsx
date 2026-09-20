"use client";

import { addDays, format } from "date-fns";
import { CheckCheck, Download, Filter, Search, UserX, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { AppointmentDetailSheet } from "@/components/scheduling/appointment-detail-sheet";
import {
  PaymentBadge,
  StatusBadge,
} from "@/components/scheduling/status-badge";
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
  appointmentRepository,
  clientRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { downloadCsv, csvNumber } from "@/lib/csv";
import { useSession } from "@/lib/auth/use-session";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { toDayKey } from "@/lib/scheduling";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type Appointment,
  type AppointmentStatus,
  type PaymentStatus,
} from "@/types";

const ANY = "__any__";

export function AppointmentsView() {
  const { activeUnitId } = useSession();

  const [from, setFrom] = useState(() => toDayKey(addDays(new Date(), -30)));
  const [to, setTo] = useState(() => toDayKey(addDays(new Date(), 30)));
  const [search, setSearch] = useState("");
  const [professionalId, setProfessionalId] = useState(ANY);
  const [serviceId, setServiceId] = useState(ANY);
  const [status, setStatus] = useState(ANY);
  const [paymentStatus, setPaymentStatus] = useState(ANY);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const {
    data: appointments,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      activeUnitId
        ? appointmentRepository.list({
            unitId: activeUnitId,
            from,
            to,
            search: search || undefined,
            professionalId: professionalId === ANY ? undefined : professionalId,
            serviceId: serviceId === ANY ? undefined : serviceId,
            status:
              status === ANY ? undefined : [status as AppointmentStatus],
            paymentStatus:
              paymentStatus === ANY
                ? undefined
                : [paymentStatus as PaymentStatus],
          })
        : Promise.resolve([]),
    [activeUnitId, from, to, search, professionalId, serviceId, status, paymentStatus],
  );

  const { data: clients } = useAsyncData(
    () => (activeUnitId ? clientRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );
  const { data: professionals } = useAsyncData(
    () => (activeUnitId ? professionalRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );
  const { data: services } = useAsyncData(
    () => (activeUnitId ? serviceRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  const clientName = useMemo(
    () => new Map((clients ?? []).map((item) => [item.id, item.name])),
    [clients],
  );
  const professionalName = useMemo(
    () => new Map((professionals ?? []).map((item) => [item.id, item.name])),
    [professionals],
  );
  const serviceName = useMemo(
    () => new Map((services ?? []).map((item) => [item.id, item.name])),
    [services],
  );

  const rows = useMemo(() => appointments ?? [], [appointments]);

  const totals = useMemo(
    () => ({
      count: rows.length,
      revenue: rows
        .filter((item) => item.status === "COMPLETED")
        .reduce((sum, item) => sum + item.price, 0),
      pending: rows.filter((item) => item.paymentStatus !== "PAID").length,
    }),
    [rows],
  );

  const hasFilters =
    search !== "" ||
    professionalId !== ANY ||
    serviceId !== ANY ||
    status !== ANY ||
    paymentStatus !== ANY;

  const clearFilters = () => {
    setSearch("");
    setProfessionalId(ANY);
    setServiceId(ANY);
    setStatus(ANY);
    setPaymentStatus(ANY);
  };

  const bulkChange = async (next: AppointmentStatus) => {
    const count = await appointmentRepository.bulkChangeStatus(selected, next);
    toast.success(
      `${count} ${count === 1 ? "agendamento atualizado" : "agendamentos atualizados"} para "${APPOINTMENT_STATUS_LABELS[next]}".`,
    );
    setSelected([]);
    reload();
  };

  const exportCsv = () => {
    downloadCsv(
      `agendamentos-${from}-a-${to}`,
      rows,
      [
        { header: "Data", value: (row) => formatDate(row.startsAt) },
        { header: "Início", value: (row) => formatTime(row.startsAt) },
        { header: "Fim", value: (row) => formatTime(row.endsAt) },
        { header: "Cliente", value: (row) => clientName.get(row.clientId) ?? "" },
        {
          header: "Profissional",
          value: (row) => professionalName.get(row.professionalId) ?? "",
        },
        { header: "Serviço", value: (row) => serviceName.get(row.serviceId) ?? "" },
        { header: "Status", value: (row) => APPOINTMENT_STATUS_LABELS[row.status] },
        {
          header: "Pagamento",
          value: (row) => PAYMENT_STATUS_LABELS[row.paymentStatus],
        },
        { header: "Valor", value: (row) => csvNumber(row.price) },
        { header: "Origem", value: (row) => (row.source === "ONLINE" ? "Online" : "Recepção") },
      ],
    );
    toast.success("CSV gerado.");
  };

  const columns: Column<Appointment>[] = [
    {
      id: "when",
      header: "Quando",
      sortValue: (row) => row.startsAt,
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="font-medium">{formatDate(row.startsAt)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatTime(row.startsAt)}–{formatTime(row.endsAt)}
          </p>
        </div>
      ),
    },
    {
      id: "client",
      header: "Cliente",
      sortValue: (row) => clientName.get(row.clientId) ?? "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {clientName.get(row.clientId) ?? "—"}
          </p>
          {row.source === "ONLINE" && (
            <p className="text-xs text-muted-foreground">agendou pelo app</p>
          )}
        </div>
      ),
    },
    {
      id: "service",
      header: "Serviço",
      sortValue: (row) => serviceName.get(row.serviceId) ?? "",
      cell: (row) => (
        <span className="text-sm">{serviceName.get(row.serviceId) ?? "—"}</span>
      ),
    },
    {
      id: "professional",
      header: "Profissional",
      sortValue: (row) => professionalName.get(row.professionalId) ?? "",
      cell: (row) => (
        <span className="text-sm">
          {professionalName.get(row.professionalId) ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} showIcon={false} />,
    },
    {
      id: "payment",
      header: "Pagamento",
      sortValue: (row) => row.paymentStatus,
      cell: (row) => <PaymentBadge status={row.paymentStatus} />,
    },
    {
      id: "price",
      header: "Valor",
      sortValue: (row) => row.price,
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => formatCurrency(row.price),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agendamentos"
        description={`${totals.count} no período · ${formatCurrency(totals.revenue)} realizados · ${totals.pending} com pagamento em aberto`}
        actions={
          <Button variant="outline" className="gap-1.5" onClick={exportCsv}>
            <Download className="size-4" aria-hidden />
            Exportar CSV
          </Button>
        }
      />

      {/* Filtros */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-muted-foreground" aria-hidden />
          Filtros
          {hasFilters && (
            <Button
              variant="ghost"
              size="xs"
              className="ml-auto gap-1"
              onClick={clearFilters}
            >
              <X className="size-3" aria-hidden />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="search" className="text-xs">
              Buscar
            </Label>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cliente, telefone ou serviço"
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs">
                De
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs">
                Até
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pro-filter" className="text-xs">
                Profissional
              </Label>
              <Select value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger id="pro-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos</SelectItem>
                  {(professionals ?? []).map((pro) => (
                    <SelectItem key={pro.id} value={pro.id}>
                      {pro.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-filter" className="text-xs">
                Serviço
              </Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="service-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos</SelectItem>
                  {(services ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="status-filter" className="text-xs">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos</SelectItem>
                  {APPOINTMENT_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {APPOINTMENT_STATUS_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-filter" className="text-xs">
                Pagamento
              </Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger id="payment-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos</SelectItem>
                  {PAYMENT_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {PAYMENT_STATUS_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Ações em massa */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-accent px-4 py-2.5">
          <Badge variant="secondary">{selected.length} selecionados</Badge>
          <Button size="sm" className="gap-1.5" onClick={() => bulkChange("CONFIRMED")}>
            <CheckCheck className="size-3.5" aria-hidden />
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => bulkChange("NO_SHOW")}
          >
            <UserX className="size-3.5" aria-hidden />
            Marcar falta
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => bulkChange("CANCELLED")}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setSelected([])}
          >
            Limpar seleção
          </Button>
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <DataTable
          caption="Lista de agendamentos do período filtrado"
          rows={rows}
          columns={columns}
          loading={loading && !appointments}
          onRowClick={(row) => setDetailId(row.id)}
          selection={{ selected, onChange: setSelected }}
          empty={{
            title: "Nenhum agendamento com esses filtros",
            description: hasFilters
              ? "Tente ampliar o período ou limpar os filtros."
              : "Use a agenda para criar o primeiro atendimento do período.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : undefined,
          }}
        />
      )}

      <AppointmentDetailSheet
        appointmentId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => !open && setDetailId(null)}
      />
    </div>
  );
}

/** Formata a data para o valor do input `type="date"`. */
export function toDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
