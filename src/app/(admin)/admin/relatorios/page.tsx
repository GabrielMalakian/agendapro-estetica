import type { Metadata } from "next";

import { ReportsView } from "./reports-view";

export const metadata: Metadata = {
  title: "Relatórios",
  description: "Faturamento, clientes, ocupação e cancelamentos.",
};

export default function ReportsPage() {
  return <ReportsView />;
}
