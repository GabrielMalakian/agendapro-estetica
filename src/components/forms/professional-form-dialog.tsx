"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { professionalRepository, serviceRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { WEEKDAYS, type Professional, type Weekday, type WorkingHours } from "@/types";

const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:mm.");

const schema = z.object({
  name: z.string().min(3, "Informe o nome."),
  specialty: z.string().min(2, "Informe a especialidade."),
  commissionPercent: z.coerce
    .number<number>()
    .min(0, "Mínimo 0%.")
    .max(100, "Máximo 100%."),
  serviceIds: z.array(z.string()),
  active: z.boolean(),
  workingHours: z.array(
    z.object({
      weekday: z.number(),
      enabled: z.boolean(),
      startTime: timeSchema,
      endTime: timeSchema,
      breakStart: z.string(),
      breakEnd: z.string(),
    }),
  ),
});

type FormValues = z.input<typeof schema>;
type ParsedValues = z.output<typeof schema>;

interface ProfessionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  professional?: Professional | null;
  onSaved?: () => void;
}

function defaultGrid(professional?: Professional | null): FormValues["workingHours"] {
  return WEEKDAYS.map((weekday) => {
    const existing = professional?.workingHours.find(
      (item) => item.weekday === weekday,
    );
    return {
      weekday,
      enabled: existing?.enabled ?? (weekday >= 1 && weekday <= 5),
      startTime: existing?.startTime ?? "09:00",
      endTime: existing?.endTime ?? "18:00",
      breakStart: existing?.breakStart ?? "",
      breakEnd: existing?.breakEnd ?? "",
    };
  });
}

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  unitId,
  professional,
  onSaved,
}: ProfessionalFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(professional);

  const { data: services } = useAsyncData(
    () => serviceRepository.list({ unitId, onlyActive: true }),
    [unitId],
    { enabled: open },
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      specialty: "",
      commissionPercent: 40,
      serviceIds: [],
      active: true,
      workingHours: defaultGrid(),
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: professional?.name ?? "",
      specialty: professional?.specialty ?? "",
      commissionPercent: Math.round((professional?.commissionRate ?? 0.4) * 100),
      serviceIds: professional?.serviceIds ?? [],
      active: professional?.active ?? true,
      workingHours: defaultGrid(professional),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, professional?.id]);

  const values = form.watch();

  const onSubmit = form.handleSubmit(async (raw) => {
    const data = raw as unknown as ParsedValues;
    setSaving(true);
    try {
      const workingHours: WorkingHours[] = data.workingHours.map((item) => ({
        weekday: item.weekday as Weekday,
        enabled: item.enabled,
        startTime: item.startTime,
        endTime: item.endTime,
        breakStart: item.breakStart || undefined,
        breakEnd: item.breakEnd || undefined,
      }));

      const payload = {
        unitId,
        userId: professional?.userId ?? "",
        name: data.name,
        avatarUrl: null,
        specialty: data.specialty,
        serviceIds: data.serviceIds,
        workingHours,
        timeOff: professional?.timeOff ?? [],
        commissionRate: Number(data.commissionPercent) / 100,
        active: data.active,
      };

      if (isEditing) {
        await professionalRepository.update(professional!.id, payload);
      } else {
        await professionalRepository.create(payload);
      }

      toast.success(isEditing ? "Profissional atualizado." : "Profissional cadastrado.");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o profissional.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar profissional" : "Novo profissional"}
          </DialogTitle>
          <DialogDescription>
            A grade de horários alimenta diretamente o cálculo de vagas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pro-name">Nome</Label>
              <Input id="pro-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pro-specialty">Especialidade</Label>
              <Input
                id="pro-specialty"
                placeholder="Ex.: barbeiro, esteticista…"
                {...form.register("specialty")}
              />
              {form.formState.errors.specialty && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.specialty.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pro-commission">Comissão (%)</Label>
              <Input
                id="pro-commission"
                type="number"
                min="0"
                max="100"
                step="1"
                inputMode="numeric"
                {...form.register("commissionPercent")}
              />
              {form.formState.errors.commissionPercent && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.commissionPercent.message}
                </p>
              )}
            </div>
            <div className="flex items-end">
              <div className="flex w-full items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="pro-active" className="text-sm">
                  Profissional ativo
                </Label>
                <Switch
                  id="pro-active"
                  checked={values.active}
                  onCheckedChange={(checked) => form.setValue("active", checked)}
                />
              </div>
            </div>
          </div>

          {/* Serviços habilitados */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Serviços que executa</legend>
            <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
              {(services ?? []).map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-2 text-sm font-normal"
                >
                  <Checkbox
                    checked={(values.serviceIds ?? []).includes(service.id)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("serviceIds") ?? [];
                      form.setValue(
                        "serviceIds",
                        checked
                          ? [...current, service.id]
                          : current.filter((id) => id !== service.id),
                      );
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{service.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Grade de horários */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Grade de horários</legend>
            <div className="space-y-1.5 rounded-lg border border-border p-2">
              {values.workingHours.map((day, index) => (
                <div
                  key={day.weekday}
                  className="flex flex-wrap items-center gap-2 rounded-md px-1 py-1"
                >
                  <label className="flex w-32 shrink-0 items-center gap-2 text-sm font-normal">
                    <Checkbox
                      checked={day.enabled}
                      onCheckedChange={(checked) =>
                        form.setValue(
                          `workingHours.${index}.enabled`,
                          Boolean(checked),
                        )
                      }
                      aria-label={`Trabalha ${WEEKDAY_LABELS[day.weekday as Weekday]}`}
                    />
                    {WEEKDAY_LABELS[day.weekday as Weekday]}
                  </label>

                  <Input
                    type="time"
                    className="h-8 w-28"
                    disabled={!day.enabled}
                    aria-label={`Início ${WEEKDAY_LABELS[day.weekday as Weekday]}`}
                    {...form.register(`workingHours.${index}.startTime`)}
                  />
                  <span className="text-xs text-muted-foreground">às</span>
                  <Input
                    type="time"
                    className="h-8 w-28"
                    disabled={!day.enabled}
                    aria-label={`Fim ${WEEKDAY_LABELS[day.weekday as Weekday]}`}
                    {...form.register(`workingHours.${index}.endTime`)}
                  />

                  <span className="text-xs text-muted-foreground">intervalo</span>
                  <Input
                    type="time"
                    className="h-8 w-28"
                    disabled={!day.enabled}
                    aria-label={`Início do intervalo ${WEEKDAY_LABELS[day.weekday as Weekday]}`}
                    {...form.register(`workingHours.${index}.breakStart`)}
                  />
                  <Input
                    type="time"
                    className="h-8 w-28"
                    disabled={!day.enabled}
                    aria-label={`Fim do intervalo ${WEEKDAY_LABELS[day.weekday as Weekday]}`}
                    {...form.register(`workingHours.${index}.breakEnd`)}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
