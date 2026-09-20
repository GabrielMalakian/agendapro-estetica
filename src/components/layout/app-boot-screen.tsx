import { CalendarClock } from "lucide-react";

/**
 * Tela de carregamento usada enquanto a sessão e a base de demonstração
 * hidratam. É intencionalmente sóbria: sem spinner girando eternamente, só
 * a marca e uma barra de progresso indeterminada.
 */
export function AppBootScreen({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <CalendarClock className="size-6" aria-hidden />
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">
          AgendaPro
        </span>
      </div>

      <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[boot_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>

      <p className="text-sm text-muted-foreground">{label}</p>

      <style>{`
        @keyframes boot {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
