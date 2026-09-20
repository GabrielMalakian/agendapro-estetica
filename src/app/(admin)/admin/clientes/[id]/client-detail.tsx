"use client";

import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  FileText,
  HeartPulse,
  Package,
  Pencil,
  ShieldAlert,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import {
  CardsSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
} from "@/components/common/states";
import { ClientFormDialog } from "@/components/forms/client-form-dialog";
import { AppointmentDetailSheet } from "@/components/scheduling/appointment-detail-sheet";
import {
  PaymentBadge,
  StatusBadge,
} from "@/components/scheduling/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  appointmentRepository,
  clientRepository,
  companyRepository,
  engagementRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  formatCpf,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatPhone,
  formatTime,
  initials,
} from "@/lib/format";
import { checkNoShowRule } from "@/lib/scheduling";
import { TREATMENT_STEP_STATUS_LABELS, QUOTE_STATUS_LABELS } from "@/types";

interface ClientDetailProps {
  clientId: string;
}

export function ClientDetail({ clientId }: ClientDetailProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const {
    data: client,
    loading,
    error,
    reload,
  } = useAsyncData(() => clientRepository.get(clientId), [clientId]);

  const { data: appointments } = useAsyncData(
    () => appointmentRepository.list({ clientId }),
    [clientId],
  );

  const { data: clientPackages } = useAsyncData(
    () => clientRepository.listPackages(clientId),
    [clientId],
  );

  const { data: packages } = useAsyncData(
    () => serviceRepository.listPackages(client?.unitId),
    [client?.unitId],
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

  const { data: payments } = useAsyncData(
    () => appointmentRepository.listPayments(),
    [],
  );

  const { data: settings } = useAsyncData(() => companyRepository.getSettings(), []);

  const { data: reviews } = useAsyncData(
    () => engagementRepository.listReviews({ clientId }),
    [clientId],
  );

  const { data: contraindications } = useAsyncData(
    () => engagementRepository.listContraindications(clientId),
    [clientId],
  );

  const { data: treatmentPlans } = useAsyncData(
    () => engagementRepository.listTreatmentPlans(clientId),
    [clientId],
  );

  const { data: quotes } = useAsyncData(
    () => engagementRepository.listQuotes(clientId),
    [clientId],
  );

  const { data: evolution } = useAsyncData(
    () => engagementRepository.listEvolution(clientId),
    [clientId],
  );

  if (loading && !client) {
    return (
      <div className="space-y-4">
        <CardsSkeleton />
        <ListSkeleton />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!client) {
    return (
      <EmptyState
        title="Cliente não encontrado"
        description="O cadastro pode ter sido removido."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/clientes">Voltar para a lista</Link>
          </Button>
        }
      />
    );
  }

  const { metrics } = client;
  const serviceName = new Map((services ?? []).map((item) => [item.id, item.name]));
  const professionalName = new Map(
    (professionals ?? []).map((item) => [item.id, item.name]),
  );
  const appointmentIds = new Set((appointments ?? []).map((item) => item.id));
  const clientPayments = (payments ?? []).filter((payment) =>
    appointmentIds.has(payment.appointmentId),
  );

  const noShowCheck = settings
    ? checkNoShowRule(appointments ?? [], settings.noShowPolicy, new Date())
    : null;

  const upcoming = (appointments ?? [])
    .filter(
      (item) =>
        new Date(item.startsAt) > new Date() &&
        item.status !== "CANCELLED" &&
        item.status !== "NO_SHOW",
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const history = (appointments ?? [])
    .filter((item) => new Date(item.startsAt) <= new Date())
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const METRICS = [
    { label: "Atendimentos", value: String(metrics.completed), icon: CalendarClock },
    { label: "Total gasto", value: formatCurrency(metrics.totalSpent), icon: CreditCard },
    { label: "Ticket médio", value: formatCurrency(metrics.averageTicket), icon: TrendingUp },
    {
      label: "Faltas / cancelamentos",
      value: `${metrics.noShows} / ${metrics.cancellations}`,
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
        <Link href="/admin/clientes">
          <ArrowLeft className="size-4" aria-hidden />
          Clientes
        </Link>
      </Button>

      <PageHeader
        title={client.name}
        description={`Cliente desde ${formatDateLong(client.createdAt)}`}
        actions={
          <Button variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden />
            Editar
          </Button>
        }
      />

      {/* Identificação */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-accent text-lg text-accent-foreground">
            {initials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatPhone(client.phone)} · {client.email}
          </p>
        </div>
        <div className="space-y-1 text-right text-sm">
          <p className="text-muted-foreground">
            Última visita:{" "}
            <span className="text-foreground">
              {metrics.lastVisitAt ? formatDate(metrics.lastVisitAt) : "—"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Próxima:{" "}
            <span className="text-foreground">
              {metrics.nextVisitAt ? formatDate(metrics.nextVisitAt) : "sem agendamento"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Profissional preferido:{" "}
            <span className="text-foreground">
              {metrics.favoriteProfessionalId
                ? (professionalName.get(metrics.favoriteProfessionalId) ?? "—")
                : "—"}
            </span>
          </p>
        </div>
      </div>

      {noShowCheck?.message && (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" aria-hidden />
          <AlertTitle>Política de no-show acionada</AlertTitle>
          <AlertDescription>{noShowCheck.message}</AlertDescription>
        </Alert>
      )}

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <metric.icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="truncate font-display text-lg font-semibold">
                  {metric.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Abas */}
      <Tabs defaultValue="dados">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="observacoes">Observações</TabsTrigger>
        </TabsList>

        {/* --- Dados --- */}
        <TabsContent value="dados" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
              {[
                ["CPF", client.cpf ? formatCpf(client.cpf) : "—"],
                ["Telefone", formatPhone(client.phone)],
                ["WhatsApp", formatPhone(client.whatsapp)],
                ["E-mail", client.email || "—"],
                [
                  "Nascimento",
                  client.birthDate ? formatDate(client.birthDate) : "—",
                ],
                ["Endereço", client.address || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}

              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  Receber lembretes por
                </dt>
                <dd className="flex gap-1.5 pt-1">
                  {(
                    [
                      ["WhatsApp", client.notificationPreferences.whatsapp],
                      ["E-mail", client.notificationPreferences.email],
                      ["Push", client.notificationPreferences.push],
                    ] as const
                  ).map(([label, enabled]) => (
                    <Badge key={label} variant={enabled ? "default" : "outline"}>
                      {label}
                    </Badge>
                  ))}
                </dd>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Histórico --- */}
        <TabsContent value="historico" className="mt-4 space-y-4">
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Próximos</h2>
              <ul className="space-y-2">
                {upcoming.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setDetailId(item.id)}
                      className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {serviceName.get(item.serviceId) ?? "Serviço"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatDateLong(item.startsAt)} às {formatTime(item.startsAt)} ·{" "}
                          {professionalName.get(item.professionalId) ?? ""}
                        </span>
                      </span>
                      <StatusBadge status={item.status} showIcon={false} />
                      <span className="text-sm tabular-nums">
                        {formatCurrency(item.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Anteriores</h2>
            {history.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nenhum atendimento ainda"
                description="Este cliente ainda não passou pela casa."
              />
            ) : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setDetailId(item.id)}
                      className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {serviceName.get(item.serviceId) ?? "Serviço"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatDate(item.startsAt)} ·{" "}
                          {professionalName.get(item.professionalId) ?? ""}
                        </span>
                      </span>
                      <StatusBadge status={item.status} showIcon={false} />
                      <PaymentBadge status={item.paymentStatus} />
                      <span className="text-sm tabular-nums">
                        {formatCurrency(item.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        {/* --- Pacotes --- */}
        <TabsContent value="pacotes" className="mt-4">
          {(clientPackages ?? []).length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum pacote contratado"
              description="Pacotes de sessões aparecem aqui com o progresso de uso."
            />
          ) : (
            <ul className="space-y-3">
              {(clientPackages ?? []).map((item) => {
                const pkg = (packages ?? []).find((p) => p.id === item.packageId);
                const total = pkg?.totalSessions ?? 0;
                const percent = total > 0 ? (item.sessionsUsed / total) * 100 : 0;
                const expired = new Date(item.expiresAt) < new Date();
                return (
                  <li
                    key={item.id}
                    className="space-y-2 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{pkg?.name ?? "Pacote"}</p>
                      <Badge variant={expired ? "outline" : "secondary"}>
                        {expired ? "Expirado" : `Válido até ${formatDate(item.expiresAt)}`}
                      </Badge>
                    </div>
                    <Progress value={percent} aria-label="Sessões usadas" />
                    <p className="text-xs text-muted-foreground">
                      {item.sessionsUsed} de {total} sessões usadas ·{" "}
                      {total - item.sessionsUsed} restantes · comprado em{" "}
                      {formatDate(item.purchasedAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        {/* --- Pagamentos --- */}
        <TabsContent value="pagamentos" className="mt-4">
          {clientPayments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhum pagamento registrado"
              description="Pagamentos lançados nos atendimentos aparecem aqui."
            />
          ) : (
            <ul className="space-y-2">
              {clientPayments
                .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
                .map((payment) => {
                  const appointment = (appointments ?? []).find(
                    (item) => item.id === payment.appointmentId,
                  );
                  return (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {appointment
                            ? (serviceName.get(appointment.serviceId) ?? "Serviço")
                            : "Serviço"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(payment.paidAt)}
                        </span>
                      </span>
                      <Badge variant="outline">{payment.method}</Badge>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(payment.amount)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </TabsContent>

        {/* --- Observações + módulos por segmento --- */}
        <TabsContent value="observacoes" className="mt-4 space-y-4">
          <Card>
            <CardContent className="space-y-4 py-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4 text-muted-foreground" aria-hidden />
                  Observações gerais
                </h3>
                <p className="pt-1.5 text-sm text-muted-foreground">
                  {client.notes || "Nenhuma observação registrada."}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <HeartPulse className="size-4 text-muted-foreground" aria-hidden />
                  Restrições e contraindicações
                </h3>
                <p className="pt-1.5 text-sm text-muted-foreground">
                  {client.healthNotes || "Sem restrições relatadas."}
                </p>
                {(contraindications ?? []).length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 pt-2">
                    {(contraindications ?? []).map((item) => (
                      <li key={item.id}>
                        <Badge
                          variant={item.severity === "HIGH" ? "destructive" : "secondary"}
                        >
                          {item.label}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="pt-2 text-xs text-muted-foreground">
                  LGPD: dado pessoal sensível. No backend real, cifrado em repouso
                  e com acesso auditado.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ficha de evolução (estética) */}
          {(evolution ?? []).length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Ficha de evolução</h2>
              <ul className="space-y-2">
                {(evolution ?? []).map((record) => (
                  <li
                    key={record.id}
                    className="space-y-1.5 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Sessão {record.sessionNumber}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(record.createdAt)} ·{" "}
                        {professionalName.get(record.professionalId) ?? ""}
                      </span>
                    </div>
                    <p className="text-sm">{record.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Reações: {record.reactions}
                    </p>
                    {record.photos.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {record.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-[0.625rem] text-muted-foreground"
                          >
                            {photo.label === "BEFORE" ? "Antes" : "Depois"}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Galeria antes/depois é placeholder — não há upload nesta demonstração.
              </p>
            </section>
          )}

          {/* Plano de tratamento e orçamento (odontologia) */}
          {(treatmentPlans ?? []).length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Plano de tratamento</h2>
              {(treatmentPlans ?? []).map((plan) => (
                <div
                  key={plan.id}
                  className="space-y-2 rounded-xl border border-border bg-card p-4"
                >
                  <p className="font-medium">{plan.title}</p>
                  <ol className="space-y-1.5">
                    {plan.steps.map((step) => (
                      <li
                        key={step.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                      >
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {step.order}.
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {step.title}
                          {step.tooth !== "—" && (
                            <span className="text-muted-foreground"> · dente {step.tooth}</span>
                          )}
                        </span>
                        <Badge variant="outline" className="text-[0.625rem]">
                          {TREATMENT_STEP_STATUS_LABELS[step.status]}
                        </Badge>
                        <span className="tabular-nums">{formatCurrency(step.price)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          )}

          {(quotes ?? []).length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Orçamentos</h2>
              <ul className="space-y-2">
                {(quotes ?? []).map((quote) => {
                  const total =
                    quote.items.reduce(
                      (sum, item) => sum + item.quantity * item.unitPrice,
                      0,
                    ) - quote.discount;
                  return (
                    <li
                      key={quote.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{quote.number}</span>
                        <span className="block text-xs text-muted-foreground">
                          {quote.items.length} itens · válido até{" "}
                          {formatDate(quote.validUntil)}
                          {quote.attachments.length > 0 &&
                            ` · ${quote.attachments.length} anexo(s)`}
                        </span>
                      </span>
                      <Badge
                        variant={
                          quote.status === "APPROVED"
                            ? "default"
                            : quote.status === "REJECTED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </Badge>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(total)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Avaliações */}
          {(reviews ?? []).length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Avaliações deixadas</h2>
              <ul className="space-y-2">
                {(reviews ?? []).map((review) => (
                  <li
                    key={review.id}
                    className="space-y-1 rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <div className="flex items-center gap-1" aria-label={`${review.rating} de 5`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={
                            index < review.rating
                              ? "size-3.5 fill-warning text-warning"
                              : "size-3.5 text-muted-foreground/40"
                          }
                          aria-hidden
                        />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm">{review.comment}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </TabsContent>
      </Tabs>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        unitId={client.unitId}
        client={client}
        onSaved={() => reload()}
      />

      <AppointmentDetailSheet
        appointmentId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => !open && setDetailId(null)}
      />
    </div>
  );
}
