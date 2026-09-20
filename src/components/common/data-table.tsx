"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, TableSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Valor usado na ordenação; sem ele a coluna não é ordenável. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  /** Ativa a coluna de seleção e as ações em massa. */
  selection?: {
    selected: string[];
    onChange: (ids: string[]) => void;
  };
  empty?: { title: string; description?: string; action?: React.ReactNode };
  /** Rótulo acessível da tabela. */
  caption: string;
}

/**
 * Tabela simples com ordenação e seleção.
 *
 * Deliberadamente sem TanStack Table: o volume aqui é pequeno e previsível,
 * e uma dependência a mais custaria mais do que estas ~120 linhas.
 */
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  loading,
  onRowClick,
  selection,
  empty,
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return rows;
    const factor = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * factor;
      }
      return String(left).localeCompare(String(right), "pt-BR") * factor;
    });
  }, [rows, columns, sort]);

  const allSelected =
    selection !== undefined &&
    rows.length > 0 &&
    rows.every((row) => selection.selected.includes(row.id));

  if (loading) return <TableSkeleton columns={columns.length} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? "Nada por aqui ainda"}
        description={empty?.description}
        action={empty?.action}
      />
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selection && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  aria-label="Selecionar todos"
                  onCheckedChange={(checked) =>
                    selection.onChange(checked ? rows.map((row) => row.id) : [])
                  }
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.id} className={column.headerClassName}>
                {column.sortValue ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="-ml-2 gap-1 font-medium"
                    onClick={() =>
                      setSort((current) =>
                        current?.id === column.id
                          ? current.desc
                            ? null
                            : { id: column.id, desc: true }
                          : { id: column.id, desc: false },
                      )
                    }
                    aria-label={`Ordenar por ${column.header}`}
                  >
                    {column.header}
                    {sort?.id === column.id ? (
                      sort.desc ? (
                        <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ArrowUp className="size-3" aria-hidden />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                    )}
                  </Button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((row) => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && "cursor-pointer")}
              data-state={
                selection?.selected.includes(row.id) ? "selected" : undefined
              }
            >
              {selection && (
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selection.selected.includes(row.id)}
                    aria-label={`Selecionar linha ${row.id}`}
                    onCheckedChange={(checked) =>
                      selection.onChange(
                        checked
                          ? [...selection.selected, row.id]
                          : selection.selected.filter((id) => id !== row.id),
                      )
                    }
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.id} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
