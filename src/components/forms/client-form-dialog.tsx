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
import { Textarea } from "@/components/ui/textarea";
import { clientRepository } from "@/data/repositories";
import { CLIENT_TAGS, type Client, type ClientTag } from "@/types";

/** Validação de CPF com dígitos verificadores. */
function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

const schema = z.object({
  name: z.string().min(3, "Informe o nome completo."),
  cpf: z
    .string()
    .optional()
    .refine((value) => !value || isValidCpf(value), "CPF inválido."),
  phone: z
    .string()
    .min(10, "Informe o telefone com DDD.")
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone inválido."),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido.").or(z.literal("")),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().max(1000).optional(),
  healthNotes: z.string().max(1000).optional(),
  tags: z.array(z.enum(CLIENT_TAGS)),
  notifyWhatsapp: z.boolean(),
  notifyEmail: z.boolean(),
  notifyPush: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  client?: Client | null;
  onSaved?: (client: Client) => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  unitId,
  client,
  onSaved,
}: ClientFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(client);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      whatsapp: "",
      email: "",
      birthDate: "",
      address: "",
      notes: "",
      healthNotes: "",
      tags: [],
      notifyWhatsapp: true,
      notifyEmail: false,
      notifyPush: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: client?.name ?? "",
      cpf: client?.cpf ?? "",
      phone: client?.phone ?? "",
      whatsapp: client?.whatsapp ?? "",
      email: client?.email ?? "",
      birthDate: client?.birthDate ?? "",
      address: client?.address ?? "",
      notes: client?.notes ?? "",
      healthNotes: client?.healthNotes ?? "",
      tags: client?.tags ?? [],
      notifyWhatsapp: client?.notificationPreferences.whatsapp ?? true,
      notifyEmail: client?.notificationPreferences.email ?? false,
      notifyPush: client?.notificationPreferences.push ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const payload = {
        unitId,
        name: values.name,
        cpf: values.cpf ?? "",
        phone: values.phone,
        whatsapp: values.whatsapp || values.phone,
        email: values.email,
        birthDate: values.birthDate || null,
        address: values.address ?? "",
        notes: values.notes ?? "",
        healthNotes: values.healthNotes ?? "",
        tags: values.tags,
        notificationPreferences: {
          whatsapp: values.notifyWhatsapp,
          email: values.notifyEmail,
          push: values.notifyPush,
        },
      };

      const saved = isEditing
        ? await clientRepository.update(client!.id, payload)
        : await clientRepository.create(payload);

      toast.success(isEditing ? "Cliente atualizado." : "Cliente cadastrado.");
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o cliente.");
    } finally {
      setSaving(false);
    }
  });

  const tags = form.watch("tags");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            Dados de contato e preferências. Tudo fictício nesta demonstração.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" autoComplete="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                inputMode="tel"
                placeholder="41999999999"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                inputMode="tel"
                placeholder="mesmo do telefone"
                {...form.register("whatsapp")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" inputMode="numeric" {...form.register("cpf")} />
              {form.formState.errors.cpf && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.cpf.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Nascimento</Label>
              <Input id="birthDate" type="date" {...form.register("birthDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...form.register("address")} />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Marcadores</legend>
            <div className="flex flex-wrap gap-3">
              {CLIENT_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 text-sm font-normal"
                >
                  <Checkbox
                    checked={tags.includes(tag)}
                    onCheckedChange={(checked) =>
                      form.setValue(
                        "tags",
                        checked
                          ? [...tags, tag]
                          : tags.filter((item: ClientTag) => item !== tag),
                      )
                    }
                  />
                  {tag}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={2} {...form.register("notes")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="healthNotes">Restrições e contraindicações</Label>
            <Textarea id="healthNotes" rows={2} {...form.register("healthNotes")} />
            <p className="text-xs text-muted-foreground">
              Dado sensível pela LGPD. No sistema real este campo é cifrado, tem
              base legal registrada e acesso auditado.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Receber lembretes por</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["notifyWhatsapp", "WhatsApp"],
                  ["notifyEmail", "E-mail"],
                  ["notifyPush", "Push"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={form.watch(field)}
                    onCheckedChange={(checked) => form.setValue(field, Boolean(checked))}
                  />
                  {label}
                </label>
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
