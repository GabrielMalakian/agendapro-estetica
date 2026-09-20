"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDatabaseStore } from "@/data/store/database-store";
import { applyBrandColor } from "@/lib/theme/apply-brand";

/** Reaplica a cor primária configurada sempre que ela muda. */
function BrandColorSync() {
  const hydrated = useDatabaseStore((state) => state.hydrated);
  const primaryColor = useDatabaseStore(
    (state) => state.db.settings.appearance.primaryColor,
  );

  useEffect(() => {
    if (!hydrated) return;
    applyBrandColor(primaryColor || null);
  }, [hydrated, primaryColor]);

  return null;
}

/**
 * Hidrata os stores persistidos.
 *
 * O Zustand `persist` faz isso sozinho no cliente; este componente existe só
 * para garantir que os módulos dos stores sejam carregados cedo, antes de
 * qualquer tela protegida decidir se redireciona.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={300}>
        <BrandColorSync />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
