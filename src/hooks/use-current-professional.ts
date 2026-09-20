"use client";

import { professionalRepository } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";
import type { Professional } from "@/types";

/**
 * Resolve o `Professional` do usuário logado.
 *
 * A sessão guarda o `User`; o perfil profissional é outra entidade (um
 * usuário pode existir sem agenda). Toda a área `/pro` parte daqui.
 */
export function useCurrentProfessional(): {
  professional: Professional | null;
  loading: boolean;
  reload: () => void;
} {
  const { user } = useSession();

  const { data, loading, reload } = useAsyncData(
    () =>
      user
        ? professionalRepository.getByUserId(user.id)
        : Promise.resolve(null),
    [user?.id],
    { enabled: Boolean(user) },
  );

  return { professional: data, loading, reload };
}
