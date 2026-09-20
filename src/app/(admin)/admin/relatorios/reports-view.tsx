"use client";

import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";
import {
  Ban,
  Download,
  Gauge,
  Repeat,
  TrendingUp,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { CardsSkeleton, ChartSkeleton, ErrorState } from "@/components/common/states";
import { RankingChart } from "@/components/charts/ranking-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { professionalRepository, reportRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { csvNumber, downloadCsv } from "@/lib/csv";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { toDayKey } from "@/lib/scheduling";

type PeriodKey = "7d" | "30d" | "month" | "year";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  month: "Mês atual",
  year: "Ano atual",
};

function resolvePeriod(key: PeriodKey) {
  const now = new Date();
  if (key === "7d") return { from: toDayKey(subDays(now, 6)), to: toDayKey(now) };
  if (key === "month") {
    return { from: toDayKey(startOfMonth(now)), to: toDayKey(endOfMonth(now)) };
  }
  if (key === "year") {
    return { from: toDayKey(startOfYear(now)), to: toDayKey(endOfYear(now)) };
  }
  return { from: toDayKey(subDays(now, 29)), to: toDayKey(now) };
}

const ALL = "__all__";

export function ReportsView() {
  const { activeUnitId, units } = useSession();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30d");
  const [unitScope, setUnitScope] = useState<string>(activeUnitId ?? ALL);
  const [professionalId, setProfessionalId] = useState<string>(ALL);

  const period = useMemo(() => resolvePeriod(periodKey), [periodKey]);
  const filters = {
    ...period,
    unitId: unitScope === ALL ? undefined : unitScope,
    professionalId: professionalId === ALL ? undefined : professionalId,
  };

  const { data: professionals } = useAsyncData(
    () => professionalRepository.list({ unitId: filters.unitId }),
    [filters.unitId],
  );

  const {
    data: revenue,
    loading,
    error,
    reload,
  } = useAsyncData(
    () => reportRepository.revenue(filters),
    [filters.from, filters.to, filters.unitId, filters.professionalId],
  );

  const { data: byProfessional } = useAsyncData(
    () => reportRepository.byProfessional(filters),
    [filters.from, filters.to, filters.unitId],
  );

  const { data: byService } = useAsyncData(
    () => reportRepository.byService(filters),
    [filters.from, filters.to, filters.unitId, filters.professionalId],
  );

  const { data: clientsReport } = useAsyncData(
    () => reportRepository.clients(filters),
    [filters.from, filters.to, filters.unitId],
  );

  const { data: cancellations } = useAsyncData(
    () => reportRepository.cancellations(filters),
    [filters.from, filters.to, filters.unitId, filters.professionalId],
  );

  const { data: occupancy } = useAsyncData(
    () => reportRepository.occupancy(filters),
    [filters.from, filters.to, filters.unitId, filters.professionalId],
  );

  const totalRevenue = (revenue ?? []).reduce((sum, point) => sum + point.revenue, 0);
  const totalAppointments = (revenue ?? []).reduce(
    (sum, point) => sum + point.appointments,
    0,
  );

  const exportRevenue = () => {
    downloadCsv(`faturamento-${period.from}-a-${period.to}`, revenue ?? [], [
      { header: "Data", value: (row) => formatDate(row.date) },
      { header: "Atendimentos", value: (row) => row.appointments },
      { header: "Faturamento", value: (row) => csvNumber(row.revenue) },
    ]);
    toast.success("CSV gerado.");
  };

  const exportByProfessional = () => {
    downloadCsv(`por-profissional-${period.from}-a-${period.to}`, byProfessional ?? [], [
      { header: "Profissional", value: (row) => row.name },
      { header: "Atendimentos", value: (row) => row.value },
      { header: "Faturamento", value: (row) => csvNumber(row.secondary ?? 0) },
    ]);
    toast.success("CSV gerado.");
  };

  const exportByService = () => {
    downloadCsv(`por-servico-${period.from}-a-${period.to}`, byService ?? [], [
      { header: "Serviço", value: (row) => row.name },
      { header: "Atendimentos", value: (row) => row.value },
      { header: "Faturamento", value: (row) => csvNumber(row.secondary ?? 0) },
    ]);
    toast.success("CSV gerado.");
  };

  const exportCancellations = () => {
    downloadCsv(
      `cancelamentos-${period.from}-a-${period.to}`,
      cancellations?.byProfessional ?? [],
      [
        { header: "Profissional", value: (row) => row.name },
        { header: "Cancelamentos", value: (row) => row.value },
        { header: "Faltas", value: (row) => row.secondary ?? 0 },
      ],
    );
    toast.success("CSV gerado.");
  };

  const exportOccupancy = () => {
    downloadCsv(`ocupacao-${period.from}-a-${period.to}`, occupancy?.daily ?? [], [
      { header: "Data", value: (row) => formatDate(row.date) },
      { header: "Ocupação (%)", value: (row) => csvNumber(row.occupancy * 100, 1) },
    ]);
    toast.success("CSV gerado.");
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        description="Faturamento, clientes, ocupação e cancelamentos. Tudo exportável em CSV."
      />

      {/* Filtros */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-period" className="text-xs">
            Período
          </Label>
          <Select value={periodKey} onValueChange={(value) => setPeriodKey(value as PeriodKey)}>
            <SelectTrigger id="report-period" className="w-full">
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

        <div className="space-y-1.5">
          <Label htmlFor="report-unit" className="text-xs">
            Unidade
          </Label>
          <Select value={unitScope} onValueChange={setUnitScope}>
            <SelectTrigger id="report-unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as unidades</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="report-professional" className="text-xs">
            Profissional
          </Label>
          <Select value={professionalId} onValueChange={setProfessionalId}>
            <SelectTrigger id="report-professional" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {(professionals ?? []).map((pro) => (
                <SelectItem key={pro.id} value={pro.id}>
                  {pro.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !revenue ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Faturamento"
            value={formatCurrency(totalRevenue)}
            icon={TrendingUp}
          />
          <StatTile
            label="Atendimentos"
            value={formatNumber(totalAppointments)}
            hint="concluídos"
            icon={Users}
          />
          <StatTile
            label="Ocupação média"
            value={formatPercent(occupancy?.average ?? 0)}
            icon={Gauge}
          />
          <StatTile
            label="Taxa de no-show"
            value={formatPercent(cancellations?.noShowRate ?? 0, 1)}
            icon={UserX}
            invertDelta
          />
        </div>
      )}

      <Tabs defaultValue="faturamento">
        <TabsList className="flex-wrap">
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="ocupacao">Ocupação</TabsTrigger>
          <TabsTrigger value="cancelamentos">Cancelamentos</TabsTrigger>
        </TabsList>

        {/* --------------------------- Faturamento ----------------------- */}
        <TabsContent value="faturamento" className="mt-4 space-y-4">
          {loading && !revenue ? (
            <ChartSkeleton />
          ) : (
            <TrendChart
              title="Faturamento no período"
              description={PERIOD_LABELS[periodKey]}
              data={(revenue ?? []).map((point) => ({
                label: point.label,
                faturamento: point.revenue,
              }))}
              series={[{ key: "faturamento", label: "Faturamento" }]}
              formatValue={formatCurrency}
              formatAxis={formatCurrencyCompact}
              action={
                <Button variant="ghost" size="icon-sm" onClick={exportRevenue} aria-label="Exportar faturamento em CSV">
                  <Download className="size-3.5" />
                </Button>
              }
            />
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <RankingChart
              title="Por profissional"
              data={byProfessional ?? []}
              valueLabel="Atendimentos"
              formatValue={formatNumber}
              secondaryLabel="Faturamento"
              formatSecondary={formatCurrency}
            />
            <RankingChart
              title="Por serviço"
              data={byService ?? []}
              valueLabel="Atendimentos"
              formatValue={formatNumber}
              secondaryLabel="Faturamento"
              formatSecondary={formatCurrency}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportByProfessional}>
              <Download className="size-3.5" aria-hidden />
              CSV por profissional
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportByService}>
              <Download className="size-3.5" aria-hidden />
              CSV por serviço
            </Button>
          </div>
        </TabsContent>

        {/* ----------------------------- Clientes ------------------------ */}
        <TabsContent value="clientes" className="mt-4 space-y-4">
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Total de clientes"
              value={formatNumber(clientsReport?.total ?? 0)}
              icon={Users}
            />
            <StatTile
              label="Novos no período"
              value={formatNumber(clientsReport?.newInPeriod ?? 0)}
              icon={UserPlus}
            />
            <StatTile
              label="Recorrentes"
              value={formatNumber(clientsReport?.recurring ?? 0)}
              hint="3+ atendimentos"
              icon={Repeat}
            />
            <StatTile
              label="Inativos há 90 dias"
              value={formatNumber(clientsReport?.inactive90 ?? 0)}
              icon={UserX}
              invertDelta
            />
          </div>

          <TrendChart
            title="Novos e recorrentes por mês"
            description="Últimos 12 meses"
            data={(clientsReport?.monthly ?? []).map((point) => ({
              label: point.label,
              novos: point.novos,
              recorrentes: point.recorrentes,
            }))}
            series={[
              { key: "novos", label: "Novos" },
              { key: "recorrentes", label: "Recorrentes" },
            ]}
            formatValue={formatNumber}
          />

          <p className="text-sm text-muted-foreground">
            Taxa de retenção no período:{" "}
            <strong className="text-foreground">
              {formatPercent(clientsReport?.retentionRate ?? 0, 1)}
            </strong>{" "}
            dos clientes voltaram ao menos três vezes.
          </p>
        </TabsContent>

        {/* ----------------------------- Ocupação ------------------------ */}
        <TabsContent value="ocupacao" className="mt-4 space-y-4">
          <TrendChart
            title="Ocupação da agenda"
            description={PERIOD_LABELS[periodKey]}
            data={(occupancy?.daily ?? []).map((point) => ({
              label: point.label,
              ocupacao: Math.round(point.occupancy * 100),
            }))}
            series={[{ key: "ocupacao", label: "Ocupação" }]}
            formatValue={(value) => `${value}%`}
            action={
              <Button variant="ghost" size="icon-sm" onClick={exportOccupancy} aria-label="Exportar ocupação em CSV">
                <Download className="size-3.5" />
              </Button>
            }
          />

          <RankingChart
            title="Ocupação por profissional"
            description={PERIOD_LABELS[periodKey]}
            data={(occupancy?.byProfessional ?? []).map((item) => ({
              ...item,
              value: Math.round(item.value * 100),
            }))}
            valueLabel="Ocupação"
            formatValue={(value) => `${value}%`}
          />
        </TabsContent>

        {/* -------------------------- Cancelamentos ---------------------- */}
        <TabsContent value="cancelamentos" className="mt-4 space-y-4">
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Agendamentos"
              value={formatNumber(cancellations?.total ?? 0)}
              icon={Users}
            />
            <StatTile
              label="Cancelados"
              value={formatNumber(cancellations?.cancelled ?? 0)}
              hint={formatPercent(cancellations?.cancellationRate ?? 0, 1)}
              icon={Ban}
              invertDelta
            />
            <StatTile
              label="Faltas"
              value={formatNumber(cancellations?.noShow ?? 0)}
              hint={formatPercent(cancellations?.noShowRate ?? 0, 1)}
              icon={UserX}
              invertDelta
            />
            <StatTile
              label="Comparecimento"
              value={formatPercent(
                1 -
                  (cancellations?.cancellationRate ?? 0) -
                  (cancellations?.noShowRate ?? 0),
                1,
              )}
              icon={Gauge}
            />
          </div>

          <TrendChart
            title="Cancelamentos e faltas por dia da semana"
            data={(cancellations?.byWeekday ?? []).map((point) => ({
              label: point.label,
              cancelados: point.cancelled,
              faltas: point.noShow,
            }))}
            series={[
              { key: "cancelados", label: "Cancelados" },
              { key: "faltas", label: "Faltas" },
            ]}
            formatValue={formatNumber}
            height={220}
          />

          <RankingChart
            title="Cancelamentos por profissional"
            data={cancellations?.byProfessional ?? []}
            valueLabel="Cancelamentos"
            formatValue={formatNumber}
            secondaryLabel="Faltas"
            formatSecondary={formatNumber}
            emptyMessage="Nenhum cancelamento no período — ótimo sinal."
          />

          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCancellations}>
            <Download className="size-3.5" aria-hidden />
            Exportar CSV
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
