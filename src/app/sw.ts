import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Service worker do AgendaPro.
 *
 * O que torna esta aplicação utilizável offline não é o cache de rede — não
 * há API — e sim o fato de os dados viverem no `localStorage`. O service
 * worker só precisa garantir que o *shell* (HTML, JS, CSS, fontes) esteja
 * disponível; a partir daí o Zustand reidrata a base e as telas funcionam
 * normalmente, inclusive criando agendamentos.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
