"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDatabaseStore } from "@/data/store/database-store";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Refaz a consulta — usado depois de mutações e no botão "tentar de novo". */
  reload: () => void;
}

/**
 * Consome um repositório com estados de loading, erro e recarga.
 *
 * Espera a base de demonstração hidratar antes de disparar (senão a primeira
 * consulta rodaria contra a base vazia usada na renderização do servidor).
 * Quando existir backend, basta trocar o corpo do repositório — este hook
 * continua igual.
 */
export function useAsyncData<T>(
  query: () => Promise<T>,
  deps: readonly unknown[],
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true;
  const hydrated = useDatabaseStore((state) => state.hydrated);
  // Revisão: qualquer mutação na base invalida o que está em tela.
  const revision = useDatabaseStore((state) => state.db);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!hydrated || !enabled) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    queryRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `revision` entra de propósito: mutações na base recarregam a consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, enabled, nonce, revision, ...deps]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading: loading && enabled, error, reload };
}

/**
 * Executa uma mutação de repositório controlando o estado de "salvando".
 * Devolve o resultado ou lança — quem chama decide o toast.
 */
export function useMutation<TInput, TResult>(
  action: (input: TInput) => Promise<TResult>,
): {
  run: (input: TInput) => Promise<TResult>;
  pending: boolean;
  error: Error | null;
} {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (input: TInput) => {
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error(String(cause));
      setError(normalized);
      throw normalized;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error };
}
