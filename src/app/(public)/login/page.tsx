import type { Metadata } from "next";

import { LoginScreen } from "./login-screen";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse a demonstração do AgendaPro como administrador, profissional ou cliente.",
};

export default function LoginPage() {
  return <LoginScreen />;
}
