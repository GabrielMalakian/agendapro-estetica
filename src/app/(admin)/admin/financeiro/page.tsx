import type { Metadata } from "next";

import { FinanceView } from "./finance-view";

export const metadata: Metadata = {
  title: "Financeiro",
  description: "Recebimentos, pendências, sinais e fechamento de comissões.",
};

export default function FinancePage() {
  return <FinanceView />;
}
