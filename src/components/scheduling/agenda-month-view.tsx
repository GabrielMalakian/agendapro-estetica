"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { AgendaItem } from "./agenda-types";
import { STATUS_STYLES } from "./status-badge";

interface AgendaMonthViewProps {
  date: Date;
  items: AgendaItem[];
  /** Valor agregado por dia, exibido no rodapé da célula. */
  revenueByDay?: Map<string, number>;
  onSelectDay: (day: Date) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Visão mensal: densidade por dia, com atalho para abrir o dia na timeline. */
export function AgendaMonthView({
  date,
  items,
  revenueByDay,
  onSelectDay,
}: AgendaMonthViewProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 0 }),
  });

  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[0.6875rem] tracking-wide text-muted-foreground uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((item) =>
            isSameDay(new Date(item.startsAt), day),
          );
          const inMonth = isSameMonth(day, date);
          const isToday = isSameDay(day, today);
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const revenue = revenueByDay?.get(key) ?? 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={`${day.getDate()} — ${dayItems.length} atendimentos`}
              className={cn(
                "flex min-h-[6.5rem] flex-col gap-1.5 border-r border-b border-border p-2 text-left transition-colors hover:bg-accent/60 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  isToday &&
                    "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </span>

              {dayItems.length > 0 && (
                <>
                  <span className="flex flex-wrap gap-0.5" aria-hidden>
                    {dayItems.slice(0, 12).map((item) => (
                      <span
                        key={item.id}
                        className={cn(
                          "size-1.5 rounded-full",
                          STATUS_STYLES[item.status].bar,
                        )}
                      />
                    ))}
                  </span>
                  <span className="mt-auto text-[0.6875rem] text-muted-foreground">
                    {dayItems.length}{" "}
                    {dayItems.length === 1 ? "horário" : "horários"}
                    {revenue > 0 && (
                      <span className="block tabular-nums">
                        {formatCurrency(revenue)}
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
