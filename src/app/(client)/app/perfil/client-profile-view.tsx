"use client";

import { Bell, Loader2, Mail, Phone, Smartphone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { clientRepository } from "@/data/repositories";
import { useCurrentClient } from "@/hooks/use-current-client";
import { formatCurrency, formatDate, formatPhone, initials } from "@/lib/format";

export function ClientProfileView() {
  const { client, loading, reload } = useCurrentClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    whatsapp: "",
    email: "",
    notifyWhatsapp: true,
    notifyEmail: false,
    notifyPush: false,
  });

  useEffect(() => {
    if (!client) return;
    setForm({
      phone: client.phone,
      whatsapp: client.whatsapp,
      email: client.email,
      notifyWhatsapp: client.notificationPreferences.whatsapp,
      notifyEmail: client.notificationPreferences.email,
      notifyPush: client.notificationPreferences.push,
    });
  }, [client]);

  if (loading && !client) return <ListSkeleton rows={3} />;
  if (!client) return <ErrorState title="Perfil não encontrado" />;

  const save = async () => {
    setSaving(true);
    try {
      await clientRepository.update(client.id, {
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        notificationPreferences: {
          whatsapp: form.notifyWhatsapp,
          email: form.notifyEmail,
          push: form.notifyPush,
        },
      });
      toast.success("Perfil atualizado.");
      reload();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const CHANNELS = [
    { key: "notifyWhatsapp", label: "WhatsApp", icon: Smartphone },
    { key: "notifyEmail", label: "E-mail", icon: Mail },
    { key: "notifyPush", label: "Notificação no app", icon: Bell },
  ] as const;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Seus dados e como você prefere receber os lembretes.
        </p>
      </header>

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-accent text-lg text-accent-foreground">
              {initials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{client.name}</p>
            <p className="text-xs text-muted-foreground">
              Cliente desde {formatDate(client.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {client.metrics.completed} atendimentos ·{" "}
              {formatCurrency(client.metrics.totalSpent)} em serviços
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 py-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <User className="size-4 text-muted-foreground" aria-hidden />
            Dados de contato
          </h2>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">Telefone</Label>
            <Input
              id="profile-phone"
              inputMode="tel"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Exibido como {formatPhone(form.phone)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-whatsapp">WhatsApp</Label>
            <Input
              id="profile-whatsapp"
              inputMode="tel"
              value={form.whatsapp}
              onChange={(event) =>
                setForm((current) => ({ ...current, whatsapp: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>

          <Separator />

          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Phone className="size-4 text-muted-foreground" aria-hidden />
            Como quer receber lembretes
          </h2>

          <ul className="space-y-1">
            {CHANNELS.map((channel) => (
              <li
                key={channel.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <Label
                  htmlFor={channel.key}
                  className="flex items-center gap-2 text-sm font-normal"
                >
                  <channel.icon className="size-4 text-muted-foreground" aria-hidden />
                  {channel.label}
                </Label>
                <Switch
                  id={channel.key}
                  checked={form[channel.key]}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, [channel.key]: checked }))
                  }
                />
              </li>
            ))}
          </ul>

          <Button className="w-full" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Demonstração: os dados são fictícios e ficam apenas neste navegador.
      </p>
    </div>
  );
}
