import type { Metadata } from "next";

import { ServicesView } from "./services-view";

export const metadata: Metadata = {
  title: "Serviços",
  description: "Catálogo de serviços, combos, duração, buffer e preço.",
};

export default function ServicesPage() {
  return <ServicesView />;
}
