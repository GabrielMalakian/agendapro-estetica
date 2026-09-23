import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";

import { Providers } from "@/components/layout/providers";

import "./globals.css";

/**
 * Tipografia: Poppins em toda a interface.
 *
 * 300 para textos leves (legendas, apoios), 400 no corpo, 500/600 em botões e
 * títulos de seção, 700 nos títulos principais. É a mesma família nas duas
 * variáveis — `--font-display` existe para manter a distinção semântica entre
 * título e texto, caso a marca troque a display depois.
 */
const poppins = Poppins({
  variable: "--font-text",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const poppinsDisplay = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

/** Monoespaçada de apoio: credenciais, ids e os logs da área do desenvolvedor. */
const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "AgendaPro — Agendamento para clínicas de estética",
    template: "%s · AgendaPro",
  },
  description:
    "Agenda, clientes, financeiro e lembretes para clínicas de estética e bem-estar. Demonstração navegável do AgendaPro.",
  applicationName: "AgendaPro",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AgendaPro",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#171311" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /*
     * As variáveis de fonte ficam no <html>, e não no <body>: `html` recebe
     * `font-sans`, que resolve `var(--font-text)` no escopo do próprio
     * elemento. Declaradas só no <body>, a variável não existe em `html` e a
     * família cai no serifado padrão do navegador.
     */
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${poppins.variable} ${poppinsDisplay.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
