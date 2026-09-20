"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/states";

import {
  AXIS_STYLE,
  ChartFigure,
  ChartTooltip,
  GRID_STYLE,
  seriesColor,
} from "./chart-primitives";

export interface RankingItem {
  id: string;
  name: string;
  value: number;
  secondary?: number;
}

interface RankingChartProps {
  title: string;
  description?: string;
  data: RankingItem[];
  /** Rótulo da medida principal, usado no tooltip e na tabela. */
  valueLabel: string;
  formatValue: (value: number) => string;
  secondaryLabel?: string;
  formatSecondary?: (value: number) => string;
  /** Barras horizontais leem melhor quando os nomes são longos. */
  layout?: "horizontal" | "vertical";
  limit?: number;
  height?: number;
  emptyMessage?: string;
}

/**
 * Ranking em barras.
 *
 * Série única: a cor não carrega identidade, o eixo carrega — por isso uma
 * única matiz e rótulo direto no topo de cada barra, em vez de legenda.
 */
export function RankingChart({
  title,
  description,
  data,
  valueLabel,
  formatValue,
  secondaryLabel,
  formatSecondary,
  layout = "vertical",
  limit = 8,
  height = 280,
  emptyMessage = "Sem dados no período.",
}: RankingChartProps) {
  const rows = [...data]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const columns = [valueLabel === "" ? "Item" : "Item", valueLabel];
  if (secondaryLabel) columns.push(secondaryLabel);

  if (rows.length === 0) {
    return (
      <ChartFigure
        title={title}
        description={description}
        table={{ columns, rows: [] }}
      >
        <EmptyState title="Nada para mostrar" description={emptyMessage} />
      </ChartFigure>
    );
  }

  const isVertical = layout === "vertical";

  return (
    <ChartFigure
      title={title}
      description={description}
      table={{
        columns,
        rows: rows.map((item) => {
          const row: (string | number)[] = [item.name, formatValue(item.value)];
          if (secondaryLabel) {
            row.push(
              item.secondary !== undefined
                ? (formatSecondary ?? formatValue)(item.secondary)
                : "—",
            );
          }
          return row;
        }),
      }}
    >
      <div style={{ height: Math.max(height, rows.length * 34 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout={isVertical ? "vertical" : "horizontal"}
            margin={
              isVertical
                ? { top: 4, right: 56, bottom: 4, left: 8 }
                : { top: 20, right: 8, bottom: 4, left: 0 }
            }
            barCategoryGap={8}
          >
            <CartesianGrid {...GRID_STYLE} vertical={isVertical} horizontal={!isVertical} />

            {isVertical ? (
              <>
                <XAxis type="number" {...AXIS_STYLE} tickFormatter={formatValue} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...AXIS_STYLE}
                  width={150}
                  tickFormatter={(value: string) =>
                    value.length > 22 ? `${value.slice(0, 21)}…` : value
                  }
                />
              </>
            ) : (
              <>
                <XAxis dataKey="name" {...AXIS_STYLE} interval={0} />
                <YAxis {...AXIS_STYLE} width={48} tickFormatter={formatValue} />
              </>
            )}

            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={String(payload[0]?.payload?.name ?? "")}
                    rows={[
                      {
                        label: valueLabel,
                        value: formatValue(Number(payload[0]?.value ?? 0)),
                        color: seriesColor(0),
                      },
                      ...(secondaryLabel &&
                      payload[0]?.payload?.secondary !== undefined
                        ? [
                            {
                              label: secondaryLabel,
                              value: (formatSecondary ?? formatValue)(
                                Number(payload[0].payload.secondary),
                              ),
                            },
                          ]
                        : []),
                    ]}
                  />
                ) : null
              }
            />

            <Bar
              dataKey="value"
              // Cantos arredondados só na ponta livre da barra.
              radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={isVertical ? 20 : 44}
              isAnimationActive={false}
            >
              {rows.map((item) => (
                <Cell key={item.id} fill={seriesColor(0)} />
              ))}
              <LabelList
                dataKey="value"
                position={isVertical ? "right" : "top"}
                formatter={(value: unknown) => formatValue(Number(value))}
                className="fill-muted-foreground"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
}
