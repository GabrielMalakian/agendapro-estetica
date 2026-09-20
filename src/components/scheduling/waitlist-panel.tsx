"use client";

import { ChevronDown, ListPlus, Send, X } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { EmptyState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  clientRepository,
  engagementRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDistanceToNow } from "@/lib/format";
import {
  WAITLIST_STATUS_LABELS,
  WAITLIST_WINDOW_LABELS,
  type WaitlistEntry,
} from "@/types";

interface WaitlistPanelProps {
  unitId: string | null;
  onSchedule: (entry: WaitlistEntry) => void;
}

/**
 * Lista de espera ao pé da agenda: quem avisar quando abrir uma vaga.
 * Fica recolhida por padrão para não competir com a grade.
 */
export function WaitlistPanel({ unitId, onSchedule }: WaitlistPanelProps) {
  const {
    data: entries,
    loading,
    reload,
  } = useAsyncData(
    () => (unitId ? engagementRepository.listWaitlist(unitId) : Promise.resolve([])),
    [unitId],
  );

  const { data: clients } = useAsyncData(
    () => (unitId ? clientRepository.list({ unitId }) : Promise.resolve([])),
    [unitId],
  );

  const { data: services } = useAsyncData(
    () => (unitId ? serviceRepository.list({ unitId }) : Promise.resolve([])),
    [unitId],
  );

  const clientName = useMemo(
    () => new Map((clients ?? []).map((item) => [item.id, item.name])),
    [clients],
  );
  const serviceName = useMemo(
    () => new Map((services ?? []).map((item) => [item.id, item.name])),
    [services],
  );

  const waiting = (entries ?? []).filter(
    (entry) => entry.status === "WAITING" || entry.status === "OFFERED",
  );

  const offer = async (entry: WaitlistEntry) => {
    await engagementRepository.updateWaitlistStatus(entry.id, "OFFERED");
    toast.success("Vaga oferecida.", {
      description: `Mensagem enviada para ${clientName.get(entry.clientId) ?? "o cliente"} (simulada).`,
    });
    reload();
  };

  const drop = async (entry: WaitlistEntry) => {
    await engagementRepository.updateWaitlistStatus(entry.id, "DROPPED");
    toast.success("Removido da lista de espera.");
    reload();
  };

  return (
    <Collapsible className="rounded-xl border border-border bg-card">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <ListPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">Lista de espera</span>
          <Badge variant="secondary">{waiting.length}</Badge>
          <ChevronDown
            className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border p-4">
        {loading && !entries ? (
          <ListSkeleton rows={2} />
        ) : waiting.length === 0 ? (
          <EmptyState
            icon={ListPlus}
            title="Ninguém na lista de espera"
            description="Quando um cliente quiser um horário que já está cheio, adicione-o aqui para avisar assim que abrir vaga."
          />
        ) : (
          <ul className="space-y-2">
            {waiting.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {clientName.get(entry.clientId) ?? "Cliente"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {serviceName.get(entry.serviceId) ?? "Serviço"} ·{" "}
                    {WAITLIST_WINDOW_LABELS[entry.preferredWindow]} · há{" "}
                    {formatDistanceToNow(entry.createdAt).replace("há ", "")}
                  </p>
                  {entry.notes && (
                    <p className="truncate text-xs text-muted-foreground italic">
                      {entry.notes}
                    </p>
                  )}
                </div>

                <Badge variant="outline" className="shrink-0">
                  {WAITLIST_STATUS_LABELS[entry.status]}
                </Badge>

                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => offer(entry)}
                  >
                    <Send className="size-3.5" aria-hidden />
                    Oferecer
                  </Button>
                  <Button size="sm" onClick={() => onSchedule(entry)}>
                    Agendar
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remover da lista"
                    onClick={() => drop(entry)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
