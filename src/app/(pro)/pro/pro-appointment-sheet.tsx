"use client";

import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  CreditCard,
  Package,
  PlayCircle,
  Save,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/common/states";
import { PaymentDialog } from "@/components/scheduling/payment-dialog";
import {
  PaymentBadge,
  StatusBadge,
} from "@/components/scheduling/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  appointmentRepository,
  clientRepository,
  engagementRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  formatDuration,
  formatPhone,
  formatTime,
} from "@/lib/format";
import type { AppointmentStatus } from "@/types";

interface ProAppointmentSheetProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

const QUICK_ACTIONS: {
  status: AppointmentStatus;
  label: string;
  icon: typeof CircleCheck;
  from: AppointmentStatus[];
  variant?: "default" | "outline" | "destructive";
}[] = [
  { status: "CONFIRMED", label: "Confirmar", icon: CircleCheck, from: ["SCHEDULED"] },
  {
    status: "IN_PROGRESS",
    label: "Iniciar",
    icon: PlayCircle,
    from: ["SCHEDULED", "CONFIRMED"],
  },
  {
    status: "COMPLETED",
    label: "Concluir",
    icon: CheckCheck,
    from: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"],
  },
  {
    status: "NO_SHOW",
    label: "Não compareceu",
    icon: UserX,
    from: ["SCHEDULED", "CONFIRMED"],
    variant: "outline",
  },
  {
    status: "CANCELLED",
    label: "Cancelar",
    icon: Ban,
    from: ["SCHEDULED", "CONFIRMED"],
    variant: "destructive",
  },
];

