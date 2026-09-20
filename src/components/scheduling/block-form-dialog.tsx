"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appointmentRepository, professionalRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";

const ALL_PROFESSIONALS = "__all__";

const schema = z
  .object({
    professionalId: z.string(),
    date: z.string().min(1, "Informe a data."),
    startTime: z.string().min(1, "Informe o início."),
    endTime: z.string().min(1, "Informe o fim."),
    reason: z.string().min(2, "Descreva o motivo do bloqueio."),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: "O fim precisa ser depois do início.",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof schema>;

interface BlockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  /** Trava o bloqueio em um profissional (usado na área do profissional). */
  lockedProfessionalId?: string;
  defaultDate?: Date;
  onSaved?: () => void;
}

export function BlockFormDialog({
  open,
  onOpenChange,
  unitId,
  lockedProfessionalId,
  defaultDate,
  onSaved,
}: BlockFormDialogProps) {
  const [saving, setSaving] = useState(false);

  const { data: professionals } = useAsyncData(
    () => professionalRepository.list({ unitId, onlyActive: true }),
    [unitId],
    { enabled: open && !lockedProfessionalId },
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      professionalId: lockedProfessionalId ?? ALL_PROFESSIONALS,
      date: format(defaultDate ?? new Date(), "yyyy-MM-dd"),
      startTime: "12:00",
      endTime: "13:00",
      reason: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      professionalId: lockedProfessionalId ?? ALL_PROFESSIONALS,
      date: format(defaultDate ?? new Date(), "yyyy-MM-dd"),
      startTime: "12:00",
      endTime: "13:00",
      reason: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lockedProfessionalId, defaultDate?.toISOString()]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      await appointmentRepository.createBlock({
        unitId,
        professionalId:
          values.professionalId === ALL_PROFESSIONALS ? null : values.professionalId,
        startsAt: new Date(`${values.date}T${values.startTime}:00`).toISOString(),
        endsAt: new Date(`${values.date}T${values.endTime}:00`).toISOString(),
        reason: values.reason,
      });
      toast.success("Horário bloqueado.");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível bloquear o horário.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
          <DialogDescription>
            O período fica indisponível para novos agendamentos, mas atendimentos
            já marcados continuam onde estão.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {!lockedProfessionalId && (
            <div className="space-y-2">
              <Label htmlFor="block-professional">Profissional</Label>
              <Select
                value={form.watch("professionalId")}
                onValueChange={(value) => form.setValue("professionalId", value)}
              >
                <SelectTrigger id="block-professional" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROFESSIONALS}>
                    Toda a unidade
                  </SelectItem>
                  {(professionals ?? []).map((pro) => (
                    <SelectItem key={pro.id} value={pro.id}>
                      {pro.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="block-date">Data</Label>
            <Input id="block-date" type="date" {...form.register("date")} />
            {form.formState.errors.date && (
              <p className="text-xs text-destructive">
                {form.formState.errors.date.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="block-start">Início</Label>
              <Input id="block-start" type="time" {...form.register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-end">Fim</Label>
              <Input id="block-end" type="time" {...form.register("endTime")} />
              {form.formState.errors.endTime && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-reason">Motivo</Label>
            <Input
              id="block-reason"
              placeholder="Ex.: reunião de equipe, manutenção do laser…"
              {...form.register("reason")}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Bloquear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
