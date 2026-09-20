"use client";

import {
  CalendarPlus,
  Clock,
  MapPin,
  Package,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/scheduling/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  appointmentRepository,
  clientRepository,
  companyRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useCurrentClient } from "@/hooks/use-current-client";
import {
  firstName,
  formatCountdown,
  formatCurrency,
  formatDateLong,
  formatTime,
} from "@/lib/format";

import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import { ReviewDialog } from "./review-dialog";

export function ClientHome() {
  const { client, loading: loadingClient } = useCurrentClient();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const {
    data: appointments,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      client
        ? appointmentRepository.list({ clientId: client.id })
        : Promise.resolve([]),
    [client?.id],
    { enabled: Boolean(client) },
  );

  const { data: services } = useAsyncData(
    () => serviceRepository.list({ unitId: client?.unitId, onlyActive: true }),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  const { data: professionals } = useAsyncData(
    () => professionalRepository.list({ unitId: client?.unitId }),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  const { data: unit } = useAsyncData(
    () => (client ? companyRepository.getUnit(client.unitId) : Promise.resolve(null)),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  const { data: clientPackages } = useAsyncData(
    () => (client ? clientRepository.listPackages(client.id) : Promise.resolve([])),
    [client?.id],
    { enabled: Boolean(client) },
  );

  const { data: packages } = useAsyncData(
    () => serviceRepository.listPackages(client?.unitId),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  if (loadingClient && !client) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  if (!client) {
    return (
      <EmptyState
        title="Cadastro não encontrado"
        description="Esta conta ainda não está vinculada a um cliente."
      />
    );
  }

  const serviceName = new Map((services ?? []).map((item) => [item.id, item.name]));
  const professionalName = new Map(
    (professionals ?? []).map((item) => [item.id, item.name]),
  );

  const now = new Date();
  const upcoming = (appointments ?? [])
    .filter(
      (item) =>
        new Date(item.startsAt) > now &&
        item.status !== "CANCELLED" &&
        item.status !== "NO_SHOW",
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const next = upcoming[0];

  const lastCompleted = (appointments ?? [])
    .filter((item) => item.status === "COMPLETED")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];

  // Atendimentos concluídos ainda sem avaliação.
  const pendingReview = (appointments ?? [])
    .filter((item) => item.status === "COMPLETED")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];

  const activePackages = (clientPackages ?? [])
    .map((item) => ({
      item,
      info: (packages ?? []).find((entry) => entry.id === item.packageId),
    }))
    .filter(
      (entry): entry is { item: (typeof entry)["item"]; info: NonNullable<(typeof entry)["info"]> } =>
        Boolean(entry.info) && entry.item.sessionsUsed < entry.info!.totalSessions,
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Olá, {firstName(client.name)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {next
            ? "Seu próximo horário está confirmado abaixo."
            : "Você não tem horários marcados."}
        </p>
      </header>

      {/* Próximo agendamento */}
      {loading && !appointments ? (
        <ListSkeleton rows={1} />
      ) : next ? (
        <Card className="overflow-hidden border-primary/40">
          <div className="bg-primary px-4 py-2 text-primary-foreground">
            <p className="flex items-center gap-2 text-xs font-medium">
              <Clock className="size-3.5" aria-hidden />
              Próximo horário · {formatCountdown(next.startsAt)}
            </p>
          </div>
          <CardContent className="space-y-3 py-4">
            <div className="space-y-1">
              <p className="font-display text-xl font-semibold">
                {serviceName.get(next.serviceId) ?? "Serviço"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateLong(next.startsAt)} às {formatTime(next.startsAt)}
              </p>
              <p className="text-sm text-muted-foreground">
                com {professionalName.get(next.professionalId) ?? "profissional"}
              </p>
              {unit && (
                <p className="flex items-start gap-1.5 pt-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                  {unit.name} — {unit.address}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={next.status} />
              <span className="text-sm font-medium tabular-nums">
                {next.price > 0 ? formatCurrency(next.price) : "Incluso no pacote"}
              </span>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/app/agendar?reagendar=${next.id}`}>Reagendar</Link>
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setCancelId(next.id)}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={CalendarPlus}
          title="Nenhum horário marcado"
          description="Escolha um serviço e veja os horários disponíveis."
          action={
            <Button asChild size="sm">
              <Link href="/app/agendar">Agendar horário</Link>
            </Button>
          }
        />
      )}

      {/* Atalhos */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-auto justify-start gap-3 py-3">
          <Link href="/app/agendar">
            <CalendarPlus className="size-5 shrink-0" aria-hidden />
            <span className="text-left">
              <span className="block text-sm font-medium">Agendar horário</span>
              <span className="block text-xs opacity-80">
                Escolher serviço, profissional e data
              </span>
            </span>
          </Link>
        </Button>

        {lastCompleted && (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-auto justify-start gap-3 py-3"
          >
            <Link href={`/app/agendar?servico=${lastCompleted.serviceId}`}>
              <RotateCcw className="size-5 shrink-0" aria-hidden />
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium">Agendar de novo</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {serviceName.get(lastCompleted.serviceId) ?? "Último serviço"}
                </span>
              </span>
            </Link>
          </Button>
        )}
      </div>

      {/* Avaliação pendente */}
      {pendingReview && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Sparkles className="size-5 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Como foi seu último atendimento?</p>
              <p className="truncate text-xs text-muted-foreground">
                {serviceName.get(pendingReview.serviceId)} com{" "}
                {professionalName.get(pendingReview.professionalId)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setReviewId(pendingReview.id)}
            >
              <Star className="size-3.5" aria-hidden />
              Avaliar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pacotes */}
      {activePackages.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Package className="size-4 text-muted-foreground" aria-hidden />
            Meus pacotes
          </h2>
          <ul className="space-y-2">
            {activePackages.map(({ item, info }) => (
              <li
                key={item.id}
                className="space-y-2 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{info.name}</p>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {item.sessionsUsed}/{info.totalSessions}
                  </Badge>
                </div>
                <Progress
                  value={(item.sessionsUsed / info.totalSessions) * 100}
                  aria-label={`${item.sessionsUsed} de ${info.totalSessions} sessões usadas`}
                />
                <p className="text-xs text-muted-foreground">
                  Restam {info.totalSessions - item.sessionsUsed} sessões.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Próximos além do primeiro */}
      {upcoming.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Outros horários marcados</h2>
          <ul className="space-y-2">
            {upcoming.slice(1).map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {serviceName.get(item.serviceId) ?? "Serviço"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateLong(item.startsAt)} às {formatTime(item.startsAt)}
                  </span>
                </span>
                <StatusBadge status={item.status} showIcon={false} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CancelAppointmentDialog
        appointmentId={cancelId}
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        onCancelled={reload}
      />

      <ReviewDialog
        appointmentId={reviewId}
        clientId={client.id}
        open={reviewId !== null}
        onOpenChange={(open) => !open && setReviewId(null)}
      />
    </div>
  );
}
