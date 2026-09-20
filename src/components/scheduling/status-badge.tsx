import {
  Ban,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  Hourglass,
  PlayCircle,
  UserX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type AppointmentStatus,
  type PaymentStatus,
} from "@/types";

/**
 * Cores por status.
 *
 * `bar` é usada na faixa lateral do cartão da timeline, `chip` no badge e
 * `surface` no fundo do cartão. Todas derivam dos tokens semânticos do tema,
 * então funcionam igual no claro e no escuro.
 */
export const STATUS_STYLES: Record<
  AppointmentStatus,
  { bar: string; chip: string; surface: string; icon: typeof Clock3 }
> = {
  SCHEDULED: {
    bar: "bg-info",
    chip: "border-info/30 bg-info/10 text-info",
    surface: "bg-info/5 border-info/25 hover:border-info/50",
    icon: CalendarClock,
  },
  CONFIRMED: {
    bar: "bg-success",
    chip: "border-success/30 bg-success/10 text-success",
    surface: "bg-success/5 border-success/25 hover:border-success/50",
    icon: CircleCheck,
  },
  IN_PROGRESS: {
    bar: "bg-warning",
    chip: "border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning",
    surface: "bg-warning/10 border-warning/30 hover:border-warning/60",
    icon: PlayCircle,
  },
  COMPLETED: {
    bar: "bg-primary",
    chip: "border-primary/30 bg-primary/10 text-primary",
    surface: "bg-primary/5 border-primary/25 hover:border-primary/50",
    icon: CheckCheck,
  },
  CANCELLED: {
    bar: "bg-muted-foreground",
    chip: "border-border bg-muted text-muted-foreground",
    surface: "bg-muted/60 border-border hover:border-muted-foreground/40",
    icon: Ban,
  },
  NO_SHOW: {
    bar: "bg-destructive",
    chip: "border-destructive/30 bg-destructive/10 text-destructive",
    surface: "bg-destructive/5 border-destructive/25 hover:border-destructive/50",
    icon: UserX,
  },
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: AppointmentStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", style.chip, className)}>
      {showIcon && <Icon className="size-3" aria-hidden />}
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const PAYMENT_STYLES: Record<PaymentStatus, { chip: string; icon: typeof Clock3 }> = {
  PENDING: {
    chip: "border-border bg-muted text-muted-foreground",
    icon: Hourglass,
  },
  PARTIAL: {
    chip: "border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning",
    icon: CircleDollarSign,
  },
  PAID: {
    chip: "border-success/30 bg-success/10 text-success",
    icon: CircleCheck,
  },
};

export function PaymentBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const style = PAYMENT_STYLES[status];
  const Icon = style.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", style.chip, className)}>
      <Icon className="size-3" aria-hidden />
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Legenda de cores exibida acima da grade da agenda. */
export function StatusLegend({ className }: { className?: string }) {
  const statuses: AppointmentStatus[] = [
    "SCHEDULED",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED",
  ];
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {statuses.map((status) => (
        <li key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn("size-2.5 rounded-full", STATUS_STYLES[status].bar)}
            aria-hidden
          />
          {APPOINTMENT_STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  );
}
