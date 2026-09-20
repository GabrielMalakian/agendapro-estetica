"use client";

/**
 * Exportação CSV 100% no cliente.
 *
 * Usa `;` como separador e BOM UTF-8 porque é o que o Excel em pt-BR abre
 * corretamente sem pedir configuração de importação — detalhe pequeno que
 * evita a reclamação mais comum de quem recebe o arquivo.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const SEPARATOR = ";";
const BOM = "﻿";

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes(SEPARATOR) || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(SEPARATOR);
  const body = rows
    .map((row) =>
      columns.map((column) => escapeCell(column.value(row))).join(SEPARATOR),
    )
    .join("\r\n");
  return `${BOM}${header}\r\n${body}`;
}

/** Dispara o download do CSV no navegador. Nenhuma requisição de rede. */
export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const blob = new Blob([toCsv(rows, columns)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Número em formato brasileiro, para o Excel reconhecer como número. */
export function csvNumber(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits).replace(".", ",");
}
