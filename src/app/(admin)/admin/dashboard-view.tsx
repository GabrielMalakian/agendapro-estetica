"use client";

import { addDays, subDays } from "date-fns";
import {
  ArrowRight,
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CircleSlash,
  Gauge,
  UserX,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import {
  CardsSkeleton,
  ChartSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
} from "@/components/common/states";
import { RankingChart } from "@/components/charts/ranking-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatusBadge } from "@/components/scheduling/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  clientRepository,
  professionalRepository,
  reportRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  formatTime,
  formatWeekdayLong,
} from "@/lib/format";
import { toDayKey } from "@/lib/scheduling";

export function DashboardView() {
  const { activeUnitId, activeUnit } = useSession();

  const range = {
    from: toDayKey(subDays(new Date(), 29)),
    to: toDayKey(new Date()),
  };
  // Mesma janela, 30 dias antes — base da comparação dos cards.
  const previousRange = {
    from: toDayKey(subDays(new Date(), 59)),
    to: toDayKey(subDays(new Date(), 30)),
  };

  const {
    data: today,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      activeUnitId ? reportRepository.today(activeUnitId) : Promise.resolve(null),
    [activeUnitId],
  );

  const { data: revenue, loading: loadingRevenue } = useAsyncData(
    () =>
      activeUnitId
        ? reportRepository.revenue({ unitId: activeUnitId, ...range })
        : Promise.resolve([]),
    [activeUnitId, range.from, range.to],
  );

  const { data: previousRevenue } = useAsyncData(
    () =>
      activeUnitId
        ? reportRepository.revenue({ unitId: activeUnitId, ...previousRange })
        : Promise.resolve([]),
    [activeUnitId, previousRange.from, previousRange.to],
  );

  const { data: byProfessional } = useAsyncData(
    () =>
      activeUnitId
        ? reportRepository.byProfessional({ unitId: activeUnitId, ...range })
        : Promise.resolve([]),
    [activeUnitId, range.from, range.to],
  );

  const { data: byService } = useAsyncData(
    () =>
      activeUnitId
        ? reportRepository.byService({ unitId: activeUnitId, ...range })
        : Promise.resolve([]),
    [activeUnitId, range.from, range.to],
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

  const clientName = new Map((clients ?? []).map((item) => [item.id, item.name]));
  const professionalName = new Map(
    (professionals ?? []).map((item) => [item.id, item.name]),
  );
  const serviceName = new Map((services ?? []).map((item) => [item.id, item.name]));

  const monthRevenue = (revenue ?? []).reduce((sum, point) => sum + point.revenue, 0);
  const previousTotal = (previousRevenue ?? []).reduce(
    (sum, point) => sum + point.revenue,
    0,
  );
  const revenueDelta =
    previousTotal > 0 ? (monthRevenue - previousTotal) / previousTotal : undefined;

  const todayWeekdayName = formatWeekdayLong(new Date());
  const closedToday = Boolean(
    activeUnit?.businessHours.find(
      (item) => item.weekday === new Date().getDay(),
    )?.closed,
  );

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`${activeUnit?.name ?? "Unidade"} · visão de hoje e dos últimos 30 dias`}
        actions={
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/admin/agenda">
              Ver agenda
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        }
      />

      {/* Hoje */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Hoje</h2>

        {/*
          Sem este aviso, um domingo de porta fechada aparece como seis cards
          zerados — o que parece defeito, e não expediente encerrado.
        */}
        {closedToday && (
          <Alert>
            <CalendarOff className="size-4" aria-hidden />
            <AlertDescription>
              {activeUnit?.name} não abre {todayWeekdayName}. Os números de hoje
              ficam zerados; os gráficos abaixo cobrem os últimos 30 dias.
            </AlertDescription>
          </Alert>
        )}

        {loading && !today ? (
          <CardsSkeleton count={6} />
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatTile
              label="Atendimentos"
              value={formatNumber(today?.appointments ?? 0)}
              icon={CalendarCheck}
            />
            <StatTile
              label="Faturamento"
              value={formatCurrency(today?.revenue ?? 0)}
              icon={Wallet}
            />
            <StatTile
              label="Cancelamentos"
              value={formatNumber(today?.cancellations ?? 0)}
              icon={Ban}
            />
            <StatTile
              label="Faltas"
              value={formatNumber(today?.noShows ?? 0)}
              icon={UserX}
            />
            <StatTile
              label="Horários livres"
              value={formatNumber(today?.freeSlots ?? 0)}
              icon={CircleSlash}
            />
            <StatTile
              label="Ocupação"
              value={formatPercent(today?.occupancyRate ?? 0)}
              icon={Gauge}
            />
          </div>
        )}
      </section>

      {/* Faturamento */}
      {loadingRevenue && !revenue ? (
        <ChartSkeleton />
      ) : (
        <TrendChart
          title="Faturamento dos últimos 30 dias"
          description={`${formatCurrency(monthRevenue)} no período`}
          data={(revenue ?? []).map((point) => ({
            label: point.label,
            faturamento: point.revenue,
          }))}
          series={[{ key: "faturamento", label: "Faturamento" }]}
          formatValue={formatCurrency}
          formatAxis={formatCurrencyCompact}
          action={
            revenueDelta !== undefined ? (
              <span
                className={
                  revenueDelta >= 0
                    ? "text-xs font-medium text-success"
                    : "text-xs font-medium text-destructive"
                }
              >
                {revenueDelta >= 0 ? "+" : "−"}
                {formatPercent(Math.abs(revenueDelta))} vs. 30 dias anteriores
              </span>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <RankingChart
          title="Atendimentos por profissional"
          description="Últimos 30 dias"
          data={byProfessional ?? []}
          valueLabel="Atendimentos"
          formatValue={formatNumber}
          secondaryLabel="Faturamento"
          formatSecondary={formatCurrency}
        />

        <RankingChart
          title="Serviços mais vendidos"
          description="Últimos 30 dias"
          data={byService ?? []}
          valueLabel="Atendimentos"
          formatValue={formatNumber}
          secondaryLabel="Faturamento"
          formatSecondary={formatCurrency}
        />
      </div>

      {/* Próximos do dia */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Próximos atendimentos de hoje</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/agenda">Abrir agenda</Link>
          </Button>
        </div>

        {loading && !today ? (
          <ListSkeleton rows={3} />
        ) : (today?.next ?? []).length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nada mais para hoje"
            description={
              (today?.appointments ?? 0) > 0
                ? "Todos os atendimentos do dia já passaram."
                : "A agenda de hoje está vazia. Que tal divulgar horários livres?"
            }
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/agenda">Ver agenda de amanhã</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {(today?.next ?? []).map((appointment) => (
              <li
                key={appointment.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatTime(appointment.startsAt)}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground tabular-nums">
                    {formatTime(appointment.endsAt)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {clientName.get(appointment.clientId) ?? "Cliente"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {serviceName.get(appointment.serviceId) ?? "Serviço"} ·{" "}
                    {professionalName.get(appointment.professionalId) ?? ""}
                  </span>
                </span>
                <StatusBadge status={appointment.status} showIcon={false} />
                <span className="text-sm tabular-nums">
                  {formatCurrency(appointment.price)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Período analisado: {range.from.split("-").reverse().join("/")} a{" "}
        {toDayKey(addDays(new Date(), 0)).split("-").reverse().join("/")}.
      </p>
    </div>
  );
}
