"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  /** Já formatado — o card não sabe se é moeda, contagem ou percentual. */
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Variação contra o período anterior, de -1 a 1. */
  delta?: number;
  /** Em métricas como faltas, subir é ruim. */
  invertDelta?: boolean;
  className?: string;
}

/**
 * Número único.
 *
 * Quando a pergunta é "quanto deu?", um número grande responde melhor que
 * qualquer gráfico — e é por isso que nem toda métrica vira desenho.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  invertDelta = false,
  className,
}: StatTileProps) {
  const hasDelta = delta !== undefined && Number.isFinite(delta);
  const isFlat = hasDelta && Math.abs(delta) < 0.005;
  const isUp = hasDelta && delta > 0;
  const isGood = isFlat ? null : invertDelta ? !isUp : isUp;
  const DeltaIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <Card className={className}>
      <CardContent className="space-y-1.5 py-4">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Icon className="size-3.5" />
            </span>
          )}
          <p className="min-w-0 truncate text-xs text-muted-foreground">{label}</p>
        </div>

        <p className="font-display text-2xl leading-tight font-semibold tabular-nums">
          {value}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium tabular-nums",
                isGood === null
                  ? "text-muted-foreground"
                  : isGood
                    ? "text-success"
                    : "text-destructive",
              )}
            >
              <DeltaIcon className="size-3" aria-hidden />
              {isFlat ? "estável" : formatPercent(Math.abs(delta))}
              <span className="sr-only">
                {isFlat
                  ? "sem variação"
                  : isUp
                    ? "de aumento sobre o período anterior"
                    : "de queda sobre o período anterior"}
              </span>
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
