import type { Metadata } from "next";
import { Suspense } from "react";

import { AppBootScreen } from "@/components/layout/app-boot-screen";

import { LoginScreen } from "./login-screen";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse a demonstração do AgendaPro como administrador, profissional ou cliente.",
};

export default function LoginPage() {
  // useSearchParams (`?perfil=`, `?proximo=`) exige um limite de Suspense na
  // renderização estática.
  return (
    <Suspense fallback={<AppBootScreen label="Preparando a demonstração…" />}>
      <LoginScreen />
    </Suspense>
  );
}
