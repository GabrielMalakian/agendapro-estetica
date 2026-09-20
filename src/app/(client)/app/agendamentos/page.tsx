import type { Metadata } from "next";

import { ClientAppointmentsView } from "./client-appointments-view";

export const metadata: Metadata = { title: "Meus horários" };

export default function ClientAppointmentsPage() {
  return <ClientAppointmentsView />;
}
