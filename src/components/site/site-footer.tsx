import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { Separator } from "@/components/ui/separator";

import { clinic, mainUnit } from "./site-data";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Navegação",
    links: [
      { href: "#inicio", label: "Início" },
      { href: "#servicos", label: "Serviços" },
      { href: "#sobre", label: "Sobre" },
      { href: "#contato", label: "Contato" },
    ],
  },
  {
    title: "Acessar",
    links: [
      { href: "/login?perfil=cliente", label: "Área do cliente" },
      { href: "/login?perfil=profissional", label: "Área do profissional" },
      { href: "/dev", label: "Área do desenvolvedor" },
      { href: "/login", label: "Entrar" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-2">
            <BrandMark />
            <p className="max-w-sm text-sm leading-relaxed font-light text-muted-foreground">
              Agenda, prontuário de evolução, financeiro e lembretes para
              clínicas de estética e bem-estar. Esta é uma demonstração
              navegável — os dados são fictícios.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} className="space-y-3" aria-label={column.title}>
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.href}`}>
                    <Link
                      href={link.href}
                      className="text-sm font-light text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-2 text-xs font-light text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {clinic.name} · {mainUnit.address}
          </p>
          <p>Ambiente de demonstração · nenhuma informação real é exibida.</p>
        </div>
      </div>
    </footer>
  );
}
