"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BriefcaseBusiness,
  CalendarCheck,
  ChevronRight,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AppBootScreen } from "@/components/layout/app-boot-screen";
import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession, useSessionActions } from "@/lib/auth/use-session";
import { ROLE_HOME, type Role } from "@/types";

const schema = z.object({
  email: z
    .string()
    .min(1, "Informe o e-mail.")
    .email("Digite um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

type FormValues = z.infer<typeof schema>;

const QUICK_ACCESS: {
  role: Role;
  label: string;
  description: string;
  email: string;
  icon: typeof ShieldCheck;
}[] = [
  {
    role: "ADMIN",
    label: "Entrar como Administrador",
    description: "Marina Alves · visão completa da empresa",
    email: "admin@demo.com",
    icon: ShieldCheck,
  },
  {
    role: "PROFESSIONAL",
    label: "Entrar como Profissional",
    description: "Ana Souza · cabeleireira e esteticista",
    email: "pro@demo.com",
    icon: BriefcaseBusiness,
  },
  {
    role: "CLIENT",
    label: "Entrar como Cliente",
    description: "Gabriel Lima · app de agendamento",
    email: "cliente@demo.com",
    icon: UserRound,
  },
];

const HIGHLIGHTS = [
  "Agenda por profissional e por sala, com detecção de conflito.",
  "Motor de horários que respeita folga, buffer e sala ocupada.",
  "Financeiro, comissões e relatórios prontos para apresentar.",
];

export function LoginScreen() {
  const router = useRouter();
  const { user, ready } = useSession();
  const { signIn, signInAs } = useSessionActions();
  const [quickPending, setQuickPending] = useState<Role | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // Quem já está autenticado não vê a tela de login.
  useEffect(() => {
    if (ready && user) router.replace(ROLE_HOME[user.role]);
  }, [ready, user, router]);

  if (!ready) return <AppBootScreen label="Preparando a demonstração…" />;
  if (user) return <AppBootScreen label="Redirecionando…" />;

  const onSubmit = form.handleSubmit((values) => {
    const result = signIn(values.email, values.password);
    if (!result.ok) {
      form.setError("password", { message: result.error });
      return;
    }
    toast.success("Bem-vindo de volta!");
  });

  const handleQuickAccess = (role: Role) => {
    setQuickPending(role);
    const ok = signInAs(role);
    if (!ok) {
      setQuickPending(null);
      toast.error("Não foi possível entrar. Recarregue a página e tente de novo.");
      return;
    }
    toast.success("Sessão de demonstração iniciada.");
  };

  const fillCredentials = (email: string) => {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", "demo123", { shouldValidate: true });
  };

  return (
    <main
      id="conteudo"
      className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]"
    >
      {/* Painel de apresentação — só no desktop */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45), transparent 42%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.3), transparent 45%)",
          }}
        />

        <div className="relative">
          <BrandMark size="lg" className="[&>span:first-child]:bg-white/15" />
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            A agenda cheia, sem a recepção sobrecarregada.
          </h1>
          <ul className="space-y-3 text-primary-foreground/85">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex gap-3">
                <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/70">
          Ambiente de demonstração · dados fictícios · nenhuma informação real
        </p>
      </section>

      {/* Formulário */}
      <section className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm space-y-8">
          <header className="space-y-2">
            <BrandMark className="lg:hidden" />
            <h2 className="font-display text-2xl font-semibold">Entrar</h2>
            <p className="text-sm text-muted-foreground">
              Escolha um perfil de demonstração ou use as credenciais abaixo.
            </p>
          </header>

          <div className="space-y-2">
            {QUICK_ACCESS.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => handleQuickAccess(option.role)}
                disabled={quickPending !== null}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  {quickPending === option.role ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <option.icon className="size-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="admin@demo.com"
                aria-invalid={Boolean(form.formState.errors.email)}
                aria-describedby={
                  form.formState.errors.email ? "email-error" : undefined
                }
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p id="email-error" className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="demo123"
                aria-invalid={Boolean(form.formState.errors.password)}
                aria-describedby={
                  form.formState.errors.password ? "password-error" : undefined
                }
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p id="password-error" className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Entrar
            </Button>
          </form>

          <Alert>
            <LockKeyhole className="size-4" aria-hidden />
            <AlertDescription className="space-y-2">
              <p className="font-medium text-foreground">
                Credenciais da demonstração
              </p>
              <ul className="space-y-1">
                {QUICK_ACCESS.map((option) => (
                  <li key={option.email}>
                    <button
                      type="button"
                      onClick={() => fillCredentials(option.email)}
                      className="font-mono text-xs underline-offset-2 hover:underline"
                    >
                      {option.email} / demo123
                    </button>
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-1.5 pt-1 text-xs">
                <CalendarCheck className="mt-0.5 size-3 shrink-0" aria-hidden />
                Autenticação simulada. Não há senha no servidor nem token
                assinado — o JWT real entra em <code>src/lib/auth/</code>.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </section>
    </main>
  );
}
