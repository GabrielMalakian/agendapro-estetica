"use client";

import { addDays, isSameDay, startOfDay } from "date-fns";
import {
  ArrowLeft,
  CalendarCheck2,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  PartyPopper,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  ErrorState,
  ListSkeleton,
} from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppointmentConflictError,
  appointmentRepository,
  companyRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useCurrentClient } from "@/hooks/use-current-client";
import {
  formatCurrency,
  formatDateLong,
  formatDuration,
  formatTime,
  formatWeekdayShort,
  initials,
} from "@/lib/format";
import { checkNoShowRule, computeDeposit, toDayKey } from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORY_LABELS, type Service } from "@/types";

type Step = "SERVICE" | "PROFESSIONAL" | "DATE" | "TIME" | "SUMMARY" | "DONE";

const STEPS: { id: Step; label: string }[] = [
  { id: "SERVICE", label: "Serviço" },
  { id: "PROFESSIONAL", label: "Profissional" },
  { id: "DATE", label: "Data" },
  { id: "TIME", label: "Horário" },
  { id: "SUMMARY", label: "Resumo" },
];

const ANY_PROFESSIONAL = "__any__";
/** Quantos dias o calendário oferece de uma vez. */
const CALENDAR_DAYS = 28;

export function BookingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { client, loading: loadingClient } = useCurrentClient();

  const rescheduleId = params.get("reagendar");
  const presetServiceId = params.get("servico");

  const [step, setStep] = useState<Step>("SERVICE");
  const [serviceId, setServiceId] = useState<string | null>(presetServiceId);
  const [professionalId, setProfessionalId] = useState<string>(ANY_PROFESSIONAL);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ startsAt: string; roomId?: string; professionalId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  /* -------------------------------- dados -------------------------------- */
  const { data: services, loading: loadingServices, error } = useAsyncData(
    () => serviceRepository.list({ unitId: client?.unitId, onlyActive: true }),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  const { data: professionals } = useAsyncData(
    () =>
      professionalRepository.list({
        unitId: client?.unitId,
        serviceId: serviceId ?? undefined,
        onlyActive: true,
      }),
    [client?.unitId, serviceId],
    { enabled: Boolean(client && serviceId) },
  );

  const { data: unit } = useAsyncData(
    () => (client ? companyRepository.getUnit(client.unitId) : Promise.resolve(null)),
    [client?.unitId],
    { enabled: Boolean(client) },
  );

  const { data: settings } = useAsyncData(() => companyRepository.getSettings(), []);

  const { data: myAppointments } = useAsyncData(
    () => (client ? appointmentRepository.list({ clientId: client.id }) : Promise.resolve([])),
    [client?.id],
    { enabled: Boolean(client) },
  );

  const { data: availableDays, loading: loadingDays } = useAsyncData(
    () =>
      client && serviceId
        ? appointmentRepository.availableDays({
            unitId: client.unitId,
            serviceId,
            professionalId:
              professionalId === ANY_PROFESSIONAL ? undefined : professionalId,
            from: toDayKey(new Date()),
            days: CALENDAR_DAYS,
          })
        : Promise.resolve([]),
    [client?.unitId, serviceId, professionalId],
    { enabled: Boolean(client && serviceId) && step === "DATE" },
  );

  const { data: slots, loading: loadingSlots } = useAsyncData(
    () => {
      if (!client || !serviceId || !date) return Promise.resolve([]);
      if (professionalId !== ANY_PROFESSIONAL) {
        return appointmentRepository
          .availableSlots({
            date,
            unitId: client.unitId,
            serviceId,
            professionalId,
            excludeAppointmentId: rescheduleId ?? undefined,
          })
          .then((list) =>
            list
              .filter((item) => item.available)
              .map((item) => ({ ...item, professionalId })),
          );
      }
      // "Primeiro disponível": junta os horários de todos e mantém o mais cedo.
      return Promise.all(
        (professionals ?? []).map((pro) =>
          appointmentRepository
            .availableSlots({
              date,
              unitId: client.unitId,
              serviceId,
              professionalId: pro.id,
              excludeAppointmentId: rescheduleId ?? undefined,
            })
            .then((list) =>
              list
                .filter((item) => item.available)
                .map((item) => ({ ...item, professionalId: pro.id })),
            ),
        ),
      ).then((groups) => {
        const byTime = new Map<string, (typeof groups)[number][number]>();
        for (const item of groups.flat()) {
          if (!byTime.has(item.startsAt)) byTime.set(item.startsAt, item);
        }
        return [...byTime.values()].sort((a, b) =>
          a.startsAt.localeCompare(b.startsAt),
        );
      });
    },
    [client?.unitId, serviceId, professionalId, date, professionals?.length, rescheduleId],
    { enabled: Boolean(client && serviceId && date) && step === "TIME" },
  );

  /* ---------------------- pré-seleção vinda da querystring ---------------- */
  useEffect(() => {
    if (presetServiceId && step === "SERVICE") setStep("PROFESSIONAL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetServiceId]);

  const { data: rescheduleSource } = useAsyncData(
    () => (rescheduleId ? appointmentRepository.get(rescheduleId) : Promise.resolve(null)),
    [rescheduleId],
    { enabled: Boolean(rescheduleId) },
  );

  useEffect(() => {
    if (!rescheduleSource || serviceId) return;
    setServiceId(rescheduleSource.serviceId);
    setProfessionalId(rescheduleSource.professionalId);
    setStep("DATE");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleSource?.id]);

  /* ------------------------------ derivados ------------------------------ */
  const service = (services ?? []).find((item) => item.id === serviceId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const item of services ?? []) {
      const key = SERVICE_CATEGORY_LABELS[item.category];
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [services]);

  const noShowCheck =
    settings && myAppointments
      ? checkNoShowRule(myAppointments, settings.noShowPolicy, new Date())
      : null;

  const deposit =
    service && settings
      ? computeDeposit(service, settings.depositPolicy, {
          clientAtRisk: noShowCheck?.atRisk,
        })
      : 0;

  const chosenProfessional = slot
    ? (professionals ?? []).find((item) => item.id === slot.professionalId)
    : null;

  const availableDaySet = new Set(availableDays ?? []);

  /* ------------------------------- ações --------------------------------- */
  const goBack = () => {
    const index = STEPS.findIndex((item) => item.id === step);
    if (index <= 0) {
      router.push("/app");
      return;
    }
    setStep(STEPS[index - 1].id);
  };

  const confirm = async () => {
    if (!client || !service || !slot) return;
    setSaving(true);
    try {
      if (rescheduleId) {
        await appointmentRepository.update(rescheduleId, {
          startsAt: slot.startsAt,
          professionalId: slot.professionalId,
          roomId: slot.roomId,
        });
        setConfirmed(rescheduleId);
      } else {
        const created = await appointmentRepository.create({
          unitId: client.unitId,
          clientId: client.id,
          professionalId: slot.professionalId,
          serviceId: service.id,
          roomId: slot.roomId,
          startsAt: slot.startsAt,
          createdBy: client.userId ?? client.id,
          source: "ONLINE",
          depositAmount: deposit > 0 ? deposit : undefined,
        });
        setConfirmed(created.id);
      }
      setStep("DONE");
    } catch (cause) {
      if (cause instanceof AppointmentConflictError) {
        toast.error("Este horário acabou de ser ocupado", {
          description: "Escolha outro horário, por favor.",
        });
        setStep("TIME");
      } else {
        toast.error("Não foi possível confirmar. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- render -------------------------------- */
  if (loadingClient && !client) return <ListSkeleton rows={4} />;
  if (error) return <ErrorState error={error} />;
  if (!client) {
    return <EmptyState title="Cadastro não encontrado" />;
  }

  if (step === "DONE") {
    return (
      <div className="space-y-5 py-6 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <PartyPopper className="size-8" aria-hidden />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">
            {rescheduleId ? "Horário remarcado!" : "Horário confirmado!"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Enviaremos um lembrete no WhatsApp antes do atendimento.
          </p>
        </div>

        {slot && service && (
          <Card className="text-left">
            <CardContent className="space-y-2 py-4">
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateLong(slot.startsAt)} às {formatTime(slot.startsAt)}
              </p>
              <p className="text-sm text-muted-foreground">
                com {chosenProfessional?.name ?? "profissional"}
              </p>
              {unit && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                  {unit.name} — {unit.address}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/app">Voltar para o início</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/agendamentos">Ver meus horários</Link>
          </Button>
        </div>

        {confirmed && (
          <p className="text-xs text-muted-foreground">
            Código do agendamento: {confirmed.slice(0, 8)}
          </p>
        )}
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={goBack} aria-label="Voltar">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {rescheduleId ? "Reagendar" : "Agendar horário"}
        </h1>
      </div>

      {/* Passos */}
      <ol className="flex items-center gap-1" aria-label="Etapas do agendamento">
        {STEPS.map((item, index) => {
          const done = index < stepIndex;
          const current = index === stepIndex;
          return (
            <li key={item.id} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[0.625rem] font-medium",
                  done
                    ? "bg-primary text-primary-foreground"
                    : current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                      : "bg-muted text-muted-foreground",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check className="size-3" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-[0.625rem]",
                  current ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>

      {noShowCheck?.atRisk && step === "SERVICE" && (
        <Alert variant="destructive">
          <Sparkles className="size-4" aria-hidden />
          <AlertDescription className="text-xs">
            Você tem {noShowCheck.count} faltas registradas. Este agendamento
            pode exigir pagamento antecipado.
          </AlertDescription>
        </Alert>
      )}

      {/* ---------------------------- 1. Serviço --------------------------- */}
      {step === "SERVICE" && (
        <div className="space-y-4">
          {loadingServices && !services ? (
            <ListSkeleton rows={5} />
          ) : (
            grouped.map(([category, items]) => (
              <section key={category} className="space-y-2">
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {category}
                </h2>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setServiceId(item.id);
                          setProfessionalId(ANY_PROFESSIONAL);
                          setDate(null);
                          setSlot(null);
                          setStep("PROFESSIONAL");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                          serviceId === item.id ? "border-primary" : "border-border",
                        )}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                          <Sparkles className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {formatDuration(item.durationMinutes)} ·{" "}
                            {formatCurrency(item.price)}
                          </span>
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {/* ------------------------- 2. Profissional ------------------------- */}
      {step === "PROFESSIONAL" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setProfessionalId(ANY_PROFESSIONAL);
              setDate(null);
              setSlot(null);
              setStep("DATE");
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
              professionalId === ANY_PROFESSIONAL ? "border-primary" : "border-border",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Primeiro disponível</span>
              <span className="block text-xs text-muted-foreground">
                Pegamos o horário mais cedo com qualquer profissional
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>

          {(professionals ?? []).map((pro) => (
            <button
              key={pro.id}
              type="button"
              onClick={() => {
                setProfessionalId(pro.id);
                setDate(null);
                setSlot(null);
                setStep("DATE");
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                professionalId === pro.id ? "border-primary" : "border-border",
              )}
            >
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                  {initials(pro.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{pro.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {pro.specialty}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {/* ----------------------------- 3. Data ----------------------------- */}
      {step === "DATE" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Dias sem vaga aparecem desabilitados.
          </p>

          {loadingDays && !availableDays ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {Array.from({ length: 14 }, (_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : availableDaySet.size === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title="Sem vagas nos próximos dias"
              description="Tente outro profissional ou entre na lista de espera pela recepção."
            />
          ) : (
            <div
              className="grid grid-cols-4 gap-2 sm:grid-cols-7"
              role="group"
              aria-label="Escolha a data"
            >
              {Array.from({ length: CALENDAR_DAYS }, (_, offset) => {
                const day = addDays(startOfDay(new Date()), offset);
                const key = toDayKey(day);
                const enabled = availableDaySet.has(key);
                const selected = date === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!enabled}
                    aria-pressed={selected}
                    aria-label={`${formatDateLong(day)}${enabled ? "" : " — sem vaga"}`}
                    onClick={() => {
                      setDate(key);
                      setSlot(null);
                      setStep("TIME");
                    }}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl border py-2 text-center transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : enabled
                          ? "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
                          : "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground/50",
                    )}
                  >
                    <span className="text-[0.625rem] uppercase">
                      {formatWeekdayShort(day)}
                    </span>
                    <span className="text-base font-semibold tabular-nums">
                      {day.getDate()}
                    </span>
                    {isSameDay(day, new Date()) && (
                      <span className="text-[0.5625rem]">hoje</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------- 4. Horário --------------------------- */}
      {step === "TIME" && date && (
        <div className="space-y-3">
          <p className="text-sm font-medium first-letter:uppercase">
            {formatDateLong(date)}
          </p>

          {loadingSlots && !slots ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {Array.from({ length: 12 }, (_, index) => (
                <Skeleton key={index} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : (slots ?? []).length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Sem horários livres neste dia"
              description="Volte e escolha outra data."
              action={
                <Button variant="outline" size="sm" onClick={() => setStep("DATE")}>
                  Escolher outra data
                </Button>
              }
            />
          ) : (
            <div
              className="grid grid-cols-3 gap-2 sm:grid-cols-5"
              role="radiogroup"
              aria-label="Horários disponíveis"
            >
              {(slots ?? []).map((item) => {
                const selected = slot?.startsAt === item.startsAt;
                return (
                  <button
                    key={item.startsAt}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSlot({
                        startsAt: item.startsAt,
                        roomId: item.roomId,
                        professionalId: item.professionalId,
                      });
                      setStep("SUMMARY");
                    }}
                    className={cn(
                      "rounded-lg border py-2.5 text-sm tabular-nums transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                    )}
                  >
                    {formatTime(item.startsAt)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------- 5. Resumo ---------------------------- */}
      {step === "SUMMARY" && service && slot && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(service.durationMinutes)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-sm">{chosenProfessional?.name ?? "Profissional"}</p>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-sm first-letter:uppercase">
                  {formatDateLong(slot.startsAt)} às {formatTime(slot.startsAt)}
                </p>
              </div>

              {unit && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="text-sm">
                    {unit.name}
                    <span className="block text-xs text-muted-foreground">
                      {unit.address}
                    </span>
                  </p>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="size-4" aria-hidden />
                  Valor do serviço
                </span>
                <span className="font-display text-lg font-semibold">
                  {formatCurrency(service.price)}
                </span>
              </div>

              {deposit > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2">
                  <span className="text-sm text-accent-foreground">
                    Sinal para confirmar
                  </span>
                  <Badge variant="secondary">{formatCurrency(deposit)}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {settings && (
            <p className="text-xs text-muted-foreground">
              {settings.cancellationPolicy.description}
            </p>
          )}

          <Button className="w-full" size="lg" onClick={confirm} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {rescheduleId ? "Confirmar novo horário" : "Confirmar agendamento"}
          </Button>
        </div>
      )}
    </div>
  );
}
