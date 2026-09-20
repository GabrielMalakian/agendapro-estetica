# Contrato da API — especificação para o backend NestJS

Este documento é a **especificação do backend a ser construído**, derivada do
frontend que já existe. Cada repositório em `src/data/repositories/` implementa
hoje, em memória, exatamente a assinatura que o endpoint correspondente terá.
Trocar o mock pela API real significa substituir o corpo de cada método por um
`fetch` — nenhuma assinatura muda e nenhum componente precisa ser tocado.

## Convenções gerais

| Assunto | Decisão |
| --- | --- |
| Base | `/api/v1` |
| Formato | JSON, `Content-Type: application/json; charset=utf-8` |
| Identificadores | UUID v4 em string |
| Datas com hora | ISO 8601 em UTC (`2026-09-21T13:30:00.000Z`) |
| Datas sem hora | `yyyy-MM-dd` |
| Horas do dia | `HH:mm` no fuso da unidade |
| Enums | `UPPER_SNAKE_CASE` |
| Campos | `camelCase` |
| Autenticação | `Authorization: Bearer <access token>` |
| Paginação | `?page=1&pageSize=25` → `{ items, total, page, pageSize }` |

### Multitenancy

`companyId` e `unitId` **nunca** vêm do corpo ou da query da requisição: são
lidos do JWT e aplicados no `where` do Prisma. O parâmetro `unitId` que aparece
abaixo serve apenas para o usuário escolher entre as unidades que o token já
autoriza — o servidor valida essa interseção antes de consultar.

### Erros

```jsonc
{
  "statusCode": 409,
  "error": "APPOINTMENT_CONFLICT",
  "message": "Ana Souza já tem atendimento das 10:30 às 11:30.",
  "details": [
    {
      "code": "PROFESSIONAL_CONFLICT",
      "field": "professionalId",
      "message": "Ana Souza já tem atendimento das 10:30 às 11:30.",
      "conflictingAppointmentId": "…"
    }
  ]
}
```

O array `details` é o mesmo `AppointmentValidationError[]` que
`validateAppointment()` já devolve hoje no cliente — a UI que mostra o erro
por campo continua funcionando sem alteração.

---

## 1. Autenticação — `src/lib/auth/`

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | `{ email, password }` | `{ accessToken, user }` + cookie `httpOnly` de refresh |
| `POST` | `/auth/refresh` | — (cookie) | `{ accessToken }` |
| `POST` | `/auth/logout` | — | `204` |
| `GET` | `/auth/me` | — | `{ user, units: Unit[] }` |
| `POST` | `/auth/forgot-password` | `{ email }` | `202` |
| `POST` | `/auth/reset-password` | `{ token, password }` | `204` |

Detalhes de segurança e o que muda em relação à sessão falsa atual:
[`src/lib/auth/README.md`](../src/lib/auth/README.md).

---

## 2. Empresa, unidades e recursos — `companyRepository`

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/companies/current` | Empresa do token. |
| `GET` | `/companies/by-slug/:slug` | **Público.** Alimenta a página `/[slug]`. |
| `PATCH` | `/companies/:id` | Nome, segmento, logo. |
| `GET` | `/units?companyId=` | Unidades da empresa. |
| `GET` | `/units/:id` | Unidade com `businessHours[]`. |
| `POST` | `/units` | Cria unidade. |
| `PATCH` | `/units/:id` | Dados e horário de funcionamento. |
| `GET` | `/rooms?unitId=` | Salas, cadeiras e equipamentos. |
| `POST` | `/rooms` | Cria recurso. |
| `DELETE` | `/rooms/:id` | Remove recurso. |
| `GET` | `/holidays?unitId=` | Feriados e fechamentos. |
| `POST` | `/holidays` | `{ unitId, date, name }` |
| `DELETE` | `/holidays/:id` | Remove feriado. |
| `GET` | `/settings` | Políticas, regras, permissões e aparência. |
| `PATCH` | `/settings` | Atualização parcial. |
| `GET` | `/users` | Usuários da empresa. |

**Público sem token:** apenas `GET /companies/by-slug/:slug` e as leituras que
a vitrine precisa (serviços ativos, profissionais ativos, avaliações,
horários). Tudo o mais exige autenticação.

---

## 3. Clientes — `clientRepository`

| Método | Rota | Query / corpo |
| --- | --- | --- |
| `GET` | `/clients` | `unitId`, `search`, `segment`, `tag`, paginação |
| `GET` | `/clients/:id` | — |
| `GET` | `/clients/by-user/:userId` | Resolve o cliente logado. |
| `POST` | `/clients` | `CreateClientDto` |
| `PATCH` | `/clients/:id` | `UpdateClientDto` |
| `DELETE` | `/clients/:id` | — |
| `GET` | `/clients/:id/packages` | Pacotes contratados. |
| `POST` | `/clients/:id/packages` | Compra de pacote. |
| `POST` | `/client-packages/:id/consume` | Debita uma sessão. |

`segment` aceita `NEW | RECURRING | INACTIVE_90 | WITH_NO_SHOW`.

**`ClientMetrics` é calculado no servidor**, não no cliente: hoje o mock varre
os agendamentos em memória; no Postgres isso vira uma view materializada ou um
`GROUP BY` com índice em `(clientId, status, startsAt)`. Devolver a métrica
pronta evita que a listagem de clientes puxe todos os agendamentos.

```ts
interface ClientMetrics {
  totalAppointments: number;
  completed: number;
  noShows: number;
  cancellations: number;
  totalSpent: number;
  averageTicket: number;
  favoriteProfessionalId: string | null;
  lastVisitAt: string | null;
  nextVisitAt: string | null;
}
```

> **LGPD.** `healthNotes`, contraindicações e fichas de evolução são dados
> pessoais sensíveis (Lei 13.709/2018, art. 5º, II). Exigem cifragem em
> repouso, base legal registrada, consentimento do titular e log de acesso por
> usuário. O endpoint que os devolve deve ser separado do `GET /clients/:id`,
> para que a listagem comum nunca trafegue esses campos.

---

## 4. Serviços e pacotes — `serviceRepository`

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` | `/services` | `unitId`, `search`, `category`, `professionalId`, `onlyActive` |
| `GET` | `/services/:id` | — |
| `POST` | `/services` | — |
| `PATCH` | `/services/:id` | — |
| `DELETE` | `/services/:id` | **Soft delete** → `active: false`. Excluir de verdade quebraria o histórico. |
| `GET` | `/packages?unitId=` | — |
| `POST` | `/packages` | — |
| `PATCH` | `/packages/:id` | — |

