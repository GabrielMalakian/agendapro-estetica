import type { Metadata } from "next";

import { SettingsView } from "./settings-view";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Empresa, unidades, políticas, permissões e aparência.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
