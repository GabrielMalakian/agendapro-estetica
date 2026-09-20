import type { Metadata } from "next";

import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Visão do dia e dos últimos 30 dias.",
};

export default function AdminDashboardPage() {
  return <DashboardView />;
}
