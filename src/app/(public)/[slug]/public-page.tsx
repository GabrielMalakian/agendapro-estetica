"use client";

import {
  CalendarPlus,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Star,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AppBootScreen } from "@/components/layout/app-boot-screen";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  companyRepository,
  engagementRepository,
  professionalRepository,
  serviceRepository,
} from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDatabaseStore } from "@/data/store/database-store";
import {
  formatCurrency,
  formatDuration,
  formatPhone,
  initials,
} from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  SEGMENT_LABELS,
  SERVICE_CATEGORY_LABELS,
  type Weekday,
} from "@/types";

const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

/**
 * Vitrine pública do estabelecimento, em `/[slug]`.
 *
 * Não exige login: é a página que a casa divulga no Instagram e no Google.
 * O botão de agendar leva ao fluxo de booking — que, aí sim, pede sessão.
 */
export function PublicPage({ slug }: { slug: string }) {
  const hydrated = useDatabaseStore((state) => state.hydrated);

  const { data: company, loading } = useAsyncData(
    () => companyRepository.getCompanyBySlug(slug),
    [slug],
  );

  const { data: units } = useAsyncData(
    () => companyRepository.listUnits(company?.id),
    [company?.id],
    { enabled: Boolean(company) },
  );

  const mainUnit = units?.[0] ?? null;

  const { data: services } = useAsyncData(
    () => serviceRepository.list({ unitId: mainUnit?.id, onlyActive: true }),
    [mainUnit?.id],
    { enabled: Boolean(mainUnit) },
  );

  const { data: professionals } = useAsyncData(
    () => professionalRepository.list({ unitId: mainUnit?.id, onlyActive: true }),
    [mainUnit?.id],
    { enabled: Boolean(mainUnit) },
  );

  const { data: reviews } = useAsyncData(
    () => engagementRepository.listReviews({ unitId: mainUnit?.id }),
    [mainUnit?.id],
    { enabled: Boolean(mainUnit) },
  );

  if (!hydrated || loading) return <AppBootScreen />;
  if (!company) notFound();

  const rating =
    (reviews ?? []).length > 0
      ? (reviews ?? []).reduce((sum, item) => sum + item.rating, 0) /
        (reviews ?? []).length
      : null;

  const byCategory = new Map<string, typeof services>();
  for (const service of services ?? []) {
    const key = SERVICE_CATEGORY_LABELS[service.category];
    byCategory.set(key, [...(byCategory.get(key) ?? []), service]);
  }

  return (
    <main id="conteudo" className="min-h-svh bg-muted/30 pb-16">
      {/* Capa */}
      <header className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.5), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3), transparent 50%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-3xl px-4 py-10">
          <div className="flex items-start justify-between gap-3">
            <BrandMark size="sm" className="[&>span:first-child]:bg-white/15" />
            <ThemeToggle className="text-primary-foreground hover:bg-white/10" />
          </div>

          <div className="space-y-3 pt-8">
            <Badge className="bg-white/15 text-primary-foreground hover:bg-white/20">
              {SEGMENT_LABELS[company.segment]}
            </Badge>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              {company.name}
            </h1>

            {rating !== null && (
              <p className="flex items-center gap-1.5 text-sm">
                <span className="flex" aria-hidden>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className={
                        index < Math.round(rating)
                          ? "size-4 fill-current"
                          : "size-4 opacity-40"
                      }
                    />
                  ))}
                </span>
                <span className="font-medium">{rating.toFixed(1)}</span>
                <span className="opacity-80">
                  ({(reviews ?? []).length} avaliações)
                </span>
              </p>
            )}

            {mainUnit && (
              <div className="space-y-1 text-sm text-primary-foreground/85">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {mainUnit.address}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" aria-hidden />
                  {formatPhone(mainUnit.phone)}
                  <span className="opacity-60">·</span>
                  <MessageCircle className="size-4 shrink-0" aria-hidden />
                  {formatPhone(mainUnit.whatsapp)}
                </p>
              </div>
            )}

            <Button asChild size="lg" variant="secondary" className="mt-2 gap-2">
              <Link href="/app/agendar">
                <CalendarPlus className="size-4" aria-hidden />
                Agendar horário
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
        {/* Serviços */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Serviços e preços</h2>

          {(services ?? []).length === 0 ? (
            <EmptyState title="Nenhum serviço publicado" />
          ) : (
            [...byCategory.entries()].map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {category}
                </h3>
                <ul className="space-y-2">
                  {(items ?? []).map((service) => (
                    <li key={service.id}>
                      <Card>
                        <CardContent className="flex flex-wrap items-center gap-3 py-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                            <Scissors className="size-4" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{service.name}</p>
                            {service.description && (
                              <p className="truncate text-xs text-muted-foreground">
                                {service.description}
                              </p>
                            )}
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3" aria-hidden />
                              {formatDuration(service.durationMinutes)}
                            </p>
                          </div>
                          <span className="font-display text-lg font-semibold tabular-nums">
                            {formatCurrency(service.price)}
                          </span>
                          <Button asChild size="sm">
                            <Link href={`/app/agendar?servico=${service.id}`}>
                              Agendar
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {/* Equipe */}
        {(professionals ?? []).length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold">Nossa equipe</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {(professionals ?? []).map((pro) => (
                <li
                  key={pro.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <Avatar className="size-11">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {initials(pro.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pro.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {pro.specialty}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Horários e unidades */}
        {units && units.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold">
              Onde e quando atendemos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {units.map((unitItem) => (
                <Card key={unitItem.id}>
                  <CardContent className="space-y-2 py-4">
                    <p className="font-medium">{unitItem.name}</p>
                    <p className="text-xs text-muted-foreground">{unitItem.address}</p>
                    <Separator />
                    <ul className="space-y-0.5 text-xs">
                      {unitItem.businessHours.map((hours) => (
                        <li
                          key={hours.weekday}
                          className="flex justify-between gap-2 tabular-nums"
                        >
                          <span className="text-muted-foreground">
                            {WEEKDAY_NAMES[hours.weekday]}
                          </span>
                          <span>
                            {hours.closed
                              ? "Fechado"
                              : `${hours.openTime} – ${hours.closeTime}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Avaliações */}
        {(reviews ?? []).filter((item) => item.comment).length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold">O que dizem</h2>
            <ul className="space-y-2">
              {(reviews ?? [])
                .filter((item) => item.comment)
                .slice(0, 5)
                .map((review) => (
                  <li
                    key={review.id}
                    className="space-y-1 rounded-xl border border-border bg-card p-3"
                  >
                    <span
                      className="flex gap-0.5"
                      aria-label={`${review.rating} de 5 estrelas`}
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={
                            index < review.rating
                              ? "size-3.5 fill-warning text-warning"
                              : "size-3.5 text-muted-foreground/40"
                          }
                          aria-hidden
                        />
                      ))}
                    </span>
                    <p className="text-sm">{review.comment}</p>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <footer className="space-y-2 border-t border-border pt-6 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/app/agendar">
              <CalendarPlus className="size-4" aria-hidden />
              Agendar meu horário
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Página de demonstração do AgendaPro · dados fictícios
          </p>
        </footer>
      </div>
    </main>
  );
}
