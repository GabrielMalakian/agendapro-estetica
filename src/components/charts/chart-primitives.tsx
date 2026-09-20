"use client";

import { Table2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Peças comuns dos gráficos.
 *
 * Decisões que valem para todos e que por isso moram aqui:
 * - a paleta categórica tem 4 slots em ordem fixa e nunca é ciclada; uma 5ª
 *   série vira "Outros" ou um segundo gráfico;
 * - marcas finas: linha de 2px, grade recessiva, sem eixo vertical pesado;
 * - toda figura tem título, legenda quando há 2+ séries, e alternativa em
 *   tabela para quem não distingue as cores ou usa leitor de tela.
 */

/** Ordem fixa da paleta categórica. Índices acima de 3 não existem. */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
] as const;

export const MAX_SERIES = CHART_COLORS.length;

export function seriesColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Estilos de eixo e grade compartilhados — recessivos de propósito. */
export const AXIS_STYLE = {
  stroke: "var(--border)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const GRID_STYLE = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

/* ------------------------------- tooltip -------------------------------- */

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export function ChartTooltip({
  title,
  rows,
}: {
  title: string;
  rows: TooltipRow[];
}) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="pb-1 font-medium text-popover-foreground">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            {row.color && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: row.color }}
                aria-hidden
              />
            )}
            <span className="text-muted-foreground">{row.label}</span>
            <span className="ml-auto font-medium text-popover-foreground tabular-nums">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------- figura -------------------------------- */

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface ChartFigureProps {
  title: string;
  description?: string;
  /** Legenda: obrigatória a partir de duas séries. */
  series?: ChartSeries[];
  /** Conteúdo da alternativa em tabela — sempre disponível. */
  table: { columns: string[]; rows: (string | number)[][] };
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Moldura de um gráfico: título, legenda, o desenho e o botão que troca o
 * desenho por uma tabela. A tabela não é um extra — é o que garante que a
 * informação não dependa só de cor.
 */
export function ChartFigure({
  title,
  description,
  series,
  table,
  action,
  className,
  children,
}: ChartFigureProps) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <figure
      className={cn(
        "space-y-3 rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={showTable}
            aria-controls={tableId}
            aria-label={showTable ? "Ver gráfico" : "Ver como tabela"}
            onClick={() => setShowTable((value) => !value)}
          >
            <Table2 className="size-3.5" />
          </Button>
        </div>
      </figcaption>

      {series && series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {series.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: item.color }}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div id={tableId}>
        {showTable ? (
          <div className="scrollbar-thin max-h-72 overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">{title}</caption>
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  {table.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={cn(
                        "px-3 py-2 text-left text-xs font-medium",
                        index > 0 && "text-right",
                      )}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-border">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cn(
                          "px-3 py-1.5",
                          cellIndex > 0 && "text-right tabular-nums",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </figure>
  );
}
