"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Lock, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { AgendaColumn, AgendaItem } from "./agenda-types";
import { STATUS_STYLES } from "./status-badge";

/** Altura de um minuto, em pixels. 60min ≈ 96px. */
const PX_PER_MINUTE = 1.6;
/** Granularidade do arrastar-e-soltar, em minutos. */
const SNAP_MINUTES = 15;

interface AgendaDayGridProps {
  date: Date;
  columns: AgendaColumn[];
  items: AgendaItem[];
  /** Primeira e última hora exibidas (derivadas do expediente da unidade). */
  startHour: number;
  endHour: number;
  onSelectItem: (item: AgendaItem) => void;
  onCreateAt: (columnId: string, startsAt: Date) => void;
  onMove: (item: AgendaItem, columnId: string, startsAt: Date) => void;
}

function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

/* ------------------------------ cartão ---------------------------------- */

interface CardProps {
  item: AgendaItem;
  top: number;
  height: number;
  /** Fatia horizontal quando há sobreposição na mesma coluna. */
  laneIndex: number;
  laneCount: number;
  onSelect: (item: AgendaItem) => void;
  draggable: boolean;
  /** Evita que o clique sintetizado no fim de um arrasto abra o detalhe. */
  isClickSuppressed: () => boolean;
}

function AppointmentCard({
  item,
  top,
  height,
  laneIndex,
  laneCount,
  onSelect,
  draggable,
  isClickSuppressed,
}: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
    disabled: !draggable,
  });

  const style: React.CSSProperties = {
    top,
    height: Math.max(height, 26),
    left: `${(laneIndex / laneCount) * 100}%`,
    width: `calc(${100 / laneCount}% - 4px)`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : 10 + laneIndex,
  };

  const isBlock = item.kind === "BLOCK";
  const statusStyle = STATUS_STYLES[item.status];
  const compact = height < 52;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`${item.title}, ${formatTime(item.startsAt)} às ${formatTime(item.endsAt)}. ${item.subtitle}`}
      onClick={(event) => {
        // Sem isto o clique borbulha para o fundo da coluna e abre também o
        // diálogo de "novo agendamento".
        event.stopPropagation();
        if (isClickSuppressed()) return;
        onSelect(item);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onSelect(item);
        }
      }}
      className={cn(
        "absolute overflow-hidden rounded-lg border pr-1.5 pl-2.5 text-left transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && "opacity-50 shadow-lg",
        isBlock
          ? "border-dashed border-border bg-muted/80 text-muted-foreground"
          : cn(statusStyle.surface, "bg-card"),
        item.status === "CANCELLED" && "line-through opacity-70",
      )}
    >
      {!isBlock && (
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1 rounded-l-lg",
            statusStyle.bar,
          )}
          aria-hidden
        />
      )}
      <div className="py-1">
        <p
          className={cn(
            "truncate font-medium",
            compact ? "text-[0.6875rem] leading-tight" : "text-xs",
          )}
        >
          {isBlock && <Lock className="mr-1 inline size-3" aria-hidden />}
          {item.title}
        </p>
        {!compact && (
          <>
            <p className="truncate text-[0.6875rem] text-muted-foreground">
              {item.subtitle}
            </p>
            <p className="truncate text-[0.6875rem] text-muted-foreground">
              {formatTime(item.startsAt)}–{formatTime(item.endsAt)}
              {item.meta ? ` · ${item.meta}` : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ coluna ---------------------------------- */

interface ColumnProps {
  column: AgendaColumn;
  items: AgendaItem[];
  gridStart: number;
  totalMinutes: number;
  onSelectItem: (item: AgendaItem) => void;
  onCreateAt: (columnId: string, minutes: number) => void;
  isClickSuppressed: () => boolean;
}

/**
 * Distribui itens sobrepostos em faixas paralelas para nenhum cartão cobrir
 * o outro — o encaixe precisa ficar visível ao lado do atendimento original.
 */
function assignLanes(items: AgendaItem[]): Map<string, { lane: number; total: number }> {
  const sorted = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const result = new Map<string, { lane: number; total: number }>();
  let cluster: AgendaItem[] = [];
  let clusterEnd = 0;

  const flush = () => {
    if (cluster.length === 0) return;
    const lanes: number[] = [];
    for (const item of cluster) {
      const start = minutesOfDay(item.startsAt);
      let lane = lanes.findIndex((end) => end <= start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(0);
      }
      lanes[lane] = minutesOfDay(item.endsAt);
      result.set(item.id, { lane, total: 0 });
    }
    for (const item of cluster) {
      const entry = result.get(item.id);
      if (entry) entry.total = lanes.length;
    }
    cluster = [];
  };

  for (const item of sorted) {
    const start = minutesOfDay(item.startsAt);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, minutesOfDay(item.endsAt));
  }
  flush();

  return result;
}

function AgendaColumnBody({
  column,
  items,
  gridStart,
  totalMinutes,
  onSelectItem,
  onCreateAt,
  isClickSuppressed,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${column.id}`,
    data: { columnId: column.id },
    disabled: column.disabled,
  });

  const lanes = useMemo(() => assignLanes(items), [items]);

  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (column.disabled || isClickSuppressed()) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - bounds.top;
    const raw = gridStart + offsetY / PX_PER_MINUTE;
    const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
    onCreateAt(column.id, snapped);
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleBackgroundClick}
      className={cn(
        "relative min-w-[11rem] flex-1 border-r border-border last:border-r-0",
        isOver && "bg-accent/40",
        column.disabled && "bg-muted/50",
      )}
      style={{ height: totalMinutes * PX_PER_MINUTE }}
    >
      {/* Linhas de hora e meia-hora */}
      {Array.from({ length: Math.ceil(totalMinutes / 30) }, (_, index) => (
        <div
          key={index}
          className={cn(
            "pointer-events-none absolute inset-x-0 border-t",
            index % 2 === 0 ? "border-border" : "border-border/40",
          )}
          style={{ top: index * 30 * PX_PER_MINUTE }}
          aria-hidden
        />
      ))}

      {items.map((item) => {
        const start = minutesOfDay(item.startsAt);
        const end = minutesOfDay(item.endsAt);
        const lane = lanes.get(item.id) ?? { lane: 0, total: 1 };
        return (
          <AppointmentCard
            key={item.id}
            item={item}
            top={(start - gridStart) * PX_PER_MINUTE}
            height={(end - start) * PX_PER_MINUTE}
            laneIndex={lane.lane}
            laneCount={Math.max(1, lane.total)}
            onSelect={onSelectItem}
            draggable={item.kind === "APPOINTMENT" && !column.disabled}
            isClickSuppressed={isClickSuppressed}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------- grade ---------------------------------- */

export function AgendaDayGrid({
  date,
  columns,
  items,
  startHour,
  endHour,
  onSelectItem,
  onCreateAt,
  onMove,
}: AgendaDayGridProps) {
  const gridStart = startHour * 60;
  const totalMinutes = (endHour - startHour) * 60;
  const [dragging, setDragging] = useState<AgendaItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /**
   * O navegador dispara um `click` ao soltar o ponteiro depois de arrastar.
   * Sem esta trava, todo reagendamento abriria o detalhe logo em seguida.
   */
  const suppressClickRef = useRef(false);
  const isClickSuppressed = useCallback(() => suppressClickRef.current, []);

  const releaseClickSuppression = useCallback(() => {
    // Liberado no próximo tick, depois que o `click` sintetizado passou.
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, []);

  const sensors = useSensors(
    // 6px de tolerância: um clique curto ainda abre o detalhe.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const itemsByColumn = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const column of columns) map.set(column.id, []);
    for (const item of items) {
      const list = map.get(item.columnId);
      if (list) list.push(item);
    }
    return map;
  }, [columns, items]);

  const handleDragStart = (event: DragStartEvent) => {
    suppressClickRef.current = true;
    setDragging((event.active.data.current?.item as AgendaItem) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const item = event.active.data.current?.item as AgendaItem | undefined;
    setDragging(null);
    releaseClickSuppression();
    if (!item) return;

    const columnId =
      (event.over?.data.current?.columnId as string | undefined) ?? item.columnId;
    const minutesDelta =
      Math.round(event.delta.y / PX_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;

    if (minutesDelta === 0 && columnId === item.columnId) return;

    const startsAt = new Date(
      new Date(item.startsAt).getTime() + minutesDelta * 60_000,
    );
    onMove(item, columnId, startsAt);
  };

  const handleCreateAt = useCallback(
    (columnId: string, minutes: number) => {
      const startsAt = new Date(date);
      startsAt.setHours(0, 0, 0, 0);
      startsAt.setMinutes(minutes);
      onCreateAt(columnId, startsAt);
    },
    [date, onCreateAt],
  );

  // Rola até as 08:00 (ou ao horário atual, se for hoje) ao abrir.
  const isToday = new Date().toDateString() === date.toDateString();
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const target = isToday
      ? new Date().getHours() * 60 + new Date().getMinutes() - 60
      : 8 * 60;
    node.scrollTop = Math.max(0, (target - gridStart) * PX_PER_MINUTE);
  }, [gridStart, isToday, date]);

  const nowOffset = isToday
    ? (new Date().getHours() * 60 + new Date().getMinutes() - gridStart) *
      PX_PER_MINUTE
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null);
        releaseClickSuppression();
      }}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Cabeçalho das colunas */}
        <div className="flex border-b border-border bg-muted/40">
          <div className="w-14 shrink-0 border-r border-border" aria-hidden />
          <div className="flex min-w-0 flex-1 overflow-hidden">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex min-w-[11rem] flex-1 items-center justify-between gap-2 border-r border-border px-3 py-2.5 last:border-r-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{column.name}</p>
                  {column.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">
                      {column.subtitle}
                    </p>
                  )}
                </div>
                {column.disabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground">
                        <Lock className="size-3.5" aria-hidden />
                        <span className="sr-only">
                          {column.disabledReason ?? "Indisponível"}
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {column.disabledReason ?? "Indisponível"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Novo agendamento com ${column.name}`}
                    onClick={() => handleCreateAt(column.id, 9 * 60)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Corpo rolável */}
        <div
          ref={scrollRef}
          className="scrollbar-thin relative flex max-h-[min(70vh,44rem)] overflow-auto"
          role="grid"
          aria-label="Grade de horários do dia"
        >
          {/* Régua de horas */}
          <div
            className="sticky left-0 z-20 w-14 shrink-0 border-r border-border bg-card"
            style={{ height: totalMinutes * PX_PER_MINUTE }}
            aria-hidden
          >
            {Array.from({ length: endHour - startHour }, (_, index) => (
              <div
                key={index}
                className="absolute right-2 -translate-y-1/2 text-[0.6875rem] text-muted-foreground tabular-nums"
                style={{ top: index * 60 * PX_PER_MINUTE }}
              >
                {String(startHour + index).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className="relative flex min-w-0 flex-1">
            {columns.map((column) => (
              <AgendaColumnBody
                key={column.id}
                column={column}
                items={itemsByColumn.get(column.id) ?? []}
                gridStart={gridStart}
                totalMinutes={totalMinutes}
                onSelectItem={onSelectItem}
                onCreateAt={handleCreateAt}
                isClickSuppressed={isClickSuppressed}
              />
            ))}

            {/* Linha do "agora" */}
            {nowOffset !== null && nowOffset >= 0 && nowOffset <= totalMinutes * PX_PER_MINUTE && (
              <div
                className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                style={{ top: nowOffset }}
                aria-hidden
              >
                <span className="size-2 rounded-full bg-destructive" />
                <span className="h-px flex-1 bg-destructive" />
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="rounded-lg border border-primary bg-card px-3 py-2 text-xs shadow-lg">
            <p className="font-medium">{dragging.title}</p>
            <p className="text-muted-foreground">{dragging.subtitle}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
