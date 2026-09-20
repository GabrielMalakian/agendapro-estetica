import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Oculta o nome, deixando só o símbolo (útil na sidebar recolhida). */
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { box: "size-7 rounded-lg", icon: "size-4", text: "text-base" },
  md: { box: "size-9 rounded-xl", icon: "size-5", text: "text-lg" },
  lg: { box: "size-12 rounded-2xl", icon: "size-6", text: "text-2xl" },
} as const;

export function BrandMark({ className, iconOnly, size = "md" }: BrandMarkProps) {
  const scale = SIZES[size];
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-sm",
          scale.box,
        )}
        aria-hidden
      >
        <CalendarClock className={scale.icon} />
      </span>
      {!iconOnly && (
        <span className={cn("font-display font-semibold tracking-tight", scale.text)}>
          AgendaPro
        </span>
      )}
    </span>
  );
}
