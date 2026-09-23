import type { Metadata } from "next";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/common/states";

import { ClientAppointmentsView } from "./client-appointments-view";

export const metadata: Metadata = { title: "Meus horários" };

export default function ClientAppointmentsPage() {
  // `?aba=historico` vem dos atalhos do início; useSearchParams exige Suspense.
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <ClientAppointmentsView />
    </Suspense>
  );
}
