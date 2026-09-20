"use client";

import { Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { engagementRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  appointmentId: string | null;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const RATING_LABELS = [
  "Péssimo",
  "Ruim",
  "Regular",
  "Bom",
  "Excelente",
] as const;

export function ReviewDialog({
  appointmentId,
  clientId,
  open,
  onOpenChange,
  onSaved,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(0);
      setHovered(0);
      setComment("");
    }
  }, [open]);

  const submit = async () => {
    if (!appointmentId || rating === 0) return;
    setSaving(true);
    try {
      await engagementRepository.createReview({
        appointmentId,
        clientId,
        rating,
        comment,
      });
      toast.success("Obrigado pela avaliação!");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível enviar a avaliação.");
    } finally {
      setSaving(false);
    }
  };

  const shown = hovered || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Avaliar atendimento</DialogTitle>
          <DialogDescription>
            Sua nota ajuda a equipe a melhorar. Leva menos de um minuto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Sua nota</legend>
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Nota de 1 a 5 estrelas"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"} — ${RATING_LABELS[value - 1]}`}
                  onMouseEnter={() => setHovered(value)}
                  onFocus={() => setHovered(value)}
                  onClick={() => setRating(value)}
                  className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Star
                    className={cn(
                      "size-7 transition-colors",
                      value <= shown
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
              {shown > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {RATING_LABELS[shown - 1]}
                </span>
              )}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Comentário (opcional)</Label>
            <Textarea
              id="review-comment"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="O que você achou do atendimento?"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
          <Button onClick={submit} disabled={rating === 0 || saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Enviar avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
