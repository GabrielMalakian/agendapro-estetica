"use client";

import { eachDayOfInterval, endOfWeek, isSameDay, startOfWeek } from "date-fns";

import { formatTime, formatWeekdayShort } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { AgendaItem } from "./agenda-types";
import { STATUS_STYLES } from "./status-badge";

interface AgendaWeekViewProps {
  date: Date;
  items: AgendaItem[];
  onSelectItem: (item: AgendaItem) => void;
  onSelectDay: (day: Date) => void;
}

/**
 * Visão semanal: sete colunas com a lista cronológica de cada dia.
 * Preferida à grade de horas na semana porque, com seis profissionais, a
 * timeline de sete dias vira ilegível em qualquer largura de tela.
 */
export function AgendaWeekView({
  date,
  items,
  onSelectItem,
  onSelectDay,
}: AgendaWeekViewProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  });

  const today = new Date();

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[52rem] grid-cols-7">
        {days.map((day) => {
          const dayItems = items
            .filter((item) => isSameDay(new Date(item.startsAt), day))
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className="min-h-[18rem] border-r border-border last:border-r-0"
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left transition-colors hover:bg-accent",
                  isToday && "bg-accent/60",
                )}
              >
                <span className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                  {formatWeekdayShort(day)}
                </span>
                <span
                  className={cn(
                    "font-display text-lg leading-none font-semibold",
                    isToday && "text-primary",
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="text-[0.6875rem] text-muted-foreground">
                  {dayItems.length === 0
                    ? "livre"
                    : `${dayItems.length} ${dayItems.length === 1 ? "horário" : "horários"}`}
                </span>
              </button>

              <ul className="space-y-1 p-1.5">
                {dayItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className={cn(
                        "w-full rounded-md border px-2 py-1.5 text-left text-[0.6875rem] transition-colors",
                        item.kind === "BLOCK"
                          ? "border-dashed border-border bg-muted/70 text-muted-foreground"
                          : STATUS_STYLES[item.status].surface,
                        item.status === "CANCELLED" && "line-through opacity-70",
                      )}
                    >
                      <span className="block font-medium tabular-nums">
                        {formatTime(item.startsAt)}
                      </span>
                      <span className="block truncate">{item.title}</span>
                      <span className="block truncate text-muted-foreground">
                        {item.subtitle}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
