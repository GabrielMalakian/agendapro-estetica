/**
 * Ponto único de acesso a dados.
 *
 * Regra do projeto: **nenhum componente de UI importa o store ou o seed
 * diretamente**. Tudo passa por estes repositórios, cujas assinaturas já são
 * as do backend NestJS que virá depois (ver `docs/api-contract.md`).
 */
export * from "./core";
export * from "./company-repository";
export * from "./service-repository";
export * from "./professional-repository";
export * from "./client-repository";
export * from "./appointment-repository";
export * from "./finance-repository";
export * from "./report-repository";
export * from "./engagement-repository";