O vínculo serviço ↔ profissional é uma tabela de junção; o servidor mantém os
dois lados coerentes em uma transação, como o mock já faz.

Em um combo, `durationMinutes` é **derivado** da soma dos itens. O servidor
recalcula no `POST`/`PATCH` em vez de confiar no valor enviado.

---

## 5. Profissionais — `professionalRepository`

| Método | Rota |
| --- | --- |
| `GET` | `/professionals?unitId=&serviceId=&search=&onlyActive=` |
| `GET` | `/professionals/:id` |
| `GET` | `/professionals/by-user/:userId` |
| `POST` | `/professionals` |
| `PATCH` | `/professionals/:id` |
| `DELETE` | `/professionals/:id` (soft delete) |
| `POST` | `/professionals/:id/time-off` |
| `PATCH` | `/professionals/:id/time-off/:timeOffId` |
| `DELETE` | `/professionals/:id/time-off/:timeOffId` |

---

## 6. Agenda e agendamentos — `appointmentRepository`

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` | `/appointments` | `unitId`, `professionalId`, `clientId`, `serviceId`, `roomId`, `status[]`, `paymentStatus[]`, `from`, `to`, `search` |
| `GET` | `/appointments/:id` | — |
| `POST` | `/appointments` | Valida antes de gravar (ver abaixo). |
| `PATCH` | `/appointments/:id` | Também reagenda. Revalida sempre. |
| `PATCH` | `/appointments/:id/status` | `{ status, reason? }` |
| `PATCH` | `/appointments/bulk/status` | `{ ids[], status }` |
| `POST` | `/appointments/validate` | Pré-checagem sem gravar. |
| `POST` | `/appointments/:id/payments` | `{ amount, method }` |
| `GET` | `/appointments/:id/payments` | — |
| `GET` | `/schedule-blocks?unitId=` | — |
| `POST` | `/schedule-blocks` | — |
| `DELETE` | `/schedule-blocks/:id` | — |

### Disponibilidade

| Método | Rota | Query | Resposta |
| --- | --- | --- | --- |
| `GET` | `/availability/slots` | `date`, `unitId`, `serviceId`, `professionalId`, `includeUnavailable?`, `excludeAppointmentId?`, `allowOverbooking?` | `Slot[]` |
| `GET` | `/availability/first-available` | `date`, `unitId`, `serviceId` | `{ professionalId, slot } \| null` |
| `GET` | `/availability/days` | `unitId`, `serviceId`, `professionalId?`, `from`, `days` | `string[]` (`yyyy-MM-dd`) |

```ts
interface Slot {
  startsAt: string;
  endsAt: string;      // já inclui o buffer do serviço
  available: boolean;
  reason?: SlotBlockReason;
  roomId?: string;     // sala atribuída automaticamente
}
```

> **A função `getAvailableSlots` de `src/lib/scheduling/availability.ts` é
> portável como está.** Ela é pura, não importa nada de React e recebe tudo
> por parâmetro, inclusive o "agora". No NestJS ela vira o corpo do
> `AvailabilityService`, e os testes em `availability.test.ts` migram junto
> sem reescrita. Duplicar essa lógica em duas linguagens seria a forma mais
> fácil de a agenda do cliente discordar da agenda da recepção.

### Concorrência

O mock é monousuário, então basta validar. O servidor precisa de mais:

1. `POST /appointments` roda dentro de uma transação `SERIALIZABLE`;
2. um índice de exclusão impede a sobreposição no nível do banco —
   é a única garantia real contra dois clientes reservando o mesmo horário
   no mesmo instante:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_professional_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'));

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_room_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (room_id IS NOT NULL
           AND status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'));
```

