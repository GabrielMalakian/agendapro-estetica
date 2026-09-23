import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Code2,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  clinic,
  clinicHighlights,
  mainUnit,
  showcaseServices,
} from "@/components/site/site-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDuration, formatPhone } from "@/lib/format";
import { SERVICE_CATEGORY_LABELS, type Weekday } from "@/types";

export const metadata: Metadata = {
  title: "AgendaPro — Agendamento para clínicas de estética",
  description:
    "Seu cuidado começa com um horário marcado. Agende procedimentos estéticos de forma rápida, simples e segura.",
};

/** Caminho de acesso a cada área, com o perfil já pré-selecionado no login. */
const ACCESS_CARDS = [
  {
    icon: UserRound,
    title: "Área do Cliente",
    description: "Agende e acompanhe seus atendimentos.",
    action: "Entrar como cliente",
    href: "/login?perfil=cliente",
  },
  {
    icon: Stethoscope,
    title: "Área do Profissional",
    description: "Gerencie sua agenda e consulte seus próximos atendimentos.",
    action: "Entrar como profissional",
    href: "/login?perfil=profissional",
  },
  {
    icon: Code2,
    title: "Área do Desenvolvedor",
    description: "Acesse ferramentas administrativas e informações técnicas do sistema.",
    action: "Área do desenvolvedor",
    href: "/dev",
  },
] as const;

const PROMISES = [
  {
    icon: CalendarCheck,
    title: "Horário confirmado na hora",
    description:
      "A agenda mostra só os horários realmente livres — considerando sala, equipamento e intervalo entre procedimentos.",
  },
  {
    icon: ShieldCheck,
    title: "Protocolo registrado",
    description:
      "Cada sessão fica na ficha de evolução, com contraindicações sinalizadas antes do atendimento começar.",
  },
  {
    icon: Heart,
    title: "Lembretes que reduzem falta",
    description:
      "Confirmação por WhatsApp em 48h, 24h e 2h antes, com reagendamento em um toque.",
  },
];

