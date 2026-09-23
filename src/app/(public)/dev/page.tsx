import type { Metadata } from "next";

import pkg from "../../../../package.json";

import { DevConsole } from "./dev-console";

export const metadata: Metadata = {
  title: "Área do desenvolvedor",
  description:
    "Painel técnico da demonstração do AgendaPro: status da aplicação, base local, rotas e logs simulados.",
  robots: { index: false, follow: false },
};

/**
 * `/dev` — painel técnico da demonstração.
 *
 * Fica fora do `RoleGuard` de propósito: não existe papel DEV nesta demo e o
 * painel não expõe nada além do que já está no `localStorage` do próprio
 * navegador. Num ambiente real esta rota ficaria atrás de autenticação e
 * fora do build de produção.
 *
 * As versões vêm do `package.json` aqui, no servidor, e descem como props —
 * o arquivo inteiro não entra no bundle do cliente.
 */
export default function DevPage() {
  const dependencies = pkg.dependencies as Record<string, string>;

  return (
    <DevConsole
      build={{
        version: pkg.version,
        next: dependencies.next,
        react: dependencies.react,
        tailwind: (pkg.devDependencies as Record<string, string>).tailwindcss,
        typescript: (pkg.devDependencies as Record<string, string>).typescript,
        zustand: dependencies.zustand,
      }}
    />
  );
}
