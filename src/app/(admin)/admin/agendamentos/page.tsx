import type { Metadata } from "next";

import { AppointmentsView } from "./appointments-view";

export const metadata: Metadata = {
  title: "Agendamentos",
  description: "Tabela de agendamentos com filtros, busca e ações em massa.",
};

export default function AppointmentsPage() {
  return <AppointmentsView />;
}
