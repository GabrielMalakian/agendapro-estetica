"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  companyRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDuration } from "@/lib/format";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type Service,
  type ServiceCategory,
} from "@/types";

const schema = z.object({
  name: z.string().min(2, "Informe o nome do serviço."),
  description: z.string().max(400).optional(),
  category: z.enum(SERVICE_CATEGORIES),
  durationMinutes: z.coerce
    .number<number>()
    .int("Use minutos inteiros.")
    .min(5, "Mínimo de 5 minutos.")
    .max(600, "Máximo de 10 horas."),
  bufferMinutes: z.coerce
    .number<number>()
    .int()
    .min(0)
    .max(120, "Buffer máximo de 2 horas."),
  price: z.coerce.number<number>().min(0, "Preço não pode ser negativo."),
  professionalIds: z.array(z.string()).min(1, "Habilite ao menos um profissional."),
  requiresRoom: z.boolean(),
  roomIds: z.array(z.string()),
  active: z.boolean(),
  isCombo: z.boolean(),
  comboServiceIds: z.array(z.string()),
});

type FormValues = z.input<typeof schema>;
type ParsedValues = z.output<typeof schema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  service?: Service | null;
  onSaved?: () => void;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  unitId,
  service,
  onSaved,
}: ServiceFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(service);

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
  const { data: services } = useAsyncData(
    () => serviceRepository.list({ unitId, onlyActive: true }),
    [unitId],
    { enabled: open },
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      category: "HAIR",
      durationMinutes: 60,
      bufferMinutes: 10,
      price: 0,
      professionalIds: [],
      requiresRoom: false,
      roomIds: [],
      active: true,
      isCombo: false,
      comboServiceIds: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: service?.name ?? "",
      description: service?.description ?? "",
      category: service?.category ?? "HAIR",
      durationMinutes: service?.durationMinutes ?? 60,
      bufferMinutes: service?.bufferMinutes ?? 10,
      price: service?.price ?? 0,
      professionalIds: service?.professionalIds ?? [],
      requiresRoom: service?.requiresRoom ?? false,
      roomIds: service?.roomIds ?? [],
      active: service?.active ?? true,
      isCombo: Boolean(service?.comboServiceIds?.length),
      comboServiceIds: service?.comboServiceIds ?? [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service?.id]);

  const values = form.watch();

  /** Em um combo, a duração é a soma dos itens — não se digita à mão. */
  const comboDuration = useMemo(() => {
    if (!values.isCombo) return null;
    return (values.comboServiceIds ?? []).reduce((sum, id) => {
      const item = (services ?? []).find((entry) => entry.id === id);
      return sum + (item?.durationMinutes ?? 0);
    }, 0);
  }, [values.isCombo, values.comboServiceIds, services]);

  const onSubmit = form.handleSubmit(async (raw) => {
    const data = raw as unknown as ParsedValues;
    setSaving(true);
    try {
      const duration =
        data.isCombo && comboDuration ? comboDuration : Number(data.durationMinutes);

      const payload = {
        unitId,
        name: data.name,
        description: data.description ?? "",
        category: data.category,
        durationMinutes: duration,
        bufferMinutes: Number(data.bufferMinutes),
        price: Number(data.price),
        professionalIds: data.professionalIds,
        requiresRoom: data.requiresRoom,
        roomIds: data.requiresRoom ? data.roomIds : [],
        active: data.active,
        comboServiceIds: data.isCombo ? data.comboServiceIds : undefined,
      };

      if (isEditing) {
        await serviceRepository.update(service!.id, payload);
      } else {
        await serviceRepository.create(payload);
      }

      toast.success(isEditing ? "Serviço atualizado." : "Serviço criado.");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o serviço.");
    } finally {
      setSaving(false);
    }
  });

  const toggle = (
    field: "professionalIds" | "roomIds" | "comboServiceIds",
    id: string,
    checked: boolean,
  ) => {
    const current = (form.getValues(field) ?? []) as string[];
    form.setValue(
      field,
      checked ? [...current, id] : current.filter((item) => item !== id),
      { shouldValidate: true },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>
            Duração e buffer definem quanto tempo o serviço ocupa na agenda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="service-name">Nome</Label>
            <Input id="service-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Descrição</Label>
            <Textarea id="service-description" rows={2} {...form.register("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-category">Categoria</Label>
              <Select
                value={values.category}
                onValueChange={(value) =>
                  form.setValue("category", value as ServiceCategory)
                }
              >
                <SelectTrigger id="service-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {SERVICE_CATEGORY_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price">Preço (R$)</Label>
              <Input
                id="service-price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...form.register("price")}
              />
              {form.formState.errors.price && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>
          </div>

          {/* Combo */}
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="is-combo" className="text-sm">
                  Combo (serviço composto)
                </Label>
                <p className="text-xs text-muted-foreground">
                  A duração passa a ser a soma dos itens escolhidos.
                </p>
              </div>
              <Switch
                id="is-combo"
                checked={values.isCombo}
                onCheckedChange={(checked) => form.setValue("isCombo", checked)}
              />
            </div>

            {values.isCombo && (
              <div className="space-y-2">
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                  {(services ?? [])
                    .filter((item) => item.id !== service?.id && !item.comboServiceIds)
                    .map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-sm font-normal"
                      >
                        <Checkbox
                          checked={(values.comboServiceIds ?? []).includes(item.id)}
                          onCheckedChange={(checked) =>
                            toggle("comboServiceIds", item.id, Boolean(checked))
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(item.durationMinutes)}
                        </span>
                      </label>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Duração total do combo:{" "}
                  <strong>{formatDuration(comboDuration ?? 0)}</strong>
                </p>
              </div>
            )}
          </div>

          {!values.isCombo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-duration">Duração (min)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min="5"
                  step="5"
                  inputMode="numeric"
                  {...form.register("durationMinutes")}
                />
                {form.formState.errors.durationMinutes && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.durationMinutes.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-buffer">Buffer (min)</Label>
                <Input
                  id="service-buffer"
                  type="number"
                  min="0"
                  step="5"
                  inputMode="numeric"
                  {...form.register("bufferMinutes")}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo de limpeza/troca reservado após o atendimento.
                </p>
              </div>
            </div>
          )}

          {/* Profissionais habilitados */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Profissionais habilitados</legend>
            <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {(professionals ?? []).map((pro) => (
                <label key={pro.id} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={(values.professionalIds ?? []).includes(pro.id)}
                    onCheckedChange={(checked) =>
                      toggle("professionalIds", pro.id, Boolean(checked))
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{pro.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {pro.specialty}
                  </span>
                </label>
              ))}
            </div>
            {form.formState.errors.professionalIds && (
              <p className="text-xs text-destructive">
                {form.formState.errors.professionalIds.message}
              </p>
            )}
          </fieldset>

          {/* Sala */}
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="requires-room" className="text-sm">
                  Precisa de sala, cadeira ou equipamento
                </Label>
                <p className="text-xs text-muted-foreground">
                  O motor de horários só oferece o slot se houver recurso livre.
                </p>
              </div>
              <Switch
                id="requires-room"
                checked={values.requiresRoom}
                onCheckedChange={(checked) => form.setValue("requiresRoom", checked)}
              />
            </div>

            {values.requiresRoom && (
              <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                {(rooms ?? []).map((room) => (
                  <label
                    key={room.id}
                    className="flex items-center gap-2 text-sm font-normal"
                  >
                    <Checkbox
                      checked={(values.roomIds ?? []).includes(room.id)}
                      onCheckedChange={(checked) =>
                        toggle("roomIds", room.id, Boolean(checked))
                      }
                    />
                    {room.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="service-active" className="text-sm">
              Serviço ativo
            </Label>
            <Switch
              id="service-active"
              checked={values.active}
              onCheckedChange={(checked) => form.setValue("active", checked)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isEditing ? "Salvar" : "Criar serviço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
