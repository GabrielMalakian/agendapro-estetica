import type { Metadata } from "next";

import { ClientsView } from "./clients-view";

export const metadata: Metadata = {
  title: "Clientes",
  description: "Base de clientes com segmentação e métricas.",
};

export default function ClientsPage() {
  return <ClientsView />;
}
