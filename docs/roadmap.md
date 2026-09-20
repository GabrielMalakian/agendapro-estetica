# Roadmap

## Onde estamos

MVP de frontend navegável, com dados fictícios no navegador e sessão simulada.
Serve para demonstrar o produto e para especificar o backend — não para
atender cliente de verdade.

### Entregue

| Fase | Conteúdo |
| --- | --- |
| 1 | Tipos como DTOs, seed determinístico, store persistido, repositórios assíncronos, sessão falsa, layouts e guards por papel |
| 2 | `getAvailableSlots()` e `validateAppointment()` como funções puras, com 62 testes |
| 3 | Agenda do admin: dia/semana/mês, colunas por profissional ou sala, arrastar para reagendar, conflitos, bloqueio, lista de espera |
| 4 | Agendamentos com filtros e ações em massa; clientes com segmentação e ficha; CRUD de serviços e profissionais |
| 5 | Área do profissional: agenda do dia, folha de atendimento, meus clientes, minha produção |
| 6 | Área do cliente: home, fluxo de agendamento em 5 etapas, meus horários, perfil, avaliações; vitrine pública `/[slug]` |
| 7 | Dashboard, financeiro com comissões, relatórios com exportação CSV |
| 8 | Comunicação mockada, configurações completas com políticas e permissões |
| 9 | PWA instalável, dark mode, acessibilidade, README de demonstração |

---

## Próximo passo: o backend

Especificação pronta em [`api-contract.md`](./api-contract.md).

### Fase 10 — Fundação do servidor

- NestJS + Prisma + PostgreSQL; schema derivado de `src/types/`.
- `POST /auth/login` com argon2id, access token curto e refresh em cookie
  `httpOnly`; `JwtAuthGuard` + `RolesGuard`.
- Multitenancy no Prisma: `companyId`/`unitId` sempre do token.
- `prisma/seed.ts` portado de `src/data/seed/`.
- **Portar `src/lib/scheduling/` sem reescrever.** É puro e já testado;
  duplicar a regra em duas linguagens é o caminho mais curto para a agenda do
  cliente discordar da agenda da recepção.
- Constraints de exclusão no Postgres contra sobreposição — a validação em
  TypeScript dá a mensagem, o banco dá a garantia.

### Fase 11 — Trocar o mock pela API

- `src/lib/api/client.ts` com refresh automático no 401.
- Reescrever o corpo dos repositórios; as assinaturas não mudam.
- Trocar `useAsyncData` por TanStack Query (cache, revalidação, otimismo).
  Hoje qualquer mutação recarrega tudo — aceitável com dados em memória,
  caro com rede.
- `middleware.ts` lendo o cookie de sessão, para o guard existir também na
  borda e não só no cliente.

### Fase 12 — O que a demonstração ainda não faz

| Item | Por que ficou de fora |
| --- | --- |
| Pagamento online de verdade (Pix, cartão) | Exige gateway, webhook e conciliação |
| Envio real de WhatsApp | Exige conta Business aprovada e fila |
| Upload de fotos e documentos | Exige bucket privado e URL assinada |
| Sincronização entre dispositivos | Não há servidor; os dados vivem em um navegador só |
| Google Calendar / iCal | Depende de OAuth por profissional |
| Recorrência de atendimentos | Modelo precisa de série + exceções |
| Fechamento de comissão com trava | Precisa congelar a alíquota da data |
| Auditoria de acesso a dado sensível | Exige servidor; hoje não há onde registrar |

### Fase 13 — Produto

- Cobrança por assinatura e onboarding self-service.
- Lista de espera ativa: oferecer a vaga automaticamente ao cancelar.
- Programa de fidelidade e campanhas para inativos.
- Aplicativo do cliente com push real (Web Push com VAPID).
- Relatório de retenção por coorte.

---

## Dívidas técnicas conscientes

Cada uma foi uma escolha, não um esquecimento.

| Dívida | Por que aceitamos | Quando cobrar |
| --- | --- | --- |
| Toda mutação invalida todas as consultas em tela | Simples e correto com dados locais | Ao entrar a API — TanStack Query |
| Sem virtualização em listas longas | ~200 registros no seed | Acima de ~1.000 linhas |
| Nenhum teste de componente | O risco estava na regra de agendamento, e ela está coberta | Junto com o backend — Testing Library nos fluxos críticos |
| Sem i18n | Produto é pt-BR | Só se houver expansão |
| Permissões apenas na UI | Sem servidor, não há o que proteger | Na fase 10, com `RolesGuard` |
| Timezone implícito do navegador | Todas as unidades são do mesmo fuso | Ao existir unidade em outro fuso — guardar IANA na `Unit` |
