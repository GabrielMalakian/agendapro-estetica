"use client";

import { CalendarPlus, History, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { PaymentBadge, StatusBadge } from "@/components/scheduling/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  appointmentRepository,
  engagementRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useCurrentClient } from "@/hooks/use-current-client";
import { formatCurrency, formatDateLong, formatTime } from "@/lib/format";
import type { Appointment } from "@/types";

import { CancelAppointmentDialog } from "../cancel-appointment-dialog";
import { ReviewDialog } from "../review-dialog";

export function ClientAppointmentsView() {
  const { client } = useCurrentClient();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const {
    data: appointments,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      client ? appointmentRepository.list({ clientId: client.id }) : Promise.resolve([]),
    [client?.id],
    { enabled: Boolean(client) },
  );

  const { data: services } = useAsyncData(
    () => serviceRepository.list({ unitId: client?.unitId }),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  const { data: professionals } = useAsyncData(
    () => professionalRepository.list({ unitId: client?.unitId }),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  const { data: reviews } = useAsyncData(
    () =>
      client
        ? engagementRepository.listReviews({ clientId: client.id })
        : Promise.resolve([]),
    [client?.id],
    { enabled: Boolean(client) },
  );

  const serviceName = new Map((services ?? []).map((item) => [item.id, item.name]));
  const professionalName = new Map(
    (professionals ?? []).map((item) => [item.id, item.name]),
  );
  const reviewed = new Set((reviews ?? []).map((item) => item.appointmentId));

  const now = new Date();
  const upcoming = (appointments ?? [])
    .filter(
      (item) =>
        new Date(item.startsAt) > now &&
        item.status !== "CANCELLED" &&
        item.status !== "NO_SHOW",
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const history = (appointments ?? [])
    .filter(
      (item) => new Date(item.startsAt) <= now || item.status === "CANCELLED",
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const renderCard = (appointment: Appointment, isUpcoming: boolean) => (
    <li
      key={appointment.id}
      className="space-y-2.5 rounded-xl border border-border bg-card p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {serviceName.get(appointment.serviceId) ?? "Serviço"}
          </p>
          <p className="text-xs text-muted-foreground first-letter:uppercase">
            {formatDateLong(appointment.startsAt)} às{" "}
            {formatTime(appointment.startsAt)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            com {professionalName.get(appointment.professionalId) ?? "profissional"}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {appointment.price > 0 ? formatCurrency(appointment.price) : "Pacote"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={appointment.status} showIcon={false} />
        <PaymentBadge status={appointment.paymentStatus} />
      </div>

      {isUpcoming ? (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/app/agendar?reagendar=${appointment.id}`}>Reagendar</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive"
            onClick={() => setCancelId(appointment.id)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        appointment.status === "COMPLETED" && (
          <div className="flex gap-2">
            {reviewed.has(appointment.id) ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star className="size-3 fill-warning text-warning" aria-hidden />
                Você já avaliou este atendimento
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setReviewId(appointment.id)}
              >
                <Star className="size-3.5" aria-hidden />
                Avaliar
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="ml-auto">
              <Link href={`/app/agendar?servico=${appointment.serviceId}`}>
                Agendar de novo
              </Link>
            </Button>
          </div>
        )
      )}
    </li>
  );

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Meus horários
        </h1>
        <p className="text-sm text-muted-foreground">
          Seus agendamentos e o histórico de atendimentos.
        </p>
      </header>

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">
            Próximos ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            Histórico ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {loading && !appointments ? (
            <ListSkeleton rows={3} />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="Nenhum horário marcado"
              description="Que tal agendar o próximo agora?"
              action={
                <Button asChild size="sm">
                  <Link href="/app/agendar">Agendar horário</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((item) => renderCard(item, true))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loading && !appointments ? (
            <ListSkeleton rows={3} />
          ) : history.length === 0 ? (
            <EmptyState
              icon={History}
              title="Ainda sem histórico"
              description="Seus atendimentos concluídos aparecem aqui."
            />
          ) : (
            <ul className="space-y-2">
              {history.map((item) => renderCard(item, false))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <CancelAppointmentDialog
        appointmentId={cancelId}
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        onCancelled={reload}
      />

      {client && (
        <ReviewDialog
          appointmentId={reviewId}
          clientId={client.id}
          open={reviewId !== null}
          onOpenChange={(open) => !open && setReviewId(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