const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main id="conteudo" className="flex-1">
        {/* ------------------------------ Hero ------------------------------ */}
        <section id="inicio" className="bg-blush scroll-mt-24">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
            <div className="animate-rise space-y-8">
              <Badge
                variant="secondary"
                className="gap-1.5 bg-card px-3 py-1.5 text-xs font-medium shadow-xs"
              >
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                {clinic.name} · estética e bem-estar
              </Badge>

              <div className="space-y-5">
                <h1 className="font-display text-4xl leading-[1.08] font-bold text-balance sm:text-5xl lg:text-6xl">
                  Seu cuidado começa com um horário marcado.
                </h1>
                <p className="max-w-xl text-lg leading-relaxed font-light text-muted-foreground">
                  Agende seus procedimentos de forma rápida, simples e segura.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-7 text-base">
                  <Link href="/login?perfil=cliente&proximo=/app/agendar">
                    Agendar horário
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 bg-card px-7 text-base"
                >
                  <Link href="#servicos">Conheça nossos serviços</Link>
                </Button>
              </div>

              <dl className="grid grid-cols-3 gap-4 border-t border-border/70 pt-6">
                {clinicHighlights.map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <dt className="sr-only">{item.label}</dt>
                    <dd className="font-display text-xl font-semibold sm:text-2xl">
                      {item.value}
                    </dd>
                    <p className="text-xs leading-snug font-light text-muted-foreground">
                      {item.label}
                    </p>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-rise stagger-2 relative">
              <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
                <Image
                  src="/images/hero-tratamento-facial.jpg"
                  alt="Esteticista aplicando tratamento facial com aparelho em uma cliente deitada na maca"
                  width={1400}
                  height={2100}
                  priority
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="h-[26rem] w-full object-cover object-center sm:h-[32rem] lg:h-[36rem]"
                />
              </div>

              {/* Cartão flutuante: mostra, em vez de contar, o que o sistema faz. */}
              <div className="animate-rise stagger-4 absolute -bottom-6 left-4 w-[17rem] max-w-[85%] rounded-2xl border border-border bg-card/95 p-4 shadow-raised backdrop-blur-sm sm:left-6">
                <p className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Clock className="size-3.5" aria-hidden />
                  Próximo horário
                </p>
                <p className="mt-2 font-display text-base font-semibold">
                  Limpeza de pele
                </p>
                <p className="text-sm font-light text-muted-foreground">
                  Quinta, 14:30 · Ana Souza
                </p>
                <Badge className="mt-3 bg-success text-success-foreground">
                  Confirmado
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------- Serviços ---------------------------- */}
        <section id="servicos" className="scroll-mt-24 py-20 lg:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <header className="max-w-2xl space-y-4">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                Procedimentos
              </p>
              <h2 className="font-display text-3xl font-bold text-balance sm:text-4xl">
                Tratamentos conduzidos por profissionais especializados
              </h2>
              <p className="text-base leading-relaxed font-light text-muted-foreground">
                Cada procedimento tem duração, sala e intervalo próprios — a
                agenda respeita tudo isso antes de oferecer um horário.
              </p>
            </header>

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {showcaseServices.map(({ service, image, alt }, index) => (
                <li
                  key={service.id}
                  className={`animate-rise stagger-${Math.min(index + 1, 5)} card-lift group overflow-hidden rounded-2xl border border-border bg-card shadow-card`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={image}
                      alt={alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <Badge
                      variant="secondary"
                      className="absolute top-3 left-3 bg-card/90 font-medium backdrop-blur-sm"
                    >
                      {SERVICE_CATEGORY_LABELS[service.category]}
                    </Badge>
                  </div>

                  <div className="space-y-3 p-5">
                    <h3 className="font-display text-lg font-semibold">
                      {service.name}
                    </h3>
                    <p className="min-h-[2.5rem] text-sm leading-relaxed font-light text-muted-foreground">
                      {service.description}
                    </p>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="flex items-center gap-1.5 text-xs font-light text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden />
                        {formatDuration(service.durationMinutes)}
                      </span>
                      <span className="font-display text-base font-semibold tabular-nums">
                        {formatCurrency(service.price)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/login?perfil=cliente&proximo=/app/agendar">
                  Agendar horário
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href={`/${clinic.slug}`}>Ver a vitrine pública da clínica</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* -------------------- Como você deseja acessar? -------------------- */}
        <section id="acesso" className="scroll-mt-24 bg-secondary/40 py-20 lg:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <header className="max-w-2xl space-y-4">
              <h2 className="font-display text-3xl font-bold text-balance sm:text-4xl">
                Como você deseja acessar?
              </h2>
              <p className="text-base leading-relaxed font-light text-muted-foreground">
                Três perfis, três experiências. Entre em qualquer um deles — a
                demonstração já vem com dados prontos.
              </p>
            </header>

            <ul className="mt-12 grid gap-6 md:grid-cols-3">
              {ACCESS_CARDS.map((card, index) => (
                <li
                  key={card.title}
                  className={`animate-rise stagger-${index + 1} card-lift group flex flex-col rounded-2xl border border-border bg-card p-7 shadow-card hover:border-primary/40`}
                >
                  <span
                    className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                    aria-hidden
                  >
                    <card.icon className="size-7" />
                  </span>

                  <h3 className="mt-6 font-display text-xl font-semibold">
                    {card.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed font-light text-muted-foreground">
                    {card.description}
                  </p>

                  <Button asChild variant="outline" className="mt-6 w-full justify-between">
                    <Link href={card.href}>
                      {card.action}
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-1"
                        aria-hidden
                      />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------ Sobre ------------------------------ */}
        <section id="sobre" className="scroll-mt-24 py-20 lg:py-28">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <div className="relative">
              <div className="overflow-hidden rounded-[2rem] shadow-soft">
                <Image
                  src="/images/ambiente-recepcao.jpg"
                  alt="Recepção de clínica de estética com poltronas claras e plantas"
                  width={1200}
                  height={840}
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="h-[22rem] w-full object-cover sm:h-[26rem]"
                />
              </div>
              <div className="absolute -right-2 -bottom-10 hidden w-48 overflow-hidden rounded-2xl border-4 border-background shadow-raised sm:block lg:-right-6">
                <Image
                  src="/images/equipe-esteticista.jpg"
                  alt="Esteticista sentada em sala de atendimento clara, calçando luva"
                  width={900}
                  height={600}
                  sizes="12rem"
                  className="h-40 w-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  Sobre
                </p>
                <h2 className="font-display text-3xl font-bold text-balance sm:text-4xl">
                  Uma clínica organizada é o que o cliente sente como cuidado
                </h2>
                <p className="text-base leading-relaxed font-light text-muted-foreground">
                  A {clinic.name} usa o AgendaPro para coordenar salas,
                  equipamentos e equipe. Quem chega encontra o horário de pé, a
                  sala pronta e o profissional a par do histórico — sem
                  retrabalho na recepção.
                </p>
              </div>

              <ul className="space-y-5">
                {PROMISES.map((promise) => (
                  <li key={promise.title} className="flex gap-4">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"
                      aria-hidden
                    >
                      <promise.icon className="size-5" />
                    </span>
                    <div className="space-y-1">
                      <h3 className="font-medium">{promise.title}</h3>
                      <p className="text-sm leading-relaxed font-light text-muted-foreground">
                        {promise.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ----------------------------- Contato ----------------------------- */}
        <section id="contato" className="scroll-mt-24 pb-24 lg:pb-32">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-card">
              <div className="grid lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-8 p-8 sm:p-12">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                      Contato
                    </p>
                    <h2 className="font-display text-3xl font-bold text-balance">
                      Venha nos visitar
                    </h2>
                    <p className="text-base leading-relaxed font-light text-muted-foreground">
                      {mainUnit.name} — também atendemos com hora marcada na
                      segunda unidade.
                    </p>
                  </div>

                  <ul className="space-y-4 text-sm">
                    <li className="flex gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span className="font-light">{mainUnit.address}</span>
                    </li>
                    <li className="flex gap-3">
                      <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span className="font-light">{formatPhone(mainUnit.phone)}</span>
                    </li>
                    <li className="flex gap-3">
                      <MessageCircle
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span className="font-light">
                        WhatsApp {formatPhone(mainUnit.whatsapp)}
                      </span>
                    </li>
                  </ul>

                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="size-4 text-primary" aria-hidden />
                      Horários de atendimento
                    </h3>
                    {/* Segunda a domingo, preenchendo coluna a coluna. */}
                    <ul className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-4">
                      {[...mainUnit.businessHours]
                        .sort(
                          (a, b) =>
                            ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7),
                        )
                        .map((hours) => (
                          <li
                            key={hours.weekday}
                            className="flex items-center justify-between gap-4 border-b border-border/60 py-1"
                          >
                            <span className="font-light text-muted-foreground">
                              {WEEKDAY_NAMES[hours.weekday]}
                            </span>
                            <span className="tabular-nums">
                              {hours.closed
                                ? "Fechado"
                                : `${hours.openTime} — ${hours.closeTime}`}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <Button asChild size="lg">
                    <Link href="/login?perfil=cliente&proximo=/app/agendar">
                      Agendar horário
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </div>

                <div className="relative min-h-[18rem] lg:min-h-full">
                  <Image
                    src="/images/equipe-atendimento.jpg"
                    alt="Profissional de estética atendendo uma cliente em sala de procedimentos"
                    fill
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
