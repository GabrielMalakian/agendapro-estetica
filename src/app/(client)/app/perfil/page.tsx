import type { Metadata } from "next";

import { ClientProfileView } from "./client-profile-view";

export const metadata: Metadata = { title: "Perfil" };

export default function ClientProfilePage() {
  return <ClientProfileView />;
}
