"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { appointmentRepository, companyRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatCurrency } from "@/lib/format";
import { checkCancellation } from "@/lib/scheduling";

interface CancelAppointmentDialogProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

/**
 * Cancelamento pelo cliente, aplicando a política configurada.
 *
 * A política não é decorativa: quando o prazo já passou, a tela diz o valor
 * que pode ser cobrado e oferece reagendar como alternativa — que é o que a
 * configuração da casa manda fazer.
 */
export function CancelAppointmentDialog({
  appointmentId,
  open,
  onOpenChange,
  onCancelled,
}: CancelAppointmentDialogProps) {
  const [saving, setSaving] = useState(false);

  const { data: appointment } = useAsyncData(
    () =>
      appointmentId ? appointmentRepository.get(appointmentId) : Promise.resolve(null),
    [appointmentId],
    { enabled: open && Boolean(appointmentId) },
  );

  const { data: settings } = useAsyncData(
    () => companyRepository.getSettings(),
    [],
    { enabled: open },
  );

  const check =
    appointment && settings
      ? checkCancellation(appointment, settings.cancellationPolicy, new Date())
      : null;

  const confirm = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      await appointmentRepository.changeStatus(appointment.id, "CANCELLED", {
        reason: "Cancelado pelo cliente no app",
      });
      toast.success("Horário cancelado.", {
        description:
          check && !check.withinDeadline
            ? `Fora do prazo — pode haver cobrança de ${formatCurrency(check.feeAmount)}.`
            : "Esperamos você numa próxima!",
      });
      onCancelled?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível cancelar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar este horário?</AlertDialogTitle>
          <AlertDialogDescription>
            {settings?.cancellationPolicy.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {check && !check.withinDeadline && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription className="space-y-2">
              <span className="block">{check.message}</span>
              {settings?.cancellationPolicy.allowRescheduleInstead && appointment && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/app/agendar?reagendar=${appointment.id}`}>
                    Prefiro reagendar (sem cobrança)
                  </Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Manter horário</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              confirm();
            }}
            disabled={saving || check?.allowed === false}
          >
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Confirmar cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
