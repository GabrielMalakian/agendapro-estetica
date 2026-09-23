"use client";

import {
  Activity,
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  Database,
  GitBranch,
  HardDrive,
  KeyRound,
  Layers,
  RotateCcw,
  Server,
  Stethoscope,
  Terminal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DATABASE_STORAGE_KEY,
  useDatabaseStore,
} from "@/data/store/database-store";
import { SESSION_STORAGE_KEY } from "@/lib/auth/session-store";
import { DATABASE_VERSION } from "@/data/database";
import { formatDateTime } from "@/lib/format";

export interface BuildInfo {
  version: string;
  next: string;
  react: string;
  tailwind: string;
  typescript: string;
  zustand: string;
}

/** Rotas da aplicação, agrupadas por área — serve de mapa da demonstração. */
const ROUTE_MAP: { area: string; guard: string; routes: string[] }[] = [
  {
    area: "Pública",
    guard: "sem sessão",
    routes: ["/", "/login", "/dev", "/[slug]", "/offline"],
  },
  {
    area: "Cliente",
    guard: "role CLIENT",
    routes: ["/app", "/app/agendar", "/app/agendamentos", "/app/perfil"],
  },
  {
    area: "Profissional",
    guard: "role PROFESSIONAL",
    routes: ["/pro", "/pro/clientes", "/pro/producao"],
  },
  {
    area: "Administração",
    guard: "role ADMIN",
    routes: [
      "/admin",
      "/admin/agenda",
      "/admin/agendamentos",
      "/admin/clientes",
      "/admin/servicos",
      "/admin/profissionais",
      "/admin/financeiro",
      "/admin/relatorios",
      "/admin/comunicacao",
      "/admin/configuracoes",
    ],
  },
];

/** Tamanho aproximado de uma chave do localStorage, em KB. */
function storageSizeKb(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    // 2 bytes por caractere: o localStorage guarda UTF-16.
    return Math.round((raw.length * 2) / 1024);
  } catch {
    return null;
  }
}

