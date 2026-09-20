"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { appointmentRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatCurrency } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type Appointment,
  type PaymentMethod,
} from "@/types";

const schema = z.object({
  amount: z.coerce
    .number<number>()
    .positive("Informe um valor maior que zero."),
  method: z.enum(PAYMENT_METHODS),
});

type FormValues = z.input<typeof schema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  onSaved?: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  appointment,
  onSaved,
}: PaymentDialogProps) {
  const [saving, setSaving] = useState(false);

  const { data: payments } = useAsyncData(
    () => appointmentRepository.listPayments(appointment.id),
    [appointment.id],
    { enabled: open },
  );

  const alreadyPaid = (payments ?? []).reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const remaining = Math.max(0, appointment.price - alreadyPaid);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: remaining, method: "PIX" },
  });

  useEffect(() => {
    if (open) form.reset({ amount: remaining, method: "PIX" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, remaining]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      await appointmentRepository.registerPayment(appointment.id, {
        amount: Number(values.amount),
        method: values.method as PaymentMethod,
      });
      toast.success("Pagamento registrado.");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            Valor do atendimento: {formatCurrency(appointment.price)}
            {alreadyPaid > 0 && ` · já recebido ${formatCurrency(alreadyPaid)}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor recebido</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Falta receber: {formatCurrency(remaining)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Forma de pagamento</Label>
            <Select
              value={form.watch("method")}
              onValueChange={(value) =>
                form.setValue("method", value as PaymentMethod)
              }
            >
              <SelectTrigger id="method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
