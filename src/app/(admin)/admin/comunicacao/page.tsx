import type { Metadata } from "next";

import { CommunicationView } from "./communication-view";

export const metadata: Metadata = {
  title: "Comunicação",
  description: "Régua de lembretes, templates e caixa de saída.",
};

export default function CommunicationPage() {
  return <CommunicationView />;
}