export function DevConsole({ build }: { build: BuildInfo }) {
  const db = useDatabaseStore((state) => state.db);
  const seededOn = useDatabaseStore((state) => state.seededOn);
  const hydrated = useDatabaseStore((state) => state.hydrated);
  const reset = useDatabaseStore((state) => state.reset);
  const [confirmReset, setConfirmReset] = useState(false);

  /**
   * "Logs recentes" derivados da própria base: cada notificação e cada
   * agendamento recente vira uma linha no formato de log de aplicação. Não há
   * servidor nesta demonstração — o que existe de verdade são estes eventos.
   */
  const logs = useMemo(() => {
    if (!hydrated) return [];

    const fromNotifications = db.notifications
      .filter((item) => item.sentAt)
      .map((item) => ({
        at: item.sentAt as string,
        level: item.status === "FAILED" ? "WARN" : "INFO",
        message: `notification.dispatch channel=${item.channel} template=${item.template} status=${item.status}`,
      }));

    const fromAppointments = db.appointments.map((item) => ({
      at: item.createdAt,
      level: item.status === "CANCELLED" || item.status === "NO_SHOW" ? "WARN" : "INFO",
      message: `appointment.${item.status.toLowerCase()} id=${item.id.slice(0, 8)} unit=${item.unitId.slice(0, 8)}`,
    }));

    return [...fromNotifications, ...fromAppointments]
      .filter((entry) => Boolean(entry.at))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 14);
  }, [db, hydrated]);

  const counters = [
    { icon: KeyRound, label: "Usuários cadastrados", value: db.users.length },
    { icon: Users, label: "Clientes", value: db.clients.length },
    { icon: Stethoscope, label: "Profissionais", value: db.professionals.length },
    { icon: Layers, label: "Serviços cadastrados", value: db.services.length },
    { icon: CalendarClock, label: "Agendamentos realizados", value: db.appointments.length },
    { icon: Activity, label: "Pagamentos lançados", value: db.payments.length },
  ];

  const dbSize = hydrated ? storageSizeKb(DATABASE_STORAGE_KEY) : null;
  const hasSession = hydrated ? storageSizeKb(SESSION_STORAGE_KEY) !== null : false;

  const status = [
    {
      icon: CircleCheck,
      label: "Status da aplicação",
      value: hydrated ? "Operacional" : "Inicializando",
      hint: hydrated ? "base hidratada no cliente" : "lendo o localStorage",
      tone: hydrated ? "success" : "warning",
    },
    {
      icon: Server,
      label: "Status da API",
      value: "Simulada",
      hint: "repositórios locais com latência artificial",
      tone: "info",
    },
    {
      icon: Database,
      label: "Banco de dados",
      value: "localStorage",
      hint: `schema v${DATABASE_VERSION}`,
      tone: "info",
    },
    {
      icon: GitBranch,
      label: "Versão do sistema",
      value: `v${build.version}`,
      hint: "demonstração navegável",
      tone: "neutral",
    },
  ] as const;

  const toneClass = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/10 text-info",
    neutral: "bg-muted text-muted-foreground",
  } as const;

  const handleReset = () => {
    reset();
    setConfirmReset(false);
    toast.success("Base de demonstração recriada a partir do seed.");
  };

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="AgendaPro — início">
            <BrandMark size="sm" />
          </Link>
          <Badge variant="secondary" className="hidden gap-1.5 font-mono text-xs sm:inline-flex">
            <Terminal className="size-3" aria-hidden />
            /dev
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/">
                <ArrowLeft className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Página inicial</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <header className="animate-rise space-y-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Área do desenvolvedor
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed font-light text-muted-foreground">
            Painel técnico desta demonstração. Todos os números vêm da base
            fictícia gerada no seu próprio navegador — não há servidor, API
            remota nem dado real por trás desta tela.
          </p>
        </header>

        {/* Status */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {status.map((item, index) => (
            <Card
              key={item.label}
              className={`animate-rise stagger-${index + 1} gap-0 py-5`}
            >
              <CardContent className="space-y-3 px-5">
                <span
                  className={`flex size-9 items-center justify-center rounded-xl ${toneClass[item.tone]}`}
                  aria-hidden
                >
                  <item.icon className="size-4.5" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-light text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="font-display text-lg font-semibold">{item.value}</p>
                  <p className="text-xs font-light text-muted-foreground">
                    {item.hint}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Contadores da base */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Base de demonstração</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {counters.map((counter) => (
              <Card key={counter.label} className="gap-0 py-5">
                <CardContent className="flex items-center gap-4 px-5">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"
                    aria-hidden
                  >
                    <counter.icon className="size-5" />
                  </span>
                  <div>
                    {hydrated ? (
                      <p className="font-display text-2xl font-semibold tabular-nums">
                        {counter.value}
                      </p>
                    ) : (
                      <Skeleton className="h-8 w-12" />
                    )}
                    <p className="text-xs font-light text-muted-foreground">
                      {counter.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Ambiente e armazenamento */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="gap-0 py-6">
            <CardContent className="space-y-4 px-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <HardDrive className="size-4 text-muted-foreground" aria-hidden />
                Armazenamento local
              </h2>
              <dl className="space-y-2.5 text-sm">
                <Row label="Chave da base" value={DATABASE_STORAGE_KEY} mono />
                <Row label="Versão do schema" value={`v${DATABASE_VERSION}`} mono />
                <Row
                  label="Tamanho aproximado"
                  value={dbSize === null ? "—" : `${dbSize} KB`}
                  mono
                />
                <Row label="Base gerada em" value={hydrated ? seededOn : "—"} mono />
                <Row
                  label="Sessão ativa"
                  value={hasSession ? "sim" : "não"}
                  mono
                />
              </dl>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmReset(true)}
                disabled={!hydrated}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Reiniciar demonstração
              </Button>
            </CardContent>
          </Card>

          <Card className="gap-0 py-6">
            <CardContent className="space-y-4 px-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Layers className="size-4 text-muted-foreground" aria-hidden />
                Ambiente
              </h2>
              <dl className="space-y-2.5 text-sm">
                <Row label="AgendaPro" value={`v${build.version}`} mono />
                <Row label="Next.js" value={build.next} mono />
                <Row label="React" value={build.react} mono />
                <Row label="TypeScript" value={build.typescript} mono />
                <Row label="Tailwind CSS" value={build.tailwind} mono />
                <Row label="Zustand" value={build.zustand} mono />
              </dl>
            </CardContent>
          </Card>
        </section>

        {/* Mapa de rotas */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Rotas da aplicação</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ROUTE_MAP.map((group) => (
              <Card key={group.area} className="gap-0 py-5">
                <CardContent className="space-y-3 px-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{group.area}</h3>
                    <Badge variant="outline" className="font-mono text-[0.625rem]">
                      {group.guard}
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {group.routes.map((route) => (
                      <li
                        key={route}
                        className="font-mono text-xs text-muted-foreground"
                      >
                        {route}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Logs */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Logs recentes</h2>
          <Card className="gap-0 overflow-hidden py-0">
            <CardContent className="px-0">
              {!hydrated ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} className="h-4 w-full" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <p className="p-5 text-sm font-light text-muted-foreground">
                  Nenhum evento registrado nesta base.
                </p>
              ) : (
                <ul className="scrollbar-thin max-h-[22rem] divide-y divide-border overflow-y-auto">
                  {logs.map((entry, index) => (
                    <li
                      key={`${entry.at}-${index}`}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5 font-mono text-xs"
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {formatDateTime(entry.at)}
                      </span>
                      <span
                        className={
                          entry.level === "WARN" ? "text-warning" : "text-info"
                        }
                      >
                        {entry.level}
                      </span>
                      <span className="min-w-0 flex-1 break-all text-muted-foreground">
                        {entry.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <p className="text-xs font-light text-muted-foreground">
            Eventos derivados da base local do navegador. Nenhum identificador
            real, e-mail ou telefone de pessoa real aparece nesta tela.
          </p>
        </section>
      </main>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar a demonstração?</AlertDialogTitle>
            <AlertDialogDescription>
              A base atual do navegador será descartada e gerada de novo a
              partir do seed. Agendamentos criados durante a navegação se
              perdem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <dt className="font-light text-muted-foreground">{label}</dt>
      <dd className={mono ? "truncate font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}
