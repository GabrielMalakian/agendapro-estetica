"use client";

import {
  Bell,
  Clock,
  Inbox,
  Mail,
  MessageCircle,
  RotateCw,
  Save,
  Send,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  appointmentRepository,
  clientRepository,
  engagementRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { formatDateTime, formatDistanceToNow } from "@/lib/format";
import {
  buildTemplateContext,
  extractVariables,
  renderTemplate,
} from "@/lib/format/template";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TEMPLATE_LABELS,
  TEMPLATE_VARIABLES,
  type MessageTemplate,
  type NotificationChannel,
  type NotificationStatus,
} from "@/types";

const CHANNEL_ICONS: Record<NotificationChannel, typeof MessageCircle> = {
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  PUSH: Bell,
};

const STATUS_STYLES: Record<NotificationStatus, string> = {
  SENT: "border-success/30 bg-success/10 text-success",
  SCHEDULED: "border-info/30 bg-info/10 text-info",
  FAILED: "border-destructive/30 bg-destructive/10 text-destructive",
  CANCELLED: "border-border bg-muted text-muted-foreground",
};

export function CommunicationView() {
  const { activeUnitId, activeUnit } = useSession();

  const {
    data: templates,
    loading: loadingTemplates,
    error,
    reload: reloadTemplates,
  } = useAsyncData(
    () =>
      activeUnitId
        ? engagementRepository.listTemplates(activeUnitId)
        : Promise.resolve([]),
    [activeUnitId],
  );

  const {
    data: notifications,
    loading: loadingOutbox,
    reload: reloadOutbox,
  } = useAsyncData(
    () =>
      activeUnitId
        ? engagementRepository.listNotifications({ unitId: activeUnitId })
        : Promise.resolve([]),
    [activeUnitId],
  );

  const { data: clients } = useAsyncData(
    () => (activeUnitId ? clientRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );
  const { data: services } = useAsyncData(
    () => (activeUnitId ? serviceRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );
  const { data: professionals } = useAsyncData(
    () => (activeUnitId ? professionalRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );
  const { data: appointments } = useAsyncData(
    () => (activeUnitId ? appointmentRepository.list({ unitId: activeUnitId }) : Promise.resolve([])),
    [activeUnitId],
  );

  const clientName = new Map((clients ?? []).map((item) => [item.id, item.name]));
  const serviceName = new Map((services ?? []).map((item) => [item.id, item.name]));
  const professionalName = new Map(
    (professionals ?? []).map((item) => [item.id, item.name]),
  );
  const appointmentById = new Map((appointments ?? []).map((item) => [item.id, item]));
  const templateByKey = new Map((templates ?? []).map((item) => [item.key, item]));

  /** Renderiza a mensagem real de uma notificação da caixa de saída. */
  const renderNotification = (notificationId: string): string => {
    const notification = (notifications ?? []).find((item) => item.id === notificationId);
    if (!notification) return "";
    const template = templateByKey.get(notification.template);
    if (!template) return "";
    const appointment = notification.appointmentId
      ? appointmentById.get(notification.appointmentId)
      : undefined;
    return renderTemplate(
      template.body,
      buildTemplateContext({
        clientName: clientName.get(notification.recipientId),
        serviceName: appointment ? serviceName.get(appointment.serviceId) : undefined,
        professionalName: appointment
          ? professionalName.get(appointment.professionalId)
          : undefined,
        unitName: activeUnit?.name,
        appointment,
      }),
    );
  };

  const outbox = notifications ?? [];
  const scheduled = outbox.filter((item) => item.status === "SCHEDULED");

  if (error) return <ErrorState error={error} onRetry={reloadTemplates} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Comunicação"
        description="Régua de lembretes, templates de mensagem e a caixa de saída."
      />

      <Alert>
        <Send className="size-4" aria-hidden />
        <AlertDescription>
          Nenhuma mensagem sai daqui: o envio é simulado. No sistema real, esta
          tela dispara para a API do WhatsApp Business e o agendamento dos
          lembretes vira uma fila (BullMQ) no backend.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="regua">
        <TabsList className="flex-wrap">
          <TabsTrigger value="regua">Régua de lembretes</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="caixa">
            Caixa de saída ({scheduled.length} agendadas)
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------- Régua ------------------------- */}
        <TabsContent value="regua" className="mt-4 space-y-3">
          {loadingTemplates && !templates ? (
            <ListSkeleton rows={3} />
          ) : (
            <ul className="space-y-2">
              {(templates ?? [])
                .filter((item) => item.offsetHours !== null)
                .sort((a, b) => (b.offsetHours ?? 0) - (a.offsetHours ?? 0))
                .map((template) => (
                  <li key={template.id}>
                    <ReminderRow template={template} onSaved={reloadTemplates} />
                  </li>
                ))}
            </ul>
          )}
        </TabsContent>

        {/* ----------------------------- Templates ----------------------- */}
        <TabsContent value="templates" className="mt-4 space-y-3">
          {loadingTemplates && !templates ? (
            <ListSkeleton rows={4} />
          ) : (
            <ul className="space-y-3">
              {(templates ?? []).map((template) => (
                <li key={template.id}>
                  <TemplateEditor
                    template={template}
                    unitName={activeUnit?.name ?? "Unidade"}
                    onSaved={reloadTemplates}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* --------------------------- Caixa de saída -------------------- */}
        <TabsContent value="caixa" className="mt-4 space-y-3">
          {loadingOutbox && !notifications ? (
            <ListSkeleton rows={5} />
          ) : outbox.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Caixa de saída vazia"
              description="Os lembretes aparecem aqui assim que houver agendamentos futuros."
            />
          ) : (
            <ul className="space-y-2">
              {outbox.slice(0, 40).map((notification) => {
                const Icon = CHANNEL_ICONS[notification.channel];
                const body = renderNotification(notification.id);
                return (
                  <li
                    key={notification.id}
                    className="space-y-2 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium">
                        {clientName.get(notification.recipientId) ?? "Cliente"}
                      </span>
                      <Badge variant="outline" className="text-[0.625rem]">
                        {NOTIFICATION_TEMPLATE_LABELS[notification.template]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-[0.625rem]", STATUS_STYLES[notification.status])}
                      >
                        {NOTIFICATION_STATUS_LABELS[notification.status]}
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {notification.status === "SCHEDULED"
                          ? `envia ${formatDistanceToNow(notification.scheduledFor)}`
                          : notification.sentAt
                            ? formatDateTime(notification.sentAt)
                            : formatDateTime(notification.scheduledFor)}
                      </span>
                    </div>

                    {body && (
                      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">{body}</p>
                    )}

                    <div className="flex gap-1">
                      {notification.status !== "SENT" && (
                        <Button
                          size="xs"
                          variant="outline"
                          className="gap-1"
                          onClick={async () => {
                            await engagementRepository.resendNotification(notification.id);
                            toast.success("Envio simulado com sucesso.");
                            reloadOutbox();
                          }}
                        >
                          <RotateCw className="size-3" aria-hidden />
                          {notification.status === "FAILED" ? "Reenviar" : "Enviar agora"}
                        </Button>
                      )}
                      {notification.status === "SCHEDULED" && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="gap-1"
                          onClick={async () => {
                            await engagementRepository.cancelNotification(notification.id);
                            toast.success("Envio cancelado.");
                            reloadOutbox();
                          }}
                        >
                          <X className="size-3" aria-hidden />
                          Cancelar envio
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------------------- linha da régua ---------------------------- */

function ReminderRow({
  template,
  onSaved,
}: {
  template: MessageTemplate;
  onSaved: () => void;
}) {
  const Icon = CHANNEL_ICONS[template.channel];

  const toggle = async (enabled: boolean) => {
    await engagementRepository.updateTemplate(template.id, { enabled });
    toast.success(enabled ? "Lembrete ativado." : "Lembrete desativado.");
    onSaved();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Clock className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {template.offsetHours}h antes do atendimento
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Icon className="size-3 shrink-0" aria-hidden />
          {NOTIFICATION_CHANNEL_LABELS[template.channel]} ·{" "}
          {NOTIFICATION_TEMPLATE_LABELS[template.key]}
        </p>
      </div>
      <Switch
        checked={template.enabled}
        onCheckedChange={toggle}
        aria-label={`Ativar lembrete de ${template.offsetHours} horas`}
      />
    </div>
  );
}

/* ------------------------- editor de template --------------------------- */

function TemplateEditor({
  template,
  unitName,
  onSaved,
}: {
  template: MessageTemplate;
  unitName: string;
  onSaved: () => void;
}) {
  const [body, setBody] = useState(template.body);
  const [saving, setSaving] = useState(false);
  const Icon = CHANNEL_ICONS[template.channel];

  useEffect(() => setBody(template.body), [template.body]);

  const unknown = extractVariables(body).filter(
    (name) => !TEMPLATE_VARIABLES.includes(name as never),
  );

  // Pré-visualização com dados de exemplo — é o que o cliente receberia.
  const preview = renderTemplate(
    body,
    buildTemplateContext({
      clientName: "Mariana Santos",
      professionalName: "Ana Souza",
      serviceName: "Limpeza de pele",
      unitName,
      appointment: {
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        price: 180,
      },
    }),
  );

  const save = async () => {
    setSaving(true);
    try {
      await engagementRepository.updateTemplate(template.id, { body });
      toast.success("Template salvo.");
      onSaved();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-medium">
            {NOTIFICATION_TEMPLATE_LABELS[template.key]}
          </h3>
          <Badge variant="outline" className="text-[0.625rem]">
            {NOTIFICATION_CHANNEL_LABELS[template.channel]}
          </Badge>
          {!template.enabled && (
            <Badge variant="secondary" className="text-[0.625rem]">
              desativado
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`template-${template.id}`} className="sr-only">
            Corpo da mensagem
          </Label>
          <Textarea
            id={`template-${template.id}`}
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_VARIABLES.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => setBody((current) => `${current}{{${variable}}}`)}
                className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {`{{${variable}}}`}
              </button>
            ))}
          </div>
          {unknown.length > 0 && (
            <p className="text-xs text-destructive">
              Variável desconhecida: {unknown.map((name) => `{{${name}}}`).join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Prévia</p>
          <p className="rounded-lg bg-accent/60 px-3 py-2 text-sm">{preview}</p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={save}
          disabled={saving || body === template.body}
        >
          <Save className="size-3.5" aria-hidden />
          Salvar template
        </Button>
      </CardContent>
    </Card>
  );
}