A validação em `validateAppointment()` continua valendo: ela produz a mensagem
legível. A constraint é a rede de segurança.

---

## 7. Financeiro — `financeRepository`

| Método | Rota | Query | Resposta |
| --- | --- | --- | --- |
| `GET` | `/finance/summary` | `unitId`, `from`, `to`, `professionalId?` | `FinanceSummary` |
| `GET` | `/finance/commissions` | idem | `CommissionSummary[]` |

```ts
interface FinanceSummary {
  received: number;
  pending: number;
  deposits: number;
  byMethod: { method: PaymentMethod; amount: number; count: number }[];
  daily: { date: string; amount: number }[];
  payments: (Payment & { clientName: string; serviceName: string })[];
  pendingAppointments: Appointment[];
}

interface CommissionSummary {
  professionalId: string;
  professionalName: string;
  commissionRate: number;
  appointments: number;
  grossRevenue: number;
  commission: number;
  lines: CommissionLine[];
}
```

A comissão é calculada sobre atendimentos **concluídos**. Quando houver
fechamento de período com trava, `CommissionSummary` ganha `closedAt` e
`closedBy`, e o cálculo passa a congelar a alíquota vigente na data do
atendimento — mudar o percentual do profissional não pode reescrever o
passado.

---

## 8. Relatórios — `reportRepository`

| Método | Rota | Resposta |
| --- | --- | --- |
| `GET` | `/reports/today?unitId=` | `DashboardToday` |
| `GET` | `/reports/revenue` | `RevenuePoint[]` |
| `GET` | `/reports/by-professional` | `NamedMetric[]` |
| `GET` | `/reports/by-service` | `NamedMetric[]` |
| `GET` | `/reports/clients` | `ClientsReport` |
| `GET` | `/reports/cancellations` | `CancellationReport` |
| `GET` | `/reports/occupancy` | `OccupancyReport` |

Todos aceitam `unitId`, `from`, `to` e `professionalId`.

A exportação CSV é feita **no cliente** (`src/lib/csv/`) e continua assim: o
servidor devolve os mesmos dados que a tela já mostra, sem um endpoint de
relatório duplicado. Se algum dia um relatório passar de alguns milhares de
linhas, aí sim vale um `GET …?format=csv` com streaming.

---

## 9. Engajamento e comunicação — `engagementRepository`

| Método | Rota |
| --- | --- |
| `GET` | `/reviews?unitId=&clientId=&professionalId=` |
| `POST` | `/reviews` |
| `GET` | `/waitlist?unitId=` |
| `POST` | `/waitlist` |
| `PATCH` | `/waitlist/:id` |
| `DELETE` | `/waitlist/:id` |
| `GET` | `/message-templates?unitId=` |
| `PATCH` | `/message-templates/:id` |
| `GET` | `/notifications?unitId=&status[]=` |
| `POST` | `/notifications/:id/resend` |
| `DELETE` | `/notifications/:id` |

### Envio real

Na demonstração a "caixa de saída" é uma lista em memória. No backend:

- criar/confirmar/cancelar um agendamento enfileira os lembretes conforme a
  régua (48h / 24h / 2h) em uma fila **BullMQ**;
- o worker renderiza o template (`src/lib/format/template.ts` é portável) e
  chama a **WhatsApp Business Cloud API**;
- o webhook de status atualiza `Notification.status` para `SENT` ou `FAILED`;
- cancelar ou reagendar o atendimento remove os jobs pendentes daquele
  `appointmentId` — senão o cliente recebe lembrete de um horário que não
  existe mais.

---

## 10. Módulos por segmento

| Método | Rota |
| --- | --- |
| `GET` | `/clients/:id/evolution` |
| `POST` | `/clients/:id/evolution` |
| `GET` | `/clients/:id/contraindications` |
| `GET` | `/clients/:id/treatment-plans` |
| `PATCH` | `/treatment-plans/:planId/steps/:stepId` |
| `GET` | `/clients/:id/quotes` |
| `PATCH` | `/quotes/:id` |

Todos exigem permissão específica e entram no log de auditoria: são os
endpoints que tocam dado sensível.

Fotos de antes/depois são placeholders hoje. No backend vão para um bucket
privado, com URL assinada de curta duração — nunca um link público.

---

## Ordem sugerida de implementação

1. `/auth` + guards + multitenancy no Prisma (destrava tudo).
2. Cadastros: unidades, salas, serviços, profissionais, clientes.
3. `AvailabilityService` (portar `src/lib/scheduling/` e seus testes) +
   `/appointments` com as constraints de exclusão.
4. Pagamentos e comissões.
5. Relatórios (com índices pensados desde o começo).
6. Fila de notificações e integração com o WhatsApp.
7. Módulos por segmento, com cifragem e auditoria.
