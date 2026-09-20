import type { Metadata } from "next";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/common/states";

import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = { title: "Agendar horário" };

export default function BookingPage() {
  // useSearchParams exige um limite de Suspense na renderização estática.
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <BookingFlow />
    </Suspense>
  );
}
