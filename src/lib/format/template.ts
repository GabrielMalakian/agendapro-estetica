import type { TemplateVariable } from "@/types";

import { formatCurrency, formatDate, formatTime } from ".";

/**
 * Renderização dos templates de mensagem.
 *
 * As variáveis são `{{nome}}` em texto simples — o mesmo formato que a
 * maioria das plataformas de WhatsApp aceita, então o template escrito aqui
 * pode ser colado lá sem tradução.
 */

export type TemplateContext = Partial<Record<TemplateVariable, string>>;

export interface AppointmentLike {
  startsAt: string;
  price: number;
}

/** Monta o contexto a partir dos nomes já resolvidos. */
export function buildTemplateContext(input: {
  clientName?: string;
  professionalName?: string;
  serviceName?: string;
  unitName?: string;
  appointment?: AppointmentLike;
}): TemplateContext {
  return {
    cliente: input.clientName?.split(" ")[0] ?? "cliente",
    profissional: input.professionalName ?? "nossa equipe",
    servico: input.serviceName ?? "seu atendimento",
    unidade: input.unitName ?? "nossa unidade",
    data: input.appointment ? formatDate(input.appointment.startsAt) : "",
    hora: input.appointment ? formatTime(input.appointment.startsAt) : "",
    valor: input.appointment ? formatCurrency(input.appointment.price) : "",
  };
}

/** Substitui `{{variavel}}` pelos valores do contexto. */
export function renderTemplate(body: string, context: TemplateContext): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = context[key as TemplateVariable];
    return value ?? match;
  });
}

/** Variáveis usadas por um template — para avisar sobre nomes inválidos. */
export function extractVariables(body: string): string[] {
  const found = body.match(/\{\{\s*(\w+)\s*\}\}/g) ?? [];
  return [...new Set(found.map((item) => item.replace(/[{}\s]/g, "")))];
}
