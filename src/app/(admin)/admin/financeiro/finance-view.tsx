"use client";

import { endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import {
  Banknote,
  ChevronDown,
  Download,
  HandCoins,
  Hourglass,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import {
  CardsSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
} from "@/components/common/states";
import { BreakdownChart } from "@/components/charts/breakdown-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { PaymentBadge } from "@/components/scheduling/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clientRepository,
  financeRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { csvNumber, downloadCsv } from "@/lib/csv";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatMonthYear,
  formatPercent,
} from "@/lib/format";
import { toDayKey } from "@/lib/scheduling";
import { PAYMENT_METHOD_LABELS } from "@/types";

type PeriodKey = "7d" | "30d" | "month" | "prev-month";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  month: "Mês atual",
  "prev-month": "Mês anterior",
};

function resolvePeriod(key: PeriodKey): { from: string; to: string; label: string } {
  const now = new Date();
  switch (key) {
    case "7d":
      return {
        from: toDayKey(subDays(now, 6)),
        to: toDayKey(now),
        label: PERIOD_LABELS["7d"],
      };
    case "month":
      return {
        from: toDayKey(startOfMonth(now)),
        to: toDayKey(endOfMonth(now)),
        label: formatMonthYear(now),
      };
    case "prev-month": {
      const previous = subMonths(now, 1);
      return {
        from: toDayKey(startOfMonth(previous)),
        to: toDayKey(endOfMonth(previous)),
        label: formatMonthYear(previous),
      };
    }
    default:
      return {
        from: toDayKey(subDays(now, 29)),
        to: toDayKey(now),
        label: PERIOD_LABELS["30d"],
      };
  }
}

