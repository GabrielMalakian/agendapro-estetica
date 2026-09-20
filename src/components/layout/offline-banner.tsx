"use client";

import { CloudOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Faixa de "sem conexão".
 *
 * Aqui ela é honesta sobre o que muda: como os dados vivem no navegador,
 * ficar offline não impede de usar o sistema — só impede a sincronização,
 * que nesta demonstração ainda não existe.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning px-3 py-1.5 text-xs font-medium text-warning-foreground"
    >
      <CloudOff className="size-3.5" aria-hidden />
      Sem conexão — você continua usando o sistema com os dados deste aparelho.
    </div>
  );
}
