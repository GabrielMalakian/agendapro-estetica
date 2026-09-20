import type { Metadata } from "next";

import { ProProductionView } from "./pro-production-view";

export const metadata: Metadata = { title: "Minha produção" };

export default function ProProductionPage() {
  return <ProProductionView />;
}
