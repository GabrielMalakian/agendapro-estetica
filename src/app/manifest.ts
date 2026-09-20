import type { MetadataRoute } from "next";

/**
 * Manifest do PWA.
 *
 * `start_url` aponta para `/login` porque o guard decide, a partir da sessão
 * guardada, para qual área levar — abrir direto em `/admin` mostraria a tela
 * de carregamento e um redirecionamento visível para quem entra como cliente.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgendaPro — Agendamento para clínicas, salões e barbearias",
    short_name: "AgendaPro",
    description:
      "Agenda, clientes, financeiro e lembretes em um só lugar. Funciona no celular, instalável e com acesso offline aos dados já carregados.",
    id: "/",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f9f9",
    theme_color: "#1f6f7a",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Agenda do dia",
        short_name: "Agenda",
        description: "Abrir a agenda de hoje",
        url: "/admin/agenda",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Agendar horário",
        short_name: "Agendar",
        description: "Marcar um novo atendimento",
        url: "/app/agendar",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
