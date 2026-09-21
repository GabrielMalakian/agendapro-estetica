import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { COMPANY_SLUG } from "@/data/seed/organization";

import { PublicPage } from "./public-page";

/**
 * Vitrine pública do estabelecimento.
 *
 * O slug é validado no servidor para que um endereço inexistente devolva
 * HTTP 404 de verdade — e não uma página 200 que só mostra "não encontrado"
 * depois de hidratar, o que confunde buscadores e monitoramento. Nesta
 * demonstração existe uma empresa só; no backend real isto vira
 * `GET /companies/by-slug/:slug`.
 */
const KNOWN_SLUGS = new Set([COMPANY_SLUG]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!KNOWN_SLUGS.has(slug)) return { title: "Página não encontrada" };
  return {
    title: "Agende seu horário",
    description: `Serviços, preços e agendamento online — ${slug}.`,
  };
}

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!KNOWN_SLUGS.has(slug)) notFound();
  return <PublicPage slug={slug} />;
}
