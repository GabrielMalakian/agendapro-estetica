import type { Metadata } from "next";

import { ProClientsView } from "./pro-clients-view";

export const metadata: Metadata = { title: "Meus clientes" };

export default function ProClientsPage() {
  return <ProClientsView />;
}
