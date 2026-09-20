"use client";

import {
  Ban,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  CreditCard,
  MapPin,
  MessageSquare,
  Pencil,
  PlayCircle,
  Scissors,
  Trash2,
  UserRound,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/common/states";
import {
  PaymentBadge,
  StatusBadge,
} from "@/components/scheduling/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  appointmentRepository,
  clientRepository,
  companyRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  formatCurrency,
  formatDateLong,
  formatDuration,
  formatPhone,
  formatTime,
} from "@/lib/format";
import { checkCancellation } from "@/lib/scheduling";
import type { Appointment, AppointmentStatus } from "@/types";

import { PaymentDialog } from "./payment-dialog";

interface AppointmentDetailSheetProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (appointment: Appointment) => void;
  /** Esconde ações que o profissional não deve ver (ex.: excluir). */
  variant?: "ADMIN" | "PROFESSIONAL";
}

const NEXT_ACTIONS: {
  status: AppointmentStatus;
  label: string;
  icon: typeof CircleCheck;
  from: AppointmentStatus[];
}[] = [
  {
    status: "CONFIRMED",
    label: "Confirmar",
    icon: CircleCheck,
    from: ["SCHEDULED"],
  },
  {
    status: "IN_PROGRESS",
    label: "Iniciar atendimento",
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
  },
];

export function AppointmentDetailSheet({
  appointmentId,
  open,
  onOpenChange,
  onEdit,
  variant = "ADMIN",
}: AppointmentDetailSheetProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const {
    data: appointment,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      appointmentId
        ? appointmentRepository.get(appointmentId)
        : Promise.resolve(null),
    [appointmentId],
    { enabled: open && Boolean(appointmentId) },
  );

  const { data: client } = useAsyncData(
    () =>
      appointment
        ? clientRepository.get(appointment.clientId)
        : Promise.resolve(null),
    [appointment?.clientId],
    { enabled: Boolean(appointment) },
  );

  const { data: service } = useAsyncData(
    () =>
      appointment
        ? serviceRepository.get(appointment.serviceId)
        : Promise.resolve(null),
    [appointment?.serviceId],
    { enabled: Boolean(appointment) },
  );

  const { data: professional } = useAsyncData(
    () =>
      appointment
        ? professionalRepository.get(appointment.professionalId)
        : Promise.resolve(null),
    [appointment?.professionalId],
    { enabled: Boolean(appointment) },
  );

  const { data: rooms } = useAsyncData(
    () => companyRepository.listRooms(appointment?.unitId),
    [appointment?.unitId],
    { enabled: Boolean(appointment?.roomId) },
  );

  const { data: history } = useAsyncData(
    () =>
      appointment
        ? appointmentRepository.list({ clientId: appointment.clientId })
        : Promise.resolve([]),
    [appointment?.clientId],
    { enabled: Boolean(appointment) },
  );

  const { data: settings } = useAsyncData(
    () => companyRepository.getSettings(),
    [],
    { enabled: open },
  );

  const room = rooms?.find((item) => item.id === appointment?.roomId);
  const previous = (history ?? [])
    .filter(
      (item) =>
        item.id !== appointment?.id && new Date(item.startsAt) < new Date(),
    )
    .slice(-4)
    .reverse();

  const cancellation =
    appointment && settings
      ? checkCancellation(appointment, settings.cancellationPolicy, new Date())
      : null;

  const changeStatus = async (status: AppointmentStatus) => {
    if (!appointment) return;
    try {
      await appointmentRepository.changeStatus(appointment.id, status);
      toast.success("Status atualizado.");
      reload();
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const cancel = async () => {
    if (!appointment) return;
    try {
      await appointmentRepository.changeStatus(appointment.id, "CANCELLED", {
        reason: "Cancelado pela recepção",
      });
      toast.success("Atendimento cancelado.", {
        description:
          cancellation && !cancellation.withinDeadline
            ? `Fora do prazo — taxa prevista de ${formatCurrency(cancellation.feeAmount)}.`
            : undefined,
      });
      setCancelOpen(false);
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível cancelar.");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {loading && !appointment ? (
            <div className="p-6">
              <ListSkeleton rows={4} />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState error={error} onRetry={reload} />
            </div>
          ) : !appointment ? (
            <div className="p-6 text-sm text-muted-foreground">
              Atendimento não encontrado.
            </div>
          ) : (
            <>
              <SheetHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={appointment.status} />
                  <PaymentBadge status={appointment.paymentStatus} />
                  {appointment.source === "ONLINE" && (
                    <Badge variant="outline">Agendado online</Badge>
                  )}
                </div>
                <SheetTitle className="text-left">
                  {service?.name ?? "Atendimento"}
                </SheetTitle>
                <SheetDescription className="text-left">
                  {formatDateLong(appointment.startsAt)} ·{" "}
                  {formatTime(appointment.startsAt)} às{" "}
                  {formatTime(appointment.endsAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-6">
                {/* Ficha rápida */}
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2.5">
                    <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <dt className="sr-only">Cliente</dt>
                      <dd className="font-medium">
                        {client ? (
                          <Link
                            href={`/admin/clientes/${client.id}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {client.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </dd>
                      {client && (
                        <dd className="text-xs text-muted-foreground">
                          {formatPhone(client.phone)} ·{" "}
                          {client.metrics.completed} atendimentos ·{" "}
                          {client.metrics.noShows} faltas
                        </dd>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Scissors className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="sr-only">Serviço</dt>
                      <dd>{service?.name ?? "—"}</dd>
                      {service && (
                        <dd className="text-xs text-muted-foreground">
                          {formatDuration(service.durationMinutes)} +{" "}
                          {formatDuration(service.bufferMinutes)} de intervalo ·{" "}
                          {formatCurrency(appointment.price)}
                        </dd>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="sr-only">Profissional e sala</dt>
                      <dd>{professional?.name ?? "—"}</dd>
                      {room && (
                        <dd className="text-xs text-muted-foreground">{room.name}</dd>
                      )}
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="flex items-start gap-2.5">
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <dd className="text-sm">{appointment.notes}</dd>
                    </div>
                  )}
                </dl>

                <Separator />

                {/* Ações */}
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Ações
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_ACTIONS.filter((action) =>
                      action.from.includes(appointment.status),
                    ).map((action) => (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={action.status === "NO_SHOW" ? "outline" : "default"}
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

                    {onEdit &&
                      appointment.status !== "COMPLETED" &&
                      appointment.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => onEdit(appointment)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Reagendar
                        </Button>
                      )}

                    {cancellation?.allowed && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => setCancelOpen(true)}
                      >
                        <Ban className="size-3.5" aria-hidden />
                        Cancelar
                      </Button>
                    )}
                  </div>

                  {cancellation && !cancellation.withinDeadline && cancellation.allowed && (
                    <p className="text-xs text-warning-foreground dark:text-warning">
                      {cancellation.message}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Histórico */}
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Últimos atendimentos deste cliente
                  </p>
                  {previous.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Primeiro atendimento com a casa.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {previous.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
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
                </div>

                {variant === "ADMIN" && appointment.professionalNotes && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Anotação do profissional
                      </p>
                      <p className="rounded-lg bg-muted/60 p-3 text-sm">
                        {appointment.professionalNotes}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {appointment && (
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          appointment={appointment}
          onSaved={reload}
        />
      )}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellation?.message ??
                "O horário voltará a ficar disponível na agenda."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={cancel} className="gap-1.5">
              <Trash2 className="size-3.5" aria-hidden />
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
