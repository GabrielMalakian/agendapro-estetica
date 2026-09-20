import type { Metadata } from "next";
import { CloudOff } from "lucide-react";

import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sem conexão",
  description: "Você está offline.",
};

/**
 * Tela servida pelo service worker quando uma navegação falha sem rede.
 *
 * Só aparece para uma rota que ainda não está em cache — as telas já
 * visitadas continuam abrindo offline, com os dados que estão no
 * `localStorage`.
 */
export default function OfflinePage() {
  return (
    <main
      id="conteudo"
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <BrandMark size="lg" />

      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CloudOff className="size-7" aria-hidden />
      </span>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Você está offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta tela ainda não tinha sido aberta neste aparelho, então não estava
          salva. As telas que você já visitou continuam funcionando normalmente
          sem internet.
        </p>
      </div>

      <Button asChild variant="outline">
        {/*
          `<a>` de propósito, e não `<Link>`: aqui queremos uma navegação
          completa, que refaz a requisição e sai desta tela de fallback assim
          que a rede volta. A navegação client-side do Next reaproveitaria o
          estado offline.
        */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/login">Voltar ao início</a>
      </Button>
    </main>
  );
}
