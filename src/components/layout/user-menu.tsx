"use client";

import {
  BriefcaseBusiness,
  LogOut,
  RotateCcw,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDatabaseStore } from "@/data/store/database-store";
import { useSession, useSessionActions } from "@/lib/auth/use-session";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ROLE_HOME, ROLE_LABELS, type Role } from "@/types";

const PROFILE_ICONS: Record<Role, typeof ShieldCheck> = {
  ADMIN: ShieldCheck,
  PROFESSIONAL: BriefcaseBusiness,
  CLIENT: UserRound,
};

/**
 * Menu do usuário com o atalho "Trocar de perfil", que existe apenas para
 * facilitar a demonstração — num produto real ninguém troca de papel sem
 * autenticar de novo.
 */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { user } = useSession();
  const { signInAs, signOut } = useSessionActions();
  const resetDemo = useDatabaseStore((state) => state.reset);

  if (!user) return null;

  const switchTo = (role: Role) => {
    if (signInAs(role)) router.replace(ROLE_HOME[role]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto gap-2 px-2 py-1.5",
            compact && "size-9 justify-center p-0",
          )}
          aria-label="Menu do usuário"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-accent text-xs text-accent-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block truncate text-sm leading-tight font-medium">
                {user.name}
              </span>
              <span className="block truncate text-xs leading-tight text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Users className="size-4" aria-hidden />
            Trocar de perfil
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(["ADMIN", "PROFESSIONAL", "CLIENT"] as Role[]).map((role) => {
              const Icon = PROFILE_ICONS[role];
              return (
                <DropdownMenuItem
                  key={role}
                  onSelect={() => switchTo(role)}
                  className="gap-2"
                  disabled={role === user.role}
                >
                  <Icon className="size-4" aria-hidden />
                  {ROLE_LABELS[role]}
                  {role === user.role && (
                    <span className="ml-auto text-xs text-muted-foreground">atual</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onSelect={() => resetDemo()} className="gap-2">
          <RotateCcw className="size-4" aria-hidden />
          Reiniciar dados da demo
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            signOut();
            router.replace("/login");
          }}
          className="gap-2"
          variant="destructive"
        >
          <LogOut className="size-4" aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
