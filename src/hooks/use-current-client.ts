"use client";

import { clientRepository, type ClientWithMetrics } from "@/data/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/lib/auth/use-session";

/** Resolve o `Client` do usuário logado na área `/app`. */
export function useCurrentClient(): {
  client: ClientWithMetrics | null;
  loading: boolean;
  reload: () => void;
} {
  const { user } = useSession();

  const { data, loading, reload } = useAsyncData(
    () => (user ? clientRepository.getByUserId(user.id) : Promise.resolve(null)),
    [user?.id],
    { enabled: Boolean(user) },
  );

  return { client: data, loading, reload };
}