export function ProAppointmentSheet({
  appointmentId,
  open,
  onOpenChange,
  onChanged,
}: ProAppointmentSheetProps) {
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const {
    data: appointment,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      appointmentId ? appointmentRepository.get(appointmentId) : Promise.resolve(null),
    [appointmentId],
    { enabled: open && Boolean(appointmentId) },
  );

  const { data: client } = useAsyncData(
    () =>
      appointment ? clientRepository.get(appointment.clientId) : Promise.resolve(null),
    [appointment?.clientId],
    { enabled: Boolean(appointment) },
  );

  const { data: service } = useAsyncData(
    () =>
      appointment ? serviceRepository.get(appointment.serviceId) : Promise.resolve(null),
    [appointment?.serviceId],
    { enabled: Boolean(appointment) },
  );

  const { data: history } = useAsyncData(
    () =>
      appointment
        ? appointmentRepository.list({ clientId: appointment.clientId })
        : Promise.resolve([]),
    [appointment?.clientId],
    { enabled: Boolean(appointment) },
  );

  const { data: clientPackages } = useAsyncData(
    () =>
      appointment
        ? clientRepository.listPackages(appointment.clientId)
        : Promise.resolve([]),
    [appointment?.clientId],
    { enabled: Boolean(appointment) },
  );

  const { data: packages } = useAsyncData(
    () => serviceRepository.listPackages(appointment?.unitId),
    [appointment?.unitId],
    { enabled: Boolean(appointment) },
  );

  const { data: contraindications } = useAsyncData(
    () =>
      appointment
        ? engagementRepository.listContraindications(appointment.clientId)
        : Promise.resolve([]),
    [appointment?.clientId],
    { enabled: Boolean(appointment) },
  );

  useEffect(() => {
    setNotes(appointment?.professionalNotes ?? "");
  }, [appointment?.id, appointment?.professionalNotes]);

  const changeStatus = async (status: AppointmentStatus) => {
    if (!appointment) return;
    try {
      await appointmentRepository.changeStatus(appointment.id, status);
      toast.success("Atendimento atualizado.");
      reload();
      onChanged?.();
      if (status === "COMPLETED" && appointment.paymentStatus !== "PAID") {
        setPaymentOpen(true);
      }
    } catch {
      toast.error("Não foi possível atualizar.");
    }
  };

  const saveNotes = async () => {
    if (!appointment) return;
    setSavingNotes(true);
    try {
      await appointmentRepository.update(appointment.id, {
        professionalNotes: notes,
      });
      toast.success("Anotação salva.");
      reload();
    } catch {
      toast.error("Não foi possível salvar a anotação.");
    } finally {
      setSavingNotes(false);
    }
  };

  const previous = (history ?? [])
    .filter(
      (item) => item.id !== appointment?.id && new Date(item.startsAt) < new Date(),
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, 4);

  const activePackage = (clientPackages ?? []).find((item) => {
    const pkg = (packages ?? []).find((entry) => entry.id === item.packageId);
    return pkg && item.sessionsUsed < pkg.totalSessions;
  });
  const activePackageInfo = activePackage
    ? (packages ?? []).find((entry) => entry.id === activePackage.packageId)
    : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92svh] overflow-y-auto rounded-t-2xl sm:max-w-none"
        >
          {loading && !appointment ? (
            <div className="p-4">
              <ListSkeleton rows={3} />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState error={error} onRetry={reload} />
            </div>
          ) : !appointment ? (
            <div className="p-4 text-sm text-muted-foreground">
              Atendimento não encontrado.
            </div>
          ) : (
            <div className="mx-auto w-full max-w-2xl">
              <SheetHeader className="space-y-2 px-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={appointment.status} />
                  <PaymentBadge status={appointment.paymentStatus} />
                </div>
                <SheetTitle className="text-left">
                  {client?.name ?? "Cliente"}
                </SheetTitle>
                <SheetDescription className="text-left">
                  {service?.name} · {formatTime(appointment.startsAt)} às{" "}
                  {formatTime(appointment.endsAt)}
                  {service &&
                    ` · ${formatDuration(service.durationMinutes)} de procedimento`}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 pb-8">
                {/* Ações rápidas */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.filter((action) =>
                    action.from.includes(appointment.status),
                  ).map((action) => (
                    <Button
                      key={action.status}
                      size="sm"
                      variant={action.variant ?? "default"}
                      className="gap-1.5"
                      onClick={() => changeStatus(action.status)}
                    >
                      <action.icon className="size-3.5" aria-hidden />
                      {action.label}
                    </Button>
                  ))}
                  {appointment.paymentStatus !== "PAID" &&
                    appointment.status !== "CANCELLED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setPaymentOpen(true)}
                      >
                        <CreditCard className="size-3.5" aria-hidden />
                        Registrar pagamento
                      </Button>
                    )}
                </div>

                {/* Contraindicações */}
                {((contraindications ?? []).length > 0 ||
                  (client?.healthNotes && client.healthNotes !== "Sem restrições relatadas.")) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" aria-hidden />
                    <AlertTitle>Atenção antes de começar</AlertTitle>
                    <AlertDescription className="space-y-1.5">
                      {client?.healthNotes && <p>{client.healthNotes}</p>}
                      {(contraindications ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(contraindications ?? []).map((item) => (
                            <Badge
                              key={item.id}
                              variant={item.severity === "HIGH" ? "destructive" : "secondary"}
                            >
                              {item.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Dados do cliente */}
                <section className="space-y-1.5">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Cliente
                  </h3>
                  <div className="rounded-xl border border-border bg-card p-3 text-sm">
                    <p className="font-medium">{client?.name}</p>
                    <p className="text-muted-foreground">
                      {client ? formatPhone(client.phone) : "—"}
                    </p>
                    {client && (
                      <p className="pt-1 text-xs text-muted-foreground">
                        {client.metrics.completed} atendimentos ·{" "}
                        {client.metrics.noShows} faltas · ticket médio{" "}
                        {formatCurrency(client.metrics.averageTicket)}
                      </p>
                    )}
                    {client?.notes && (
                      <p className="pt-1.5 text-xs italic">{client.notes}</p>
                    )}
                  </div>
                </section>

                {/* Pacote em andamento */}
                {activePackage && activePackageInfo && (
                  <section className="space-y-1.5">
                    <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      <Package className="size-3" aria-hidden />
                      Pacote em andamento
                    </h3>
                    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {activePackageInfo.name}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {activePackage.sessionsUsed}/{activePackageInfo.totalSessions}
                        </span>
                      </div>
                      <Progress
                        value={
                          (activePackage.sessionsUsed / activePackageInfo.totalSessions) *
                          100
                        }
                        aria-label="Progresso do pacote"
                      />
                    </div>
                  </section>
                )}

                <Separator />

                {/* Histórico */}
                <section className="space-y-1.5">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Últimos atendimentos
                  </h3>
                  {previous.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Primeira vez deste cliente com você.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {previous.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <CalendarClock
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <span className="truncate">
                              {formatDateLong(item.startsAt)}
                            </span>
                          </span>
                          <StatusBadge
                            status={item.status}
                            showIcon={false}
                            className="shrink-0 text-[0.625rem]"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Anotação do atendimento */}
                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Anotação do atendimento
                  </h3>
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Produto usado, reação da pele, o que combinar para a próxima…"
                    aria-label="Anotação do atendimento"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={saveNotes}
                    disabled={savingNotes || notes === (appointment.professionalNotes ?? "")}
                  >
                    <Save className="size-3.5" aria-hidden />
                    Salvar anotação
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Registrado em {formatDate(appointment.startsAt)}. LGPD: no
                    sistema real, anotação clínica é dado sensível e fica cifrada.
                  </p>
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {appointment && (
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          appointment={appointment}
          onSaved={() => {
            reload();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
