import type { Metadata } from "next";

import { ProfessionalsView } from "./professionals-view";

export const metadata: Metadata = {
  title: "Profissionais",
  description: "Equipe, grade de horários, folgas e comissões.",
};

export default function ProfessionalsPage() {
  return <ProfessionalsView />;
}
