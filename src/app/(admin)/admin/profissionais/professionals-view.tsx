"use client";

import { CalendarOff, Check, Pencil, Plus, Power, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { ProfessionalFormDialog } from "@/components/forms/professional-form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { professionalRepository, serviceRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { formatDate, formatPercent, initials } from "@/lib/format";
import {
  TIME_OFF_TYPE_LABELS,
  WEEKDAYS,
  type Professional,
  type Weekday,
} from "@/types";

const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: "D",
  1: "S",
  2: "T",
  3: "Q",
  4: "Q",
  5: "S",
  6: "S",
};

const WEEKDAY_FULL: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export function ProfessionalsView() {
  const { activeUnitId } = useSession();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);

  const {
    data: professionals,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      activeUnitId
        ? professionalRepository.list({ unitId: activeUnitId })
        : Promise.resolve([]),
    [activeUnitId],
  );

  const { data: services } = useAsyncData(
    () => (activeUnitId ? serviceRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  const rows = professionals ?? [];

  const toggleActive = async (professional: Professional) => {
    if (professional.active) {
      await professionalRepository.deactivate(professional.id);
      toast.success(`${professional.name} desativado.`);
    } else {
      await professionalRepository.update(professional.id, { active: true });
      toast.success(`${professional.name} reativado.`);
    }
    reload();
  };

  const decideTimeOff = async (
    professional: Professional,
    timeOffId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    await professionalRepository.updateTimeOffStatus(
      professional.id,
      timeOffId,
      status,
    );
    toast.success(status === "APPROVED" ? "Folga aprovada." : "Folga recusada.");
    reload();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profissionais"
        description={`${rows.filter((item) => item.active).length} ativos nesta unidade`}
        actions={
          <Button
            className="gap-1.5"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Novo profissional
          </Button>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !professionals ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nenhum profissional cadastrado"
          description="Cadastre a equipe para que os horários apareçam na agenda."
          action={
            <Button size="sm" onClick={() => setFormOpen(true)}>
              Cadastrar profissional
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((professional) => {
            const pending = professional.timeOff.filter(
              (item) => item.status === "PENDING",
            );
            const upcoming = professional.timeOff.filter(
              (item) =>
                item.status === "APPROVED" &&
                new Date(item.endDate) >= new Date(new Date().toDateString()),
            );
            const serviceNames = professional.serviceIds
              .map((id) => (services ?? []).find((item) => item.id === id)?.name)
              .filter(Boolean) as string[];

            return (
              <Card key={professional.id} className={!professional.active ? "opacity-70" : ""}>
                <CardContent className="space-y-4 py-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-11">
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {initials(professional.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {professional.name}
                        {!professional.active && (
                          <Badge variant="outline" className="text-[0.625rem]">
                            inativo
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {professional.specialty}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comissão de {formatPercent(professional.commissionRate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Editar ${professional.name}`}
                        onClick={() => {
                          setEditing(professional);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={
                          professional.active
                            ? `Desativar ${professional.name}`
                            : `Reativar ${professional.name}`
                        }
                        onClick={() => toggleActive(professional)}
                      >
                        <Power className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Grade semanal */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Grade semanal
                    </p>
                    <div className="flex gap-1">
                      {WEEKDAYS.map((weekday) => {
                        const grid = professional.workingHours.find(
                          (item) => item.weekday === weekday,
                        );
                        const on = grid?.enabled ?? false;
                        return (
                          <span
                            key={weekday}
                            title={
                              on
                                ? `${WEEKDAY_FULL[weekday]}: ${grid?.startTime}–${grid?.endTime}`
                                : `${WEEKDAY_FULL[weekday]}: não atende`
                            }
                            className={
                              on
                                ? "flex size-7 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground"
                                : "flex size-7 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
                            }
                          >
                            <span className="sr-only">
                              {WEEKDAY_FULL[weekday]}
                              {on ? ` das ${grid?.startTime} às ${grid?.endTime}` : ": não atende"}
                            </span>
                            <span aria-hidden>{WEEKDAY_SHORT[weekday]}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Serviços */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Serviços ({serviceNames.length})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {serviceNames.length === 0
                        ? "Nenhum serviço habilitado — este profissional não aparece no agendamento."
                        : serviceNames.slice(0, 6).join(", ") +
                          (serviceNames.length > 6 ? ` e mais ${serviceNames.length - 6}` : "")}
                    </p>
                  </div>

                  {/* Folgas */}
                  {(pending.length > 0 || upcoming.length > 0) && (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <CalendarOff className="size-3" aria-hidden />
                        Folgas e férias
                      </p>
                      <ul className="space-y-1">
                        {[...pending, ...upcoming].map((item) => (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs"
                          >
                            <Badge variant="outline" className="text-[0.625rem]">
                              {TIME_OFF_TYPE_LABELS[item.type]}
                            </Badge>
                            <span className="min-w-0 flex-1 truncate">
                              {formatDate(item.startDate)}
                              {item.startDate !== item.endDate &&
                                ` a ${formatDate(item.endDate)}`}
                              {!item.allDay && ` · ${item.startTime}–${item.endTime}`}
                              {item.reason && ` · ${item.reason}`}
                            </span>
                            {item.status === "PENDING" && (
                              <span className="flex gap-1">
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Aprovar folga"
                                  onClick={() =>
                                    decideTimeOff(professional, item.id, "APPROVED")
                                  }
                                >
                                  <Check className="size-3" />
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Recusar folga"
                                  onClick={() =>
                                    decideTimeOff(professional, item.id, "REJECTED")
                                  }
                                >
                                  <X className="size-3" />
                                </Button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeUnitId && (
        <ProfessionalFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          unitId={activeUnitId}
          professional={editing}
          onSaved={() => reload()}
        />
      )}
    </div>
  );
}
