import type {
  PermissionAction,
  PermissionMatrix,
  PermissionResource,
  Role,
} from "@/types";

/**
 * Autorização no cliente — apenas UX.
 *
 * No backend real a mesma matriz é aplicada por `RolesGuard` + `CASL` (ou
 * equivalente) em cada endpoint. Esconder um botão não protege nada; ver
 * `src/lib/auth/README.md`.
 */
export function can(
  matrix: PermissionMatrix,
  role: Role,
  resource: PermissionResource,
  action: PermissionAction = "read",
): boolean {
  return matrix[role]?.[resource]?.includes(action) ?? false;
}

/** Recursos que o papel pode ao menos ler — usado para montar o menu. */
export function readableResources(
  matrix: PermissionMatrix,
  role: Role,
): PermissionResource[] {
  const entries = Object.entries(matrix[role] ?? {}) as [
    PermissionResource,
    PermissionAction[],
  ][];
  return entries
    .filter(([, actions]) => actions.includes("read"))
    .map(([resource]) => resource);
}
