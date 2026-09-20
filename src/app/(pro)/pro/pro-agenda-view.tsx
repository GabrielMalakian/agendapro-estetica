"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  isSameDay,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { BlockFormDialog } from "@/components/scheduling/block-form-dialog";
import { StatusBadge } from "@/components/scheduling/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  appointmentRepository,
  clientRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useCurrentProfessional } from "@/hooks/use-current-professional";
import {
  firstName,
  formatCountdown,
  formatCurrency,
  formatRelativeDay,
  formatTime,
  formatWeekdayShort,
} from "@/lib/format";
import { toDayKey } from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

import { ProAppointmentSheet } from "./pro-appointment-sheet";

type ProView = "DAY" | "WEEK";

export function ProAgendaView() {
  const { professional, loading: loadingPro } = useCurrentProfessional();
  const [view, setView] = useState<ProView>("DAY");
  const [cursor, setCursor] = useState(() => new Date());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [autoJumped, setAutoJumped] = useState(false);
  const [, forceTick] = useState(0);

  // A contagem regressiva do próximo atendimento precisa reavaliar sozinha.
  useEffect(() => {
    const timer = window.setInterval(() => forceTick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const range =
    view === "DAY"
      ? { from: toDayKey(cursor), to: toDayKey(cursor) }
      : {
          from: toDayKey(startOfWeek(cursor, { weekStartsOn: 0 })),
          to: toDayKey(endOfWeek(cursor, { weekStartsOn: 0 })),
        };

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
            ...range,
          })
        : Promise.resolve([]),
    [professional?.id, range.from, range.to],
    { enabled: Boolean(professional) },
  );

  /**
   * Próximos 14 dias — usado só para decidir em que dia abrir a tela.
   * Se hoje não tem nada (folga, domingo), a agenda pula para o próximo dia
   * com atendimento em vez de mostrar uma lista vazia.
   */
  const { data: lookahead } = useAsyncData(
    () =>
      professional
        ? appointmentRepository.list({
            professionalId: professional.id,
            from: toDayKey(new Date()),
            to: toDayKey(addDays(new Date(), 14)),
          })
        : Promise.resolve([]),
    [professional?.id],
    { enabled: Boolean(professional) && !autoJumped },
  );

  useEffect(() => {
    if (autoJumped || !lookahead) return;
    setAutoJumped(true);
    const today = toDayKey(new Date());
    const upcoming = lookahead
      .filter((item) => item.status !== "CANCELLED")
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (upcoming.some((item) => toDayKey(new Date(item.startsAt)) === today)) return;
    const first = upcoming[0];
    if (first) setCursor(new Date(first.startsAt));
  }, [lookahead, autoJumped]);

  const { data: clients } = useAsyncData(
    () =>
      professional
        ? clientRepository.list({ unitId: professional.unitId })
        : Promise.resolve([]),
    [professional?.unitId],
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

  const clientName = new Map((clients ?? []).map((item) => [item.id, item.name]));
  const serviceName = new Map((services ?? []).map((item) => [item.id, item.name]));

  const active = (appointments ?? []).filter(
    (item) => item.status !== "CANCELLED",
  );

  const now = new Date();
  const next = active
    .filter(
      (item) =>
        new Date(item.endsAt) > now &&
        item.status !== "COMPLETED" &&
        item.status !== "NO_SHOW",
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  if (loadingPro && !professional) return <ListSkeleton rows={4} />;

  if (!professional) {
    return (
      <EmptyState
        title="Perfil profissional não encontrado"
        description="Esta conta não está vinculada a uma agenda."
      />
    );
  }

  const renderRow = (appointment: Appointment, highlight = false) => (
    <li key={appointment.id}>
      <button
        type="button"
        onClick={() => setDetailId(appointment.id)}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
          highlight
            ? "border-primary/50 ring-2 ring-primary/15"
            : "border-border hover:bg-accent/40",
          appointment.status === "COMPLETED" && "opacity-70",
        )}
      >
        <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5">
          <span className="text-sm font-semibold tabular-nums">
            {formatTime(appointment.startsAt)}
          </span>
          <span className="text-[0.625rem] text-muted-foreground tabular-nums">
            {formatTime(appointment.endsAt)}
          </span>
        </span>

        <span className="min-w-0 flex-1 space-y-1">
          <span className="block truncate font-medium">
            {clientName.get(appointment.clientId) ?? "Cliente"}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {serviceName.get(appointment.serviceId) ?? "Serviço"}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <StatusBadge status={appointment.status} showIcon={false} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {appointment.price > 0 ? formatCurrency(appointment.price) : "Pacote"}
            </span>
          </span>
        </span>
      </button>
    </li>
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Olá, {firstName(professional.name)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {active.length === 0
            ? "Nenhum atendimento no período."
            : `${active.length} ${active.length === 1 ? "atendimento" : "atendimentos"} ${view === "DAY" ? formatRelativeDay(cursor).toLowerCase() : "nesta semana"}.`}
        </p>
      </header>

      {/* Próximo atendimento em destaque */}
      {next && (
        <Card className="border-primary/40 bg-accent/40">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-primary" aria-hidden />
              <span className="text-xs font-medium tracking-wide text-primary uppercase">
                Próximo atendimento
              </span>
              <Badge variant="secondary" className="ml-auto tabular-nums">
                {formatCountdown(next.startsAt)}
              </Badge>
            </div>

            <div className="space-y-0.5">
              <p className="font-display text-lg font-semibold">
                {clientName.get(next.clientId) ?? "Cliente"}
              </p>
              <p className="text-sm text-muted-foreground">
                {serviceName.get(next.serviceId) ?? "Serviço"} ·{" "}
                {formatTime(next.startsAt)} às {formatTime(next.endsAt)}
              </p>
            </div>

            <Button className="w-full" onClick={() => setDetailId(next.id)}>
              Abrir atendimento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Período anterior"
          onClick={() => setCursor((current) => addDays(current, view === "DAY" ? -1 : -7))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setCursor(new Date())}
        >
          <CalendarDays className="size-3.5" aria-hidden />
          Hoje
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Próximo período"
          onClick={() => setCursor((current) => addDays(current, view === "DAY" ? 1 : 7))}
        >
          <ChevronRight className="size-4" />
        </Button>

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && setView(value as ProView)}
          variant="outline"
          size="sm"
          className="ml-auto"
          aria-label="Visão da agenda"
        >
          <ToggleGroupItem value="DAY" className="px-3">
            Dia
          </ToggleGroupItem>
          <ToggleGroupItem value="WEEK" className="px-3">
            Semana
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setBlockOpen(true)}
        >
          <Lock className="size-3.5" aria-hidden />
          Bloquear
        </Button>
      </div>

      <p className="text-sm font-medium first-letter:uppercase">
        {view === "DAY" ? formatRelativeDay(cursor) : "Semana"}
      </p>

      {/* Lista */}
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !appointments ? (
        <ListSkeleton rows={4} />
      ) : view === "DAY" ? (
        active.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Dia livre"
            description="Nenhum atendimento marcado para esta data."
          />
        ) : (
          <ul className="space-y-2">
            {active
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((appointment) => renderRow(appointment, appointment.id === next?.id))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          {eachDayOfInterval({
            start: startOfWeek(cursor, { weekStartsOn: 0 }),
            end: endOfWeek(cursor, { weekStartsOn: 0 }),
          }).map((day) => {
            const dayItems = active
              .filter((item) => isSameDay(new Date(item.startsAt), day))
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

            return (
              <section key={day.toISOString()} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-muted-foreground uppercase">
                    {formatWeekdayShort(day)}
                  </span>
                  <span className="tabular-nums">{day.getDate()}</span>
                  {isSameDay(day, new Date()) && (
                    <Badge variant="secondary" className="text-[0.625rem]">
                      hoje
                    </Badge>
                  )}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {dayItems.length === 0 ? "livre" : `${dayItems.length} horários`}
                  </span>
                </h2>
                {dayItems.length > 0 && (
                  <ul className="space-y-2">
                    {dayItems.map((appointment) => renderRow(appointment))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <BlockFormDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        unitId={professional.unitId}
        lockedProfessionalId={professional.id}
        defaultDate={cursor}
        onSaved={() => reload()}
      />

      <ProAppointmentSheet
        appointmentId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => !open && setDetailId(null)}
        onChanged={() => reload()}
      />
    </div>
  );
}