export function FinanceView() {
  const { activeUnitId } = useSession();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30d");
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey]);

  const {
    data: summary,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      activeUnitId
        ? financeRepository.summary({
            unitId: activeUnitId,
            from: period.from,
            to: period.to,
          })
        : Promise.resolve(null),
    [activeUnitId, period.from, period.to],
  );

  const { data: commissions, loading: loadingCommissions } = useAsyncData(
    () =>
      activeUnitId
        ? financeRepository.commissions({
            unitId: activeUnitId,
            from: period.from,
            to: period.to,
          })
        : Promise.resolve([]),
    [activeUnitId, period.from, period.to],
  );

  const { data: clients } = useAsyncData(
    () => (activeUnitId ? clientRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  const { data: services } = useAsyncData(
    () => (activeUnitId ? serviceRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  const clientName = new Map((clients ?? []).map((item) => [item.id, item.name]));
  const serviceName = new Map((services ?? []).map((item) => [item.id, item.name]));

  const totalCommission = (commissions ?? []).reduce(
    (sum, item) => sum + item.commission,
    0,
  );

  const exportPayments = () => {
    downloadCsv(`recebimentos-${period.from}-a-${period.to}`, summary?.payments ?? [], [
      { header: "Data", value: (row) => formatDate(row.paidAt) },
      { header: "Cliente", value: (row) => row.clientName },
      { header: "Serviço", value: (row) => row.serviceName },
      { header: "Método", value: (row) => PAYMENT_METHOD_LABELS[row.method] },
      { header: "Valor", value: (row) => csvNumber(row.amount) },
    ]);
    toast.success("CSV de recebimentos gerado.");
  };

  const exportCommissions = () => {
    const rows = (commissions ?? []).flatMap((item) =>
      item.lines.map((line) => ({ professional: item.professionalName, ...line })),
    );
    downloadCsv(`comissoes-${period.from}-a-${period.to}`, rows, [
      { header: "Profissional", value: (row) => row.professional },
      { header: "Data", value: (row) => formatDate(row.date) },
      { header: "Cliente", value: (row) => row.clientName },
      { header: "Serviço", value: (row) => row.serviceName },
      { header: "Valor do serviço", value: (row) => csvNumber(row.price) },
      { header: "% comissão", value: (row) => csvNumber(row.commissionRate * 100, 1) },
      { header: "Comissão", value: (row) => csvNumber(row.commission) },
    ]);
    toast.success("CSV de comissões gerado.");
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description={`Recebimentos, pendências e comissões · ${period.label}`}
        actions={
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="finance-period" className="sr-only">
                Período
              </Label>
              <Select
                value={periodKey}
                onValueChange={(value) => setPeriodKey(value as PeriodKey)}
              >
                <SelectTrigger id="finance-period" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PERIOD_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {loading && !summary ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Recebido"
            value={formatCurrency(summary?.received ?? 0)}
            icon={Wallet}
            hint={`${summary?.payments.length ?? 0} lançamentos`}
          />
          <StatTile
            label="A receber"
            value={formatCurrency(summary?.pending ?? 0)}
            icon={Hourglass}
            hint={`${summary?.pendingAppointments.length ?? 0} atendimentos`}
          />
          <StatTile
            label="Sinais recebidos"
            value={formatCurrency(summary?.deposits ?? 0)}
            icon={HandCoins}
          />
          <StatTile
            label="Comissões do período"
            value={formatCurrency(totalCommission)}
            icon={Banknote}
          />
        </div>
      )}

      <Tabs defaultValue="recebimentos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>

        {/* ---------------------------- Recebimentos --------------------- */}
        <TabsContent value="recebimentos" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <TrendChart
              title="Entradas por dia"
              description={period.label}
              data={(summary?.daily ?? []).map((point) => ({
                label: point.date.slice(8) + "/" + point.date.slice(5, 7),
                recebido: point.amount,
              }))}
              series={[{ key: "recebido", label: "Recebido" }]}
              formatValue={formatCurrency}
              formatAxis={formatCurrencyCompact}
              height={220}
            />

            <BreakdownChart
              title="Por forma de pagamento"
              description={period.label}
              data={(summary?.byMethod ?? []).map((item) => ({
                id: item.method,
                label: PAYMENT_METHOD_LABELS[item.method],
                value: item.amount,
              }))}
              formatValue={formatCurrency}
              centerLabel="recebido"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">
              Lançamentos ({summary?.payments.length ?? 0})
            </h2>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPayments}>
              <Download className="size-3.5" aria-hidden />
              Exportar CSV
            </Button>
          </div>

          {loading && !summary ? (
            <ListSkeleton rows={5} />
          ) : (summary?.payments ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum recebimento no período"
              description="Registre pagamentos nos atendimentos concluídos."
            />
          ) : (
            <ul className="space-y-2">
              {(summary?.payments ?? []).slice(0, 40).map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {payment.clientName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {payment.serviceName} · {formatDate(payment.paidAt)}
                    </span>
                  </span>
                  <Badge variant="outline">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </Badge>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ----------------------------- Pendências ---------------------- */}
        <TabsContent value="pendencias" className="mt-4 space-y-3">
          {loading && !summary ? (
            <ListSkeleton rows={5} />
          ) : (summary?.pendingAppointments ?? []).length === 0 ? (
            <EmptyState
              title="Nada em aberto"
              description="Todos os atendimentos do período estão quitados."
            />
          ) : (
            <ul className="space-y-2">
              {(summary?.pendingAppointments ?? []).map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {clientName.get(appointment.clientId) ?? "Cliente"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {serviceName.get(appointment.serviceId) ?? "Serviço"} ·{" "}
                      {formatDate(appointment.startsAt)}
                    </span>
                  </span>
                  <PaymentBadge status={appointment.paymentStatus} />
                  {appointment.depositAmount !== undefined && (
                    <Badge variant="secondary" className="text-[0.625rem]">
                      sinal {formatCurrency(appointment.depositAmount)}
                    </Badge>
                  )}
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(appointment.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ----------------------------- Comissões ----------------------- */}
        <TabsContent value="comissoes" className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Fechamento de {period.label} · total{" "}
              <strong className="text-foreground">
                {formatCurrency(totalCommission)}
              </strong>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={exportCommissions}
            >
              <Download className="size-3.5" aria-hidden />
              Exportar CSV
            </Button>
          </div>

          {loadingCommissions && !commissions ? (
            <ListSkeleton rows={4} />
          ) : (commissions ?? []).every((item) => item.appointments === 0) ? (
            <EmptyState
              title="Sem atendimentos concluídos no período"
              description="As comissões são calculadas sobre atendimentos concluídos."
            />
          ) : (
            <ul className="space-y-2">
              {(commissions ?? []).map((item) => (
                <li key={item.professionalId}>
                  <Collapsible className="rounded-xl border border-border bg-card">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="group flex w-full flex-wrap items-center gap-3 px-3 py-3 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {item.professionalName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {item.appointments} atendimentos ·{" "}
                            {formatCurrency(item.grossRevenue)} em serviços ·{" "}
                            {formatPercent(item.commissionRate)} de comissão
                          </span>
                        </span>
                        <span className="font-display text-lg font-semibold tabular-nums">
                          {formatCurrency(item.commission)}
                        </span>
                        <ChevronDown
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                          aria-hidden
                        />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {item.lines.length === 0 ? (
                        <p className="border-t border-border px-3 py-3 text-xs text-muted-foreground">
                          Nenhum atendimento concluído neste período.
                        </p>
                      ) : (
                        <div className="scrollbar-thin max-h-72 overflow-auto border-t border-border">
                          <table className="w-full text-sm">
                            <caption className="sr-only">
                              Detalhamento de comissão de {item.professionalName}
                            </caption>
                            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium">
                                  Data
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium">
                                  Cliente
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium">
                                  Serviço
                                </th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium">
                                  Serviço
                                </th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium">
                                  Comissão
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.lines.map((line) => (
                                <tr key={line.appointmentId} className="border-t border-border">
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    {formatDate(line.date)}
                                  </td>
                                  <td className="max-w-40 truncate px-3 py-1.5">
                                    {line.clientName}
                                  </td>
                                  <td className="max-w-48 truncate px-3 py-1.5">
                                    {line.serviceName}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">
                                    {formatCurrency(line.price)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                                    {formatCurrency(line.commission)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
