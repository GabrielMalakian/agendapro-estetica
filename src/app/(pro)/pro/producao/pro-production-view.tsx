"use client";

import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import {
  CalendarCheck,
  Gauge,
  Percent,
  Star,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { CardsSkeleton, ChartSkeleton, ErrorState } from "@/components/common/states";
import { RankingChart } from "@/components/charts/ranking-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  appointmentRepository,
  engagementRepository,
  reportRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useCurrentProfessional } from "@/hooks/use-current-professional";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatMonthYear,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { toDayKey } from "@/lib/scheduling";

const MONTH_OPTIONS = [0, 1, 2, 3, 4, 5];

export function ProProductionView() {
  const { professional } = useCurrentProfessional();
  const [monthsAgo, setMonthsAgo] = useState(0);

  const period = useMemo(() => {
    const reference = subMonths(new Date(), monthsAgo);
    return {
      label: formatMonthYear(reference),
      from: toDayKey(startOfMonth(reference)),
      to: toDayKey(endOfMonth(reference)),
    };
  }, [monthsAgo]);

  const {
    data: appointments,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      professional
        ? appointmentRepository.list({
            professionalId: professional.id,
            from: period.from,
            to: period.to,
          })
        : Promise.resolve([]),
    [professional?.id, period.from, period.to],
    { enabled: Boolean(professional) },
  );

  const { data: revenue } = useAsyncData(
    () =>
      professional
        ? reportRepository.revenue({
            unitId: professional.unitId,
            professionalId: professional.id,
            from: period.from,
            to: period.to,
          })
        : Promise.resolve([]),
    [professional?.id, professional?.unitId, period.from, period.to],
    { enabled: Boolean(professional) },
  );

  const { data: occupancy } = useAsyncData(
    () =>
      professional
        ? reportRepository.occupancy({
            unitId: professional.unitId,
            professionalId: professional.id,
            from: period.from,
            to: period.to,
          })
        : Promise.resolve(null),
    [professional?.id, professional?.unitId, period.from, period.to],
    { enabled: Boolean(professional) },
  );

  const { data: reviews } = useAsyncData(
    () =>
      professional
        ? engagementRepository.listReviews({ professionalId: professional.id })
        : Promise.resolve([]),
    [professional?.id],
    { enabled: Boolean(professional) },
  );

  const { data: services } = useAsyncData(
    () =>
      professional
        ? serviceRepository.list({ unitId: professional.unitId })
        : Promise.resolve([]),
    [professional?.unitId],
    { enabled: Boolean(professional) },
  );

  const completed = (appointments ?? []).filter(
    (item) => item.status === "COMPLETED",
  );
  const grossRevenue = completed.reduce((sum, item) => sum + item.price, 0);
  const commission = grossRevenue * (professional?.commissionRate ?? 0);
  const averageRating =
    (reviews ?? []).length > 0
      ? (reviews ?? []).reduce((sum, item) => sum + item.rating, 0) /
        (reviews ?? []).length
      : null;

  const byService = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; value: number; secondary: number }>();
    for (const appointment of completed) {
      const service = (services ?? []).find((item) => item.id === appointment.serviceId);
      if (!service) continue;
      const current = counts.get(service.id) ?? {
        id: service.id,
        name: service.name,
        value: 0,
        secondary: 0,
      };
      current.value += 1;
      current.secondary += appointment.price;
      counts.set(service.id, current);
    }
    return [...counts.values()];
  }, [completed, services]);

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Minha produção
        </h1>
        <p className="text-sm text-muted-foreground">
          Seus números do período. O financeiro da empresa fica com a gestão.
        </p>
      </header>

      <Select
        value={String(monthsAgo)}
        onValueChange={(value) => setMonthsAgo(Number(value))}
      >
        <SelectTrigger className="w-full sm:w-56" aria-label="Período">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_OPTIONS.map((offset) => (
            <SelectItem key={offset} value={String(offset)}>
              <span className="first-letter:uppercase">
                {formatMonthYear(subMonths(new Date(), offset))}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading && !appointments ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Atendimentos"
            value={formatNumber(completed.length)}
            hint="concluídos"
            icon={CalendarCheck}
          />
          <StatTile
            label="Faturamento"
            value={formatCurrency(grossRevenue)}
            icon={Wallet}
          />
          <StatTile
            label="Comissão"
            value={formatCurrency(commission)}
            hint={formatPercent(professional?.commissionRate ?? 0)}
            icon={Percent}
          />
          <StatTile
            label="Ocupação"
            value={formatPercent(occupancy?.average ?? 0)}
            hint="da sua grade"
            icon={Gauge}
          />
        </div>
      )}

      {averageRating !== null && (
        <Alert>
          <Star className="size-4" aria-hidden />
          <AlertDescription>
            Sua avaliação média é{" "}
            <strong>{averageRating.toFixed(1)} de 5</strong> em{" "}
            {(reviews ?? []).length} avaliações.
          </AlertDescription>
        </Alert>
      )}

      {loading && !revenue ? (
        <ChartSkeleton />
      ) : (
        <TrendChart
          title="Faturamento gerado no mês"
          description={period.label}
          data={(revenue ?? []).map((point) => ({
            label: point.label,
            faturamento: point.revenue,
          }))}
          series={[{ key: "faturamento", label: "Faturamento" }]}
          formatValue={formatCurrency}
          formatAxis={formatCurrencyCompact}
          height={220}
        />
      )}

      <RankingChart
        title="Seus serviços mais realizados"
        description={period.label}
        data={byService}
        valueLabel="Atendimentos"
        formatValue={(value) => formatNumber(value)}
        secondaryLabel="Faturamento"
        formatSecondary={formatCurrency}
        limit={6}
        emptyMessage="Nenhum atendimento concluído neste mês."
      />
    </div>
  );
}
