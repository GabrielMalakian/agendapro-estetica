"use client";

import {
  Building2,
  CalendarOff,
  Check,
  Loader2,
  Palette,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserX,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { companyRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import { formatDate } from "@/lib/format";
import { applyBrandColor } from "@/lib/theme/apply-brand";
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCE_LABELS,
  PERMISSION_RESOURCES,
  ROLE_LABELS,
  ROLES,
  SEGMENT_LABELS,
  SEGMENTS,
  type NoShowPolicy,
  type PermissionMatrix,
  type Segment,
  type Settings,
  type Weekday,
} from "@/types";

const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

const NO_SHOW_ACTIONS: Record<NoShowPolicy["action"], string> = {
  REQUIRE_DEPOSIT: "Exigir pagamento antecipado",
  BLOCK_ONLINE_BOOKING: "Bloquear agendamento online",
  WARN_ONLY: "Apenas avisar a recepção",
};

/** Cores sugeridas — a marca é configurável, mas com um ponto de partida. */
const COLOR_PRESETS = [
  { hex: "#1f6f7a", name: "Petróleo" },
  { hex: "#7c3f5d", name: "Vinho" },
  { hex: "#2f5f3f", name: "Verde mata" },
  { hex: "#3d4b8c", name: "Índigo" },
  { hex: "#8a5a2b", name: "Caramelo" },
  { hex: "#2b2b2b", name: "Grafite" },
];

export function SettingsView() {
  const { activeUnitId, units } = useSession();

  const {
    data: settings,
    loading,
    error,
    reload,
  } = useAsyncData(() => companyRepository.getSettings(), []);

  const { data: company, reload: reloadCompany } = useAsyncData(
    () => companyRepository.getCompany(),
    [],
  );

  const { data: holidays, reload: reloadHolidays } = useAsyncData(
    () => (activeUnitId ? companyRepository.listHolidays(activeUnitId) : Promise.resolve([])),
    [activeUnitId],
  );

  const [draft, setDraft] = useState<Settings | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [segment, setSegment] = useState<Segment>("SALON");
  const [saving, setSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!company) return;
    setCompanyName(company.name);
    setSegment(company.segment);
  }, [company]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !draft) return <ListSkeleton rows={5} />;
  if (!draft) return null;

  const patch = (changes: Partial<Settings>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      await companyRepository.updateSettings(draft);
      if (company) {
        await companyRepository.updateCompany(company.id, {
          name: companyName,
          segment,
        });
        reloadCompany();
      }
      toast.success("Configurações salvas.");
      reload();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (
    role: (typeof ROLES)[number],
    resource: (typeof PERMISSION_RESOURCES)[number],
    action: (typeof PERMISSION_ACTIONS)[number],
    enabled: boolean,
  ) => {
    const permissions: PermissionMatrix = {
      ...draft.permissions,
      [role]: {
        ...draft.permissions[role],
        [resource]: enabled
          ? [...new Set([...draft.permissions[role][resource], action])]
          : draft.permissions[role][resource].filter((item) => item !== action),
      },
    };
    patch({ permissions });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurações"
        description="Empresa, unidades, políticas, permissões e aparência."
        actions={
          <Button className="gap-1.5" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            Salvar alterações
          </Button>
        }
      />

      <Tabs defaultValue="empresa">
        <TabsList className="flex-wrap">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="politicas">Políticas</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
        </TabsList>

        {/* ----------------------------- Empresa ------------------------- */}
        <TabsContent value="empresa" className="mt-4 space-y-4">
          <Card>
            <CardContent className="space-y-4 py-5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="size-4 text-muted-foreground" aria-hidden />
                Dados da empresa
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-segment">Segmento principal</Label>
                  <Select
                    value={segment}
                    onValueChange={(value) => setSegment(value as Segment)}
                  >
                    <SelectTrigger id="company-segment" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {SEGMENT_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {company && (
                <p className="text-xs text-muted-foreground">
                  Página pública:{" "}
                  <code className="rounded bg-muted px-1 py-0.5">/{company.slug}</code>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Unidades e horários */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium">Unidades e horário de funcionamento</h2>
            {units.map((unit) => (
              <Card key={unit.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{unit.name}</p>
                    {unit.id === activeUnitId && (
                      <Badge variant="secondary" className="text-[0.625rem]">
                        unidade ativa
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{unit.address}</p>
                  <ul className="grid gap-1 text-xs sm:grid-cols-2">
                    {unit.businessHours.map((hours) => (
                      <li
                        key={hours.weekday}
                        className="flex justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 tabular-nums"
                      >
                        <span className="text-muted-foreground">
                          {WEEKDAY_LABELS[hours.weekday]}
                        </span>
                        <span>
                          {hours.closed
                            ? "Fechado"
                            : `${hours.openTime}–${hours.closeTime}${
                                hours.breakStart
                                  ? ` (intervalo ${hours.breakStart}–${hours.breakEnd})`
                                  : ""
                              }`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feriados */}
          <Card>
            <CardContent className="space-y-3 py-4">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <CalendarOff className="size-4 text-muted-foreground" aria-hidden />
                Feriados e fechamentos
              </h2>

              <ul className="space-y-1.5">
                {(holidays ?? [])
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((holiday) => (
                    <li
                      key={holiday.id}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="tabular-nums">{formatDate(holiday.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {holiday.name}
                      </span>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Remover ${holiday.name}`}
                        onClick={async () => {
                          await companyRepository.deleteHoliday(holiday.id);
                          toast.success("Feriado removido.");
                          reloadHolidays();
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </li>
                  ))}
              </ul>

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-date" className="text-xs">
                    Data
                  </Label>
                  <Input
                    id="holiday-date"
                    type="date"
                    className="w-44"
                    value={newHoliday.date}
                    onChange={(event) =>
                      setNewHoliday((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </div>
                <div className="min-w-40 flex-1 space-y-1.5">
                  <Label htmlFor="holiday-name" className="text-xs">
                    Motivo
                  </Label>
                  <Input
                    id="holiday-name"
                    placeholder="Ex.: feriado municipal"
                    value={newHoliday.name}
                    onChange={(event) =>
                      setNewHoliday((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={!newHoliday.date || !newHoliday.name || !activeUnitId}
                  onClick={async () => {
                    if (!activeUnitId) return;
                    await companyRepository.createHoliday({
                      unitId: activeUnitId,
                      date: newHoliday.date,
                      name: newHoliday.name,
                    });
                    toast.success("Feriado adicionado — a agenda já não oferece vagas nesse dia.");
                    setNewHoliday({ date: "", name: "" });
                    reloadHolidays();
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- Políticas ------------------------ */}
        <TabsContent value="politicas" className="mt-4 space-y-4">
          {/* Cancelamento */}
          <Card>
            <CardContent className="space-y-4 py-5">
              <h2 className="text-sm font-medium">Política de cancelamento</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cancel-hours">Antecedência mínima (horas)</Label>
                  <Input
                    id="cancel-hours"
                    type="number"
                    min="0"
                    value={draft.cancellationPolicy.minHoursBefore}
                    onChange={(event) =>
                      patch({
                        cancellationPolicy: {
                          ...draft.cancellationPolicy,
                          minHoursBefore: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancel-fee">Multa fora do prazo (%)</Label>
                  <Input
                    id="cancel-fee"
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(draft.cancellationPolicy.lateFeeRate * 100)}
                    onChange={(event) =>
                      patch({
                        cancellationPolicy: {
                          ...draft.cancellationPolicy,
                          lateFeeRate: Number(event.target.value) / 100,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="allow-reschedule" className="text-sm font-normal">
                  Oferecer reagendar em vez de cobrar
                </Label>
                <Switch
                  id="allow-reschedule"
                  checked={draft.cancellationPolicy.allowRescheduleInstead}
                  onCheckedChange={(checked) =>
                    patch({
                      cancellationPolicy: {
                        ...draft.cancellationPolicy,
                        allowRescheduleInstead: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-description">Texto exibido ao cliente</Label>
                <Textarea
                  id="cancel-description"
                  rows={2}
                  value={draft.cancellationPolicy.description}
                  onChange={(event) =>
                    patch({
                      cancellationPolicy: {
                        ...draft.cancellationPolicy,
                        description: event.target.value,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Sinal */}
          <Card>
            <CardContent className="space-y-4 py-5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="size-4 text-muted-foreground" aria-hidden />
                Política de sinal
              </h2>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="deposit-enabled" className="text-sm font-normal">
                  Cobrar sinal no agendamento online
                </Label>
                <Switch
                  id="deposit-enabled"
                  checked={draft.depositPolicy.enabled}
                  onCheckedChange={(checked) =>
                    patch({ depositPolicy: { ...draft.depositPolicy, enabled: checked } })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deposit-rate">Percentual do serviço (%)</Label>
                  <Input
                    id="deposit-rate"
                    type="number"
                    min="0"
                    max="100"
                    disabled={!draft.depositPolicy.enabled}
                    value={Math.round(draft.depositPolicy.rate * 100)}
                    onChange={(event) =>
                      patch({
                        depositPolicy: {
                          ...draft.depositPolicy,
                          rate: Number(event.target.value) / 100,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit-min">Só acima de (R$)</Label>
                  <Input
                    id="deposit-min"
                    type="number"
                    min="0"
                    disabled={!draft.depositPolicy.enabled}
                    value={draft.depositPolicy.minServicePrice}
                    onChange={(event) =>
                      patch({
                        depositPolicy: {
                          ...draft.depositPolicy,
                          minServicePrice: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="deposit-risk" className="text-sm font-normal">
                  Exigir sinal de quem já faltou
                </Label>
                <Switch
                  id="deposit-risk"
                  disabled={!draft.depositPolicy.enabled}
                  checked={draft.depositPolicy.requireForNoShowRisk}
                  onCheckedChange={(checked) =>
                    patch({
                      depositPolicy: {
                        ...draft.depositPolicy,
                        requireForNoShowRisk: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* No-show */}
          <Card>
            <CardContent className="space-y-4 py-5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <UserX className="size-4 text-muted-foreground" aria-hidden />
                Regra de no-show
              </h2>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="noshow-enabled" className="text-sm font-normal">
                  Aplicar regra automaticamente
                </Label>
                <Switch
                  id="noshow-enabled"
                  checked={draft.noShowPolicy.enabled}
                  onCheckedChange={(checked) =>
                    patch({ noShowPolicy: { ...draft.noShowPolicy, enabled: checked } })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="noshow-max">Faltas</Label>
                  <Input
                    id="noshow-max"
                    type="number"
                    min="1"
                    disabled={!draft.noShowPolicy.enabled}
                    value={draft.noShowPolicy.maxNoShows}
                    onChange={(event) =>
                      patch({
                        noShowPolicy: {
                          ...draft.noShowPolicy,
                          maxNoShows: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="noshow-window">Em (dias)</Label>
                  <Input
                    id="noshow-window"
                    type="number"
                    min="1"
                    disabled={!draft.noShowPolicy.enabled}
                    value={draft.noShowPolicy.windowDays}
                    onChange={(event) =>
                      patch({
                        noShowPolicy: {
                          ...draft.noShowPolicy,
                          windowDays: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="noshow-action">Consequência</Label>
                  <Select
                    value={draft.noShowPolicy.action}
                    onValueChange={(value) =>
                      patch({
                        noShowPolicy: {
                          ...draft.noShowPolicy,
                          action: value as NoShowPolicy["action"],
                        },
                      })
                    }
                  >
                    <SelectTrigger id="noshow-action" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(NO_SHOW_ACTIONS) as NoShowPolicy["action"][]).map(
                        (action) => (
                          <SelectItem key={action} value={action}>
                            {NO_SHOW_ACTIONS[action]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Hoje: {draft.noShowPolicy.maxNoShows} faltas em{" "}
                {draft.noShowPolicy.windowDays} dias →{" "}
                {NO_SHOW_ACTIONS[draft.noShowPolicy.action].toLowerCase()}.
              </p>
            </CardContent>
          </Card>

          {/* Regras de agendamento */}
          <Card>
            <CardContent className="space-y-4 py-5">
              <h2 className="text-sm font-medium">Regras de agendamento</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="min-advance">Antecedência mínima (min)</Label>
                  <Input
                    id="min-advance"
                    type="number"
                    min="0"
                    step="15"
                    value={draft.bookingRules.minAdvanceMinutes}
                    onChange={(event) =>
                      patch({
                        bookingRules: {
                          ...draft.bookingRules,
                          minAdvanceMinutes: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-advance">Janela máxima (dias)</Label>
                  <Input
                    id="max-advance"
                    type="number"
                    min="1"
                    value={draft.bookingRules.maxAdvanceDays}
                    onChange={(event) =>
                      patch({
                        bookingRules: {
                          ...draft.bookingRules,
                          maxAdvanceDays: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slot-interval">Grade de horários (min)</Label>
                  <Select
                    value={String(draft.bookingRules.slotIntervalMinutes)}
                    onValueChange={(value) =>
                      patch({
                        bookingRules: {
                          ...draft.bookingRules,
                          slotIntervalMinutes: Number(value),
                        },
                      })
                    }
                  >
                    <SelectTrigger id="slot-interval" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 15, 20, 30, 60].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value} minutos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Estes três valores alimentam diretamente o motor que calcula as
                vagas oferecidas ao cliente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- Permissões ----------------------- */}
        <TabsContent value="permissoes" className="mt-4 space-y-3">
          <Alert>
            <ShieldCheck className="size-4" aria-hidden />
            <AlertDescription>
              Esta matriz controla o que cada papel vê na interface. Na versão
              com backend, as mesmas regras são aplicadas nos endpoints do
              NestJS — esconder um botão não protege o dado.
            </AlertDescription>
          </Alert>

          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Matriz de permissões por papel e recurso
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium">
                    Recurso
                  </th>
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      scope="col"
                      colSpan={2}
                      className="border-l border-border px-3 py-2.5 text-center text-xs font-medium"
                    >
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <th scope="col" className="px-3 py-1.5" />
                  {ROLES.flatMap((role) =>
                    PERMISSION_ACTIONS.map((action) => (
                      <th
                        key={`${role}-${action}`}
                        scope="col"
                        className="px-3 py-1.5 text-center text-[0.625rem] font-normal text-muted-foreground"
                      >
                        {action === "read" ? "ver" : "editar"}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_RESOURCES.map((resource) => (
                  <tr key={resource} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      {PERMISSION_RESOURCE_LABELS[resource]}
                    </th>
                    {ROLES.flatMap((role) =>
                      PERMISSION_ACTIONS.map((action) => {
                        const checked = draft.permissions[role][resource].includes(action);
                        return (
                          <td key={`${role}-${resource}-${action}`} className="px-3 py-2 text-center">
                            <Checkbox
                              checked={checked}
                              aria-label={`${ROLE_LABELS[role]} pode ${action === "read" ? "ver" : "editar"} ${PERMISSION_RESOURCE_LABELS[resource]}`}
                              disabled={role === "ADMIN"}
                              onCheckedChange={(value) =>
                                togglePermission(role, resource, action, Boolean(value))
                              }
                            />
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            O papel Administrador não pode ser restringido nesta demonstração.
          </p>
        </TabsContent>

        {/* ---------------------------- Aparência ------------------------ */}
        <TabsContent value="aparencia" className="mt-4 space-y-4">
          <Card>
            <CardContent className="space-y-4 py-5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Palette className="size-4 text-muted-foreground" aria-hidden />
                Cor primária
              </h2>

              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const selected = draft.appearance.primaryColor === preset.hex;
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Cor ${preset.name}`}
                      onClick={() => {
                        patch({
                          appearance: { ...draft.appearance, primaryColor: preset.hex },
                        });
                        // Aplica na hora, para a escolha ser visível de imediato.
                        applyBrandColor(preset.hex);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40"
                    >
                      <span
                        className="size-5 rounded-full border border-black/10"
                        style={{ background: preset.hex }}
                        aria-hidden
                      />
                      {preset.name}
                      {selected && <Check className="size-3.5 text-primary" aria-hidden />}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="custom-color">Cor personalizada</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-color"
                      type="color"
                      className="h-9 w-16 p-1"
                      value={draft.appearance.primaryColor}
                      onChange={(event) => {
                        patch({
                          appearance: {
                            ...draft.appearance,
                            primaryColor: event.target.value,
                          },
                        });
                        applyBrandColor(event.target.value);
                      }}
                    />
                    <Input
                      value={draft.appearance.primaryColor}
                      onChange={(event) =>
                        patch({
                          appearance: {
                            ...draft.appearance,
                            primaryColor: event.target.value,
                          },
                        })
                      }
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name">Nome exibido</Label>
                  <Input
                    id="display-name"
                    value={draft.appearance.displayName}
                    onChange={(event) =>
                      patch({
                        appearance: {
                          ...draft.appearance,
                          displayName: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Prévia</p>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                  <Button size="sm">Botão primário</Button>
                  <Button size="sm" variant="outline">
                    Secundário
                  </Button>
                  <Badge>Etiqueta</Badge>
                  <span className="text-sm text-primary">Texto em destaque</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Guardamos só o matiz e o croma da cor escolhida: a
                luminosidade continua definida por tema, então a mesma escolha
                fica legível no claro e no escuro.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- Módulos ------------------------- */}
        <TabsContent value="modulos" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            O núcleo é o mesmo para todos; cada módulo liga blocos extras na
            interface — pacotes e ficha de evolução na estética, plano de
            tratamento e orçamento na odontologia, e assim por diante.
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {SEGMENTS.map((item) => {
              const enabled = draft.enabledSegmentModules.includes(item);
              const isMain = item === segment;
              return (
                <li key={item}>
                  <Card>
                    <CardContent className="flex items-start justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {SEGMENT_LABELS[item]}
                          {isMain && (
                            <Badge variant="secondary" className="text-[0.625rem]">
                              segmento principal
                            </Badge>
                          )}
                        </p>
                        <p className="pt-0.5 text-xs text-muted-foreground">
                          {MODULE_DESCRIPTIONS[item]}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        disabled={isMain}
                        aria-label={`Ativar módulo ${SEGMENT_LABELS[item]}`}
                        onCheckedChange={(checked) =>
                          patch({
                            enabledSegmentModules: checked
                              ? [...draft.enabledSegmentModules, item]
                              : draft.enabledSegmentModules.filter(
                                  (entry) => entry !== item,
                                ),
                          })
                        }
                      />
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MODULE_DESCRIPTIONS: Record<Segment, string> = {
  BARBERSHOP: "Encaixe rápido, fila de espera, combos e comissão por barbeiro.",
  SALON: "Múltiplas categorias, cadeiras e estações, serviços compostos.",
  AESTHETIC: "Pacotes e sessões, ficha de evolução, contraindicações e antes/depois.",
  DENTAL: "Plano de tratamento por etapas, orçamento com itens e anexos.",
};
