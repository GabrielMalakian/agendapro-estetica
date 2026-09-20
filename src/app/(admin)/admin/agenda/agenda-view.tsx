"use client";

import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  Lock,
  Plus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { ChartSkeleton, ErrorState } from "@/components/common/states";
import { AgendaDayGrid } from "@/components/scheduling/agenda-day-grid";
import { AgendaMonthView } from "@/components/scheduling/agenda-month-view";
import type {
  AgendaColumn,
  AgendaGrouping,
  AgendaItem,
  AgendaView,
} from "@/components/scheduling/agenda-types";
import { AgendaWeekView } from "@/components/scheduling/agenda-week-view";
import {
  AppointmentDetailSheet,
} from "@/components/scheduling/appointment-detail-sheet";
import {
  AppointmentFormDialog,
  type AppointmentFormDefaults,
} from "@/components/scheduling/appointment-form-dialog";
import { BlockFormDialog } from "@/components/scheduling/block-form-dialog";
import { StatusLegend } from "@/components/scheduling/status-badge";
import { WaitlistPanel } from "@/components/scheduling/waitlist-panel";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  AppointmentConflictError,
  appointmentRepository,
  clientRepository,
  companyRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import {
  formatCurrency,
  formatDateLong,
  formatMonthYear,
  formatTime,
} from "@/lib/format";
import { toDayKey } from "@/lib/scheduling";
import type { Appointment } from "@/types";

const VIEW_LABELS: Record<AgendaView, string> = {
  DAY: "Dia",
  WEEK: "Semana",
  MONTH: "Mês",
};

