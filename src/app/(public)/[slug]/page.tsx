import type { Metadata } from "next";

import { PublicPage } from "./public-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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
  return <PublicPage slug={slug} />;
}
