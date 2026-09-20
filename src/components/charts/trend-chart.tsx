"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AXIS_STYLE,
  ChartFigure,
  ChartTooltip,
  GRID_STYLE,
  seriesColor,
  type ChartSeries,
} from "./chart-primitives";

export interface TrendPoint {
  label: string;
  [key: string]: string | number;
}

interface TrendChartProps {
  title: string;
  description?: string;
  data: TrendPoint[];
  /** Uma série não leva legenda: o título já a nomeia. */
  series: { key: string; label: string }[];
  formatValue: (value: number) => string;
  /** Formato curto para o eixo Y, que tem pouco espaço. */
  formatAxis?: (value: number) => string;
  height?: number;
  action?: React.ReactNode;
}

/**
 * Série temporal como área preenchida.
 *
 * Linha de 2px, grade horizontal recessiva, sem eixo vertical desenhado, e
 * crosshair com tooltip no hover — um gráfico em HTML é interativo por
 * padrão, não por opção.
 */
export function TrendChart({
  title,
  description,
  data,
  series,
  formatValue,
  formatAxis,
  height = 260,
  action,
}: TrendChartProps) {
  const resolved: ChartSeries[] = series.map((item, index) => ({
    ...item,
    color: seriesColor(index),
  }));

  return (
    <ChartFigure
      title={title}
      description={description}
      series={resolved}
      action={action}
      table={{
        columns: ["Período", ...series.map((item) => item.label)],
        rows: data.map((point) => [
          point.label,
          ...series.map((item) => formatValue(Number(point[item.key] ?? 0))),
        ]),
      }}
    >
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {resolved.map((item) => (
                <linearGradient
                  key={item.key}
                  id={`fill-${item.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="label"
              {...AXIS_STYLE}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              {...AXIS_STYLE}
              width={56}
              tickFormatter={(value: number) =>
                (formatAxis ?? formatValue)(value)
              }
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={String(label)}
                    rows={payload.map((entry) => ({
                      label:
                        resolved.find((item) => item.key === entry.dataKey)?.label ??
                        String(entry.dataKey),
                      value: formatValue(Number(entry.value ?? 0)),
                      color: String(entry.color),
                    }))}
                  />
                ) : null
              }
            />

            {resolved.map((item) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={item.color}
                strokeWidth={2}
                fill={`url(#fill-${item.key})`}
                // Pontos só no hover: um marcador em cada dia polui a linha.
                dot={false}
                // Sem animação: os dados recarregam a cada mutação e a
                // re-animação constante faria o gráfico "piscar".
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
}