export function AgendaView() {
  const { activeUnitId, activeUnit } = useSession();
  const [view, setView] = useState<AgendaView>("DAY");
  const [grouping, setGrouping] = useState<AgendaGrouping>("PROFESSIONAL");
  const [cursor, setCursor] = useState(() => new Date());
  const [autoJumped, setAutoJumped] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<AppointmentFormDefaults>();
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  /**
   * Se a unidade estiver fechada hoje (domingo, por exemplo), abre direto no
   * próximo dia com expediente — ninguém quer começar o dia olhando para uma
   * grade vazia. Acontece uma única vez, e só enquanto o usuário não navegou.
   */
  useEffect(() => {
    if (autoJumped || !activeUnit) return;
    setAutoJumped(true);
    for (let offset = 0; offset < 7; offset += 1) {
      const day = addDays(new Date(), offset);
      const hours = activeUnit.businessHours.find(
        (item) => item.weekday === day.getDay(),
      );
      if (hours && !hours.closed) {
        if (offset > 0) setCursor(day);
        return;
      }
    }
  }, [activeUnit, autoJumped]);

  /* ------------------------------ período ------------------------------- */
  const range = useMemo(() => {
    if (view === "DAY") return { from: toDayKey(cursor), to: toDayKey(cursor) };
    if (view === "WEEK") {
      return {
        from: toDayKey(startOfWeek(cursor, { weekStartsOn: 0 })),
        to: toDayKey(endOfWeek(cursor, { weekStartsOn: 0 })),
      };
    }
    return {
      from: toDayKey(startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })),
      to: toDayKey(endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })),
    };
  }, [view, cursor]);

  /* ------------------------------- dados -------------------------------- */
  const {
    data: appointments,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      activeUnitId
        ? appointmentRepository.list({ unitId: activeUnitId, ...range })
        : Promise.resolve([]),
    [activeUnitId, range.from, range.to],
  );

  const { data: blocks } = useAsyncData(
    () =>
      activeUnitId
        ? appointmentRepository.listBlocks(activeUnitId)
        : Promise.resolve([]),
    [activeUnitId],
  );

  const { data: professionals } = useAsyncData(
    () =>
      activeUnitId
        ? professionalRepository.list({ unitId: activeUnitId, onlyActive: true })
        : Promise.resolve([]),
    [activeUnitId],
  );

  const { data: rooms } = useAsyncData(
    () => (activeUnitId ? companyRepository.listRooms(activeUnitId) : Promise.resolve([])),
    [activeUnitId],
  );

  const { data: clients } = useAsyncData(
    () => (activeUnitId ? clientRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  const { data: services } = useAsyncData(
    () => (activeUnitId ? serviceRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  /* ------------------------ colunas e itens da grade --------------------- */
  const clientName = useMemo(
    () => new Map((clients ?? []).map((item) => [item.id, item.name])),
    [clients],
  );
  const serviceName = useMemo(
    () => new Map((services ?? []).map((item) => [item.id, item.name])),
    [services],
  );
  const professionalName = useMemo(
    () => new Map((professionals ?? []).map((item) => [item.id, item.name])),
    [professionals],
  );

  const columns: AgendaColumn[] = useMemo(() => {
    if (grouping === "ROOM") {
      return (rooms ?? []).map((room) => ({
        id: room.id,
        name: room.name,
        subtitle:
          room.type === "CHAIR" ? "Cadeira" : room.type === "ROOM" ? "Sala" : "Equipamento",
      }));
    }

    const weekday = cursor.getDay();
    const dayKey = toDayKey(cursor);
    return (professionals ?? []).map((pro) => {
      const grid = pro.workingHours.find((item) => item.weekday === weekday);
      const off = pro.timeOff.find(
        (item) =>
          item.status === "APPROVED" &&
          item.allDay &&
          dayKey >= item.startDate &&
          dayKey <= item.endDate,
      );
      return {
        id: pro.id,
        name: pro.name,
        subtitle: grid?.enabled
          ? `${grid.startTime}–${grid.endTime}`
          : "Não atende neste dia",
        disabled: !grid?.enabled || Boolean(off),
        disabledReason: off
          ? `${off.reason} (${off.type === "VACATION" ? "férias" : "folga"})`
          : "Fora da grade de trabalho",
      };
    });
  }, [grouping, professionals, rooms, cursor]);

  const items: AgendaItem[] = useMemo(() => {
    const fromAppointments: AgendaItem[] = (appointments ?? []).map((appointment) => ({
      id: appointment.id,
      columnId:
        grouping === "ROOM" ? (appointment.roomId ?? "__none__") : appointment.professionalId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      title: clientName.get(appointment.clientId) ?? "Cliente",
      subtitle:
        grouping === "ROOM"
          ? `${serviceName.get(appointment.serviceId) ?? "Serviço"} · ${professionalName.get(appointment.professionalId) ?? ""}`
          : (serviceName.get(appointment.serviceId) ?? "Serviço"),
      meta: appointment.price > 0 ? formatCurrency(appointment.price) : "Pacote",
      kind: "APPOINTMENT",
      source: appointment,
    }));

    const fromBlocks: AgendaItem[] = (blocks ?? [])
      .filter((block) => {
        const key = toDayKey(new Date(block.startsAt));
        return key >= range.from && key <= range.to;
      })
      .flatMap((block) => {
        // Bloqueio da unidade inteira aparece em todas as colunas.
        const targets =
          grouping === "ROOM"
            ? block.roomId
              ? [block.roomId]
              : columns.map((column) => column.id)
            : block.professionalId
              ? [block.professionalId]
              : columns.map((column) => column.id);

        return targets.map((columnId) => ({
          id: `${block.id}:${columnId}`,
          columnId,
          startsAt: block.startsAt,
          endsAt: block.endsAt,
          status: "CANCELLED" as const,
          title: block.reason,
          subtitle: "Horário bloqueado",
          kind: "BLOCK" as const,
          source: null,
        }));
      });

    return [...fromAppointments, ...fromBlocks];
  }, [
    appointments,
    blocks,
    columns,
    grouping,
    clientName,
    serviceName,
    professionalName,
    range.from,
    range.to,
  ]);

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const appointment of appointments ?? []) {
      if (appointment.status !== "COMPLETED") continue;
      const key = toDayKey(new Date(appointment.startsAt));
      map.set(key, (map.get(key) ?? 0) + appointment.price);
    }
    return map;
  }, [appointments]);

  /* ---------------------- faixa de horas da timeline --------------------- */
  const { startHour, endHour } = useMemo(() => {
    const hours = activeUnit?.businessHours.filter((item) => !item.closed) ?? [];
    if (hours.length === 0) return { startHour: 8, endHour: 20 };
    const opens = Math.min(...hours.map((item) => Number(item.openTime.split(":")[0])));
    const closes = Math.max(
      ...hours.map((item) => Math.ceil(Number(item.closeTime.split(":")[0]))),
    );
    return { startHour: Math.max(0, opens - 1), endHour: Math.min(24, closes + 1) };
  }, [activeUnit]);

  /* ------------------------------- ações -------------------------------- */
  const step = (direction: 1 | -1) => {
    if (view === "DAY") setCursor((current) => addDays(current, direction));
    else if (view === "WEEK") setCursor((current) => addDays(current, direction * 7));
    else setCursor((current) => addMonths(current, direction));
  };

  const openCreate = (defaults?: AppointmentFormDefaults) => {
    setEditing(null);
    // Sem uma data explícita, o formulário abre no dia que está em tela — e
    // não em "hoje", que pode ser um domingo fechado.
    setFormDefaults({ startsAt: cursor, ...defaults });
    setFormOpen(true);
  };

  const handleMove = async (
    item: AgendaItem,
    columnId: string,
    startsAt: Date,
  ) => {
    if (!item.source) return;
    try {
      await appointmentRepository.update(item.source.id, {
        startsAt: startsAt.toISOString(),
        ...(grouping === "PROFESSIONAL"
          ? { professionalId: columnId }
          : { roomId: columnId }),
      });
      toast.success("Atendimento reagendado.", {
        description: `${item.title} agora às ${formatTime(startsAt.toISOString())}.`,
      });
      reload();
    } catch (cause) {
      if (cause instanceof AppointmentConflictError) {
        toast.error("Conflito ao reagendar", {
          description: cause.errors.map((error) => error.message).join(" "),
        });
      } else {
        toast.error("Não foi possível reagendar.");
      }
      // A grade recarrega e o cartão volta ao lugar original.
      reload();
    }
  };

  const periodLabel =
    view === "MONTH"
      ? formatMonthYear(cursor)
      : view === "WEEK"
        ? `${formatDateLong(startOfWeek(cursor, { weekStartsOn: 0 }))} — ${formatDateLong(endOfWeek(cursor, { weekStartsOn: 0 }))}`
        : formatDateLong(cursor);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        description="Arraste um cartão para reagendar; clique num espaço livre para criar."
        actions={
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => setBlockOpen(true)}>
              <Lock className="size-4" aria-hidden />
              Bloquear horário
            </Button>
            <Button className="gap-1.5" onClick={() => openCreate()}>
              <Plus className="size-4" aria-hidden />
              Novo agendamento
            </Button>
          </>
        }
      />

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => step(-1)}
            aria-label="Período anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date())}
            className="gap-1.5"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => step(1)}
            aria-label="Próximo período"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <p className="text-sm font-medium first-letter:uppercase">{periodLabel}</p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {view === "DAY" && (
            <ToggleGroup
              type="single"
              value={grouping}
              onValueChange={(value) => value && setGrouping(value as AgendaGrouping)}
              variant="outline"
              size="sm"
              aria-label="Agrupar colunas por"
            >
              <ToggleGroupItem value="PROFESSIONAL" className="gap-1.5 px-3">
                <Users className="size-3.5" aria-hidden />
                Profissionais
              </ToggleGroupItem>
              <ToggleGroupItem value="ROOM" className="gap-1.5 px-3">
                <DoorClosed className="size-3.5" aria-hidden />
                Salas
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => value && setView(value as AgendaView)}
            variant="outline"
            size="sm"
            aria-label="Visão da agenda"
          >
            {(Object.keys(VIEW_LABELS) as AgendaView[]).map((option) => (
              <ToggleGroupItem key={option} value={option} className="px-3">
                {VIEW_LABELS[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <StatusLegend />

      {/* Conteúdo */}
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !appointments ? (
        <ChartSkeleton className="h-[32rem]" />
      ) : view === "DAY" ? (
        <AgendaDayGrid
          date={cursor}
          columns={columns}
          items={items}
          startHour={startHour}
          endHour={endHour}
          onSelectItem={(item) => item.source && setDetailId(item.source.id)}
          onCreateAt={(columnId, startsAt) =>
            openCreate(
              grouping === "PROFESSIONAL"
                ? { professionalId: columnId, startsAt }
                : { startsAt },
            )
          }
          onMove={handleMove}
        />
      ) : view === "WEEK" ? (
        <AgendaWeekView
          date={cursor}
          items={items}
          onSelectItem={(item) => item.source && setDetailId(item.source.id)}
          onSelectDay={(day) => {
            setCursor(day);
            setView("DAY");
          }}
        />
      ) : (
        <AgendaMonthView
          date={cursor}
          items={items}
          revenueByDay={revenueByDay}
          onSelectDay={(day) => {
            setCursor(day);
            setView("DAY");
          }}
        />
      )}

      <WaitlistPanel
        unitId={activeUnitId}
        onSchedule={(entry) =>
          openCreate({
            clientId: entry.clientId,
            serviceId: entry.serviceId,
            professionalId: entry.professionalId,
            startsAt: cursor,
          })
        }
      />

      {/* Diálogos */}
      {activeUnitId && (
        <>
          <AppointmentFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            unitId={activeUnitId}
            defaults={formDefaults}
            appointment={editing}
            onSaved={() => reload()}
          />
          <BlockFormDialog
            open={blockOpen}
            onOpenChange={setBlockOpen}
            unitId={activeUnitId}
            defaultDate={cursor}
            onSaved={() => reload()}
          />
        </>
      )}

      <AppointmentDetailSheet
        appointmentId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => !open && setDetailId(null)}
        onEdit={(appointment) => {
          setDetailId(null);
          setEditing(appointment);
          setFormDefaults(undefined);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
