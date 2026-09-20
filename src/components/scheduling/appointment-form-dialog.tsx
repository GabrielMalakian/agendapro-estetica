"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Loader2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  appointmentRepository,
  AppointmentConflictError,
  clientRepository,
  companyRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { formatCurrency, formatDuration, formatTime } from "@/lib/format";
import { toDayKey, type Slot } from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

const schema = z.object({
  clientId: z.string().min(1, "Escolha o cliente."),
  serviceId: z.string().min(1, "Escolha o serviço."),
  professionalId: z.string().min(1, "Escolha o profissional."),
  roomId: z.string().optional(),
  date: z.string().min(1, "Escolha a data."),
  time: z.string().min(1, "Escolha o horário."),
  notes: z.string().max(500, "Máximo de 500 caracteres.").optional(),
  overbooking: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface AppointmentFormDefaults {
  clientId?: string;
  serviceId?: string;
  professionalId?: string;
  startsAt?: Date;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  /** Preenchido ao clicar num slot vazio da grade. */
  defaults?: AppointmentFormDefaults;
  /** Quando presente, o diálogo edita/reagenda em vez de criar. */
  appointment?: Appointment | null;
  onSaved?: (appointment: Appointment) => void;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  unitId,
  defaults,
  appointment,
  onSaved,
}: AppointmentFormDialogProps) {
  const { user } = useSession();
  const isEditing = Boolean(appointment);
  const [saving, setSaving] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: "",
      serviceId: "",
      professionalId: "",
      roomId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "",
      notes: "",
      overbooking: false,
    },
  });

  const { data: clients } = useAsyncData(
    () => clientRepository.list({ unitId }),
    [unitId],
    { enabled: open },
  );
  const { data: services } = useAsyncData(
    () => serviceRepository.list({ unitId, onlyActive: true }),
    [unitId],
    { enabled: open },
  );
  const { data: professionals } = useAsyncData(
    () => professionalRepository.list({ unitId, onlyActive: true }),
    [unitId],
    { enabled: open },
  );
  const { data: rooms } = useAsyncData(
    () => companyRepository.listRooms(unitId),
    [unitId],
    { enabled: open },
  );

  // Semeia o formulário sempre que o diálogo abre.
  useEffect(() => {
    if (!open) return;
    const source = appointment;
    const startsAt = source ? new Date(source.startsAt) : defaults?.startsAt;
    form.reset({
      clientId: source?.clientId ?? defaults?.clientId ?? "",
      serviceId: source?.serviceId ?? defaults?.serviceId ?? "",
      professionalId: source?.professionalId ?? defaults?.professionalId ?? "",
      roomId: source?.roomId ?? "",
      date: format(startsAt ?? new Date(), "yyyy-MM-dd"),
      time: startsAt ? format(startsAt, "HH:mm") : "",
      notes: source?.notes ?? "",
      overbooking: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id, defaults?.startsAt?.toISOString(), defaults?.professionalId]);

  const values = form.watch();
  const service = services?.find((item) => item.id === values.serviceId) ?? null;
  const eligibleProfessionals = useMemo(
    () =>
      (professionals ?? []).filter(
        (pro) => !values.serviceId || pro.serviceIds.includes(values.serviceId),
      ),
    [professionals, values.serviceId],
  );
  const eligibleRooms = useMemo(
    () =>
      (rooms ?? []).filter(
        (room) => !service || service.roomIds.length === 0 || service.roomIds.includes(room.id),
      ),
    [rooms, service],
  );

  const slotsEnabled =
    open && Boolean(values.serviceId && values.professionalId && values.date);

  const { data: slots, loading: slotsLoading } = useAsyncData<Slot[]>(
    () =>
      appointmentRepository.availableSlots({
        date: values.date,
        unitId,
        serviceId: values.serviceId,
        professionalId: values.professionalId,
        excludeAppointmentId: appointment?.id,
        allowOverbooking: values.overbooking,
      }),
    [
      values.date,
      values.serviceId,
      values.professionalId,
      values.overbooking,
      unitId,
      appointment?.id,
    ],
    { enabled: slotsEnabled },
  );

  const freeSlots = (slots ?? []).filter((slot) => slot.available);

  // Se o serviço mudar e o profissional deixar de ser elegível, limpa-o.
  useEffect(() => {
    if (!values.professionalId) return;
    if (eligibleProfessionals.some((pro) => pro.id === values.professionalId)) return;
    form.setValue("professionalId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.serviceId, eligibleProfessionals.length]);

  const handleFirstAvailable = async () => {
    if (!values.serviceId) {
      toast.error("Escolha o serviço antes de buscar o primeiro horário livre.");
      return;
    }
    const result = await appointmentRepository.firstAvailable({
      date: values.date,
      unitId,
      serviceId: values.serviceId,
    });
    if (!result) {
      toast.error("Nenhum profissional tem vaga nesta data.");
      return;
    }
    form.setValue("professionalId", result.professionalId);
    form.setValue("time", formatTime(result.slot.startsAt));
    if (result.slot.roomId) form.setValue("roomId", result.slot.roomId);
    toast.success(`Primeiro horário livre: ${formatTime(result.slot.startsAt)}.`);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    if (!user) return;
    setSaving(true);
    try {
      const startsAt = new Date(`${data.date}T${data.time}:00`);
      const chosenSlot = (slots ?? []).find(
        (slot) => formatTime(slot.startsAt) === data.time,
      );
      const roomId =
        data.roomId || chosenSlot?.roomId || (service?.requiresRoom ? eligibleRooms[0]?.id : undefined);

      const saved = isEditing
        ? await appointmentRepository.update(
            appointment!.id,
            {
              startsAt: startsAt.toISOString(),
              professionalId: data.professionalId,
              serviceId: data.serviceId,
              roomId,
              notes: data.notes ?? "",
            },
            { allowOverbooking: data.overbooking },
          )
        : await appointmentRepository.create({
            unitId,
            clientId: data.clientId,
            professionalId: data.professionalId,
            serviceId: data.serviceId,
            roomId,
            startsAt: startsAt.toISOString(),
            notes: data.notes ?? "",
            createdBy: user.id,
            source: "INTERNAL",
            allowOverbooking: data.overbooking,
          });

      toast.success(
        isEditing ? "Agendamento atualizado." : "Agendamento criado com sucesso.",
      );
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        for (const item of error.errors) {
          if (item.field && item.field in form.getValues()) {
            form.setError(item.field as keyof FormValues, { message: item.message });
          }
        }
        toast.error("Conflito de agenda", {
          description: error.errors.map((item) => item.message).join(" "),
        });
      } else {
        toast.error("Não foi possível salvar o agendamento.");
      }
    } finally {
      setSaving(false);
    }
  });

  const selectedClient = clients?.find((item) => item.id === values.clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar agendamento" : "Novo agendamento"}
          </DialogTitle>
          <DialogDescription>
            Os horários oferecidos já consideram folga, buffer, sala e conflitos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-4" noValidate>
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client-trigger">Cliente</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="client-trigger"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPickerOpen}
                  disabled={isEditing}
                  className="w-full justify-between font-normal"
                >
                  {selectedClient?.name ?? "Buscar cliente…"}
                  <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Nome, telefone ou e-mail…" />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {(clients ?? []).map((client) => (
                        <CommandItem
                          key={client.id}
                          value={`${client.name} ${client.phone} ${client.email}`}
                          onSelect={() => {
                            form.setValue("clientId", client.id, { shouldValidate: true });
                            setClientPickerOpen(false);
                          }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{client.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {client.metrics.noShows > 0
                                ? `${client.metrics.noShows} falta(s) no histórico`
                                : `${client.metrics.completed} atendimentos`}
                            </span>
                          </span>
                          {client.id === values.clientId && (
                            <Check className="size-4 text-primary" aria-hidden />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.clientId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.clientId.message}
              </p>
            )}
            {selectedClient && selectedClient.metrics.noShows >= 3 && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="size-4" aria-hidden />
                <AlertDescription className="text-xs">
                  Cliente com {selectedClient.metrics.noShows} faltas — a política
                  da casa sugere exigir pagamento antecipado.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <Label htmlFor="service">Serviço</Label>
            <Select
              value={values.serviceId}
              onValueChange={(value) =>
                form.setValue("serviceId", value, { shouldValidate: true })
              }
            >
              <SelectTrigger id="service" className="w-full">
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {(services ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {formatDuration(item.durationMinutes)} ·{" "}
                    {formatCurrency(item.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.serviceId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.serviceId.message}
              </p>
            )}
            {service && (
              <p className="text-xs text-muted-foreground">
                Ocupa {formatDuration(service.durationMinutes + service.bufferMinutes)} na
                agenda ({formatDuration(service.durationMinutes)} +{" "}
                {formatDuration(service.bufferMinutes)} de intervalo).
              </p>
            )}
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="professional">Profissional</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="gap-1"
                onClick={handleFirstAvailable}
              >
                <Zap className="size-3" aria-hidden />
                Primeiro disponível
              </Button>
            </div>
            <Select
              value={values.professionalId}
              onValueChange={(value) =>
                form.setValue("professionalId", value, { shouldValidate: true })
              }
            >
              <SelectTrigger id="professional" className="w-full">
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {eligibleProfessionals.map((pro) => (
                  <SelectItem key={pro.id} value={pro.id}>
                    {pro.name} · {pro.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.professionalId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.professionalId.message}
              </p>
            )}
          </div>

          {/* Data */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                min={toDayKey(new Date())}
                {...form.register("date")}
              />
            </div>
            {service?.requiresRoom && (
              <div className="space-y-2">
                <Label htmlFor="room">Sala / equipamento</Label>
                <Select
                  value={values.roomId || undefined}
                  onValueChange={(value) => form.setValue("roomId", value)}
                >
                  <SelectTrigger id="room" className="w-full">
                    <SelectValue placeholder="Atribuir automaticamente" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Horários */}
          <div className="space-y-2">
            <Label>Horário</Label>
            {!slotsEnabled ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                Escolha serviço, profissional e data para ver os horários livres.
              </p>
            ) : slotsLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-6 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Calculando horários disponíveis…
              </div>
            ) : freeSlots.length === 0 ? (
              <Alert className="py-2">
                <CalendarDays className="size-4" aria-hidden />
                <AlertTitle className="text-sm">Sem vaga nesta data</AlertTitle>
                <AlertDescription className="text-xs">
                  Tente outro dia, outro profissional ou ligue o encaixe abaixo.
                </AlertDescription>
              </Alert>
            ) : (
              <div
                className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-2"
                role="radiogroup"
                aria-label="Horários disponíveis"
              >
                {freeSlots.map((slot) => {
                  const time = formatTime(slot.startsAt);
                  const active = values.time === time;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        form.setValue("time", time, { shouldValidate: true });
                        if (slot.roomId) form.setValue("roomId", slot.roomId);
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs tabular-nums transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent",
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
            {form.formState.errors.time && (
              <p className="text-xs text-destructive">
                {form.formState.errors.time.message}
              </p>
            )}
          </div>

          {/* Encaixe */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="overbooking" className="text-sm">
                Encaixe
              </Label>
              <p className="text-xs text-muted-foreground">
                Ignora expediente, folga e antecedência. Conflito de profissional,
                sala e cliente continua bloqueado.
              </p>
            </div>
            <Switch
              id="overbooking"
              checked={values.overbooking}
              onCheckedChange={(checked) => form.setValue("overbooking", checked)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Ex.: cliente pediu para avisar 30 minutos antes."
              {...form.register("notes")}
            />
          </div>

          {service && (
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Valor</span>
              <Badge variant="secondary" className="text-sm">
                {formatCurrency(service.price)}
              </Badge>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isEditing ? "Salvar alterações" : "Criar agendamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
