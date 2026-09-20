"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { EmptyState } from "@/components/common/states";
import { formatPercent } from "@/lib/format";

import {
  ChartFigure,
  ChartTooltip,
  MAX_SERIES,
  seriesColor,
} from "./chart-primitives";

export interface BreakdownSlice {
  id: string;
  label: string;
  value: number;
}

interface BreakdownChartProps {
  title: string;
  description?: string;
  data: BreakdownSlice[];
  formatValue: (value: number) => string;
  /** Texto no miolo da rosca — normalmente o total. */
  centerLabel?: string;
  height?: number;
}

/**
 * Composição de um total, em rosca.
 *
 * Só até 4 fatias: acima disso o excedente vira "Outros", porque a paleta
 * categórica tem 4 slots e nenhuma cor é inventada. Cada fatia aparece
 * também na lista lateral, com valor e percentual — a leitura nunca depende
 * só da cor.
 */
export function BreakdownChart({
  title,
  description,
  data,
  formatValue,
  centerLabel,
  height = 220,
}: BreakdownChartProps) {
  const sorted = [...data].filter((item) => item.value > 0).sort((a, b) => b.value - a.value);

  const slices =
    sorted.length > MAX_SERIES
      ? [
          ...sorted.slice(0, MAX_SERIES - 1),
          {
            id: "__other__",
            label: "Outros",
            value: sorted
              .slice(MAX_SERIES - 1)
              .reduce((sum, item) => sum + item.value, 0),
          },
        ]
      : sorted;

  const total = slices.reduce((sum, item) => sum + item.value, 0);

  if (slices.length === 0) {
    return (
      <ChartFigure
        title={title}
        description={description}
        table={{ columns: ["Categoria", "Valor"], rows: [] }}
      >
        <EmptyState title="Nada para mostrar" description="Sem valores no período." />
      </ChartFigure>
    );
  }

  return (
    <ChartFigure
      title={title}
      description={description}
      table={{
        columns: ["Categoria", "Valor", "Participação"],
        rows: slices.map((slice) => [
          slice.label,
          formatValue(slice.value),
          formatPercent(slice.value / total, 1),
        ]),
      }}
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative shrink-0" style={{ width: height, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius="62%"
                outerRadius="94%"
                // 2px de folga entre fatias, na cor da superfície.
                paddingAngle={1.5}
                stroke="var(--card)"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {slices.map((slice, index) => (
                  <Cell key={slice.id} fill={seriesColor(index)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <ChartTooltip
                      title={String(payload[0]?.name ?? "")}
                      rows={[
                        {
                          label: "Valor",
                          value: formatValue(Number(payload[0]?.value ?? 0)),
                          color: String(payload[0]?.payload?.fill),
                        },
                        {
                          label: "Participação",
                          value: formatPercent(
                            Number(payload[0]?.value ?? 0) / total,
                            1,
                          ),
                        },
                      ]}
                    />
                  ) : null
                }
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-lg font-semibold">
              {formatValue(total)}
            </span>
            {centerLabel && (
              <span className="text-xs text-muted-foreground">{centerLabel}</span>
            )}
          </div>
        </div>

        {/* Lista com valor e percentual: a legenda que também informa. */}
        <ul className="min-w-0 flex-1 space-y-1.5">
          {slices.map((slice, index) => (
            <li key={slice.id} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: seriesColor(index) }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {slice.label}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatValue(slice.value)}
              </span>
              <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {formatPercent(slice.value / total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFigure>
  );
}
