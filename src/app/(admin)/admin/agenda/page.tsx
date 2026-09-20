import type { Metadata } from "next";

import { AgendaView } from "./agenda-view";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Agenda geral por profissional e por sala.",
};

export default function AgendaPage() {
  return <AgendaView />;
}
