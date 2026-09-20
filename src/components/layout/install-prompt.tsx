"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Evento não padronizado, disponível em navegadores baseados em Chromium. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "agendapro.install-prompt.dismissed";

/**
 * Convite para instalar o app.
 *
 * Aparece uma única vez: quem recusa não vê de novo (a escolha fica no
 * `localStorage`). Em navegadores sem `beforeinstallprompt` — Safari, por
 * exemplo — o componente simplesmente não renderiza, em vez de ensinar um
 * caminho que o usuário não tem.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Armazenamento bloqueado: seguimos como se nunca tivesse sido visto.
    }
    if (dismissed) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Sem armazenamento, o convite volta na próxima sessão. Tudo bem.
    }
  };

  if (!visible || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar o AgendaPro"
      className="fixed inset-x-3 bottom-20 z-40 flex items-center gap-3 rounded-xl border border-border bg-popover p-3 shadow-lg sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Download className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Instalar o AgendaPro</p>
        <p className="text-xs text-muted-foreground">
          Abre como aplicativo e funciona sem internet.
        </p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          dismiss();
        }}
      >
        Instalar
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={dismiss} aria-label="Agora não">
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
