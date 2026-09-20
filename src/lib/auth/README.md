# Autenticação — o que é falso aqui e onde entra o JWT real

> **Aviso:** nada nesta pasta é seguro. É uma simulação de sessão para
> demonstração comercial. Não existe verificação de senha no servidor, não
> existe token assinado e qualquer pessoa com o console do navegador consegue
> se tornar ADMIN editando o `localStorage`.

## Como funciona hoje

| Peça | Arquivo | O que faz |
| --- | --- | --- |
| Credenciais | `session-store.ts` → `DEMO_CREDENTIALS` | Três pares e-mail/senha fixos em código. |
| Sessão | `session-store.ts` → `useSessionStore` | Zustand + `persist` no `localStorage` (`agendapro.session.v1`). |
| Guard por papel | `role-guard.tsx` | Componente client que redireciona conforme `user.role`. |
| Permissões | `src/lib/permissions/index.ts` | Matriz papel × recurso, lida das configurações. |

Fluxo: `/login` → `signIn(email, senha)` compara com a lista fixa → acha o
`User` correspondente no seed → grava em `localStorage` → o guard redireciona
para `ROLE_HOME[role]` (`/admin`, `/pro` ou `/app`).

### Hidratação sem flicker

O store começa com `hydrated: false`. Layouts protegidos renderizam um
skeleton enquanto `hydrated` for falso e só então decidem entre conteúdo e
redirecionamento. Sem isso, o primeiro paint mostraria a tela de login para
quem já está autenticado.

## O que muda com o backend real (NestJS + PostgreSQL + Prisma + JWT)

### 1. Login vira uma chamada HTTP

```ts
// substitui o corpo de signIn()
const res = await api.post<LoginResponse>("/auth/login", { email, password });
// res.accessToken  — JWT curto (15 min)
// res.refreshToken — enviado pelo servidor em cookie httpOnly + Secure + SameSite=Lax
```

O `POST /auth/login` do NestJS valida a senha com `argon2.verify` e assina o
access token com `@nestjs/jwt`. O payload do token carrega o mínimo:

```jsonc
{
  "sub": "<userId>",
  "role": "ADMIN",
  "companyId": "<uuid>",   // usado pelo guard de multitenancy
  "unitIds": ["<uuid>"],   // unidades que o usuário pode acessar
  "iat": 0,
  "exp": 0
}
```

### 2. O token **não** vai para o `localStorage`

O refresh token fica em cookie `httpOnly`, inacessível a JavaScript — é o que
evita roubo de sessão por XSS. O access token fica só em memória (uma variável
no módulo do cliente HTTP) e é renovado via `POST /auth/refresh` quando expira.
O `persist` do Zustand passa a guardar apenas preferências de UI (unidade
selecionada, tema), nunca credenciais.

### 3. O guard de papel deixa de ser a única barreira

`role-guard.tsx` continua existindo, mas só para UX (não mostrar uma tela que
o usuário não pode usar). A autorização de verdade passa a ser:

- **Servidor:** `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')` em
  cada controller do NestJS;
- **Borda:** `middleware.ts` do Next lendo o cookie de sessão e redirecionando
  antes de renderizar (hoje o arquivo não existe porque não há cookie para ler);
- **Dados:** todo `where` do Prisma filtrado por `companyId`/`unitId` vindos do
  token, nunca de parâmetro da requisição — é o que fecha o multitenancy.

### 4. Endpoints previstos

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/auth/login` | E-mail + senha → access token + cookie de refresh. |
| `POST` | `/auth/refresh` | Cookie de refresh → novo access token. |
| `POST` | `/auth/logout` | Revoga o refresh token e limpa o cookie. |
| `GET` | `/auth/me` | Usuário autenticado + unidades acessíveis. |
| `POST` | `/auth/forgot-password` | Envia link de redefinição. |
| `POST` | `/auth/reset-password` | Troca a senha a partir do token do e-mail. |

O contrato completo (payloads e respostas) está em [`docs/api-contract.md`](../../../docs/api-contract.md).

## Checklist para produção

- [ ] Hash de senha com argon2id (nunca MD5/SHA simples).
- [ ] Rate limit no `/auth/login` (`@nestjs/throttler`).
- [ ] Rotação de refresh token com detecção de reuso.
- [ ] 2FA opcional para o papel ADMIN.
- [ ] Log de auditoria de login e de acesso a dados sensíveis (LGPD).
- [ ] Remover `DEMO_CREDENTIALS` e o botão "Trocar de perfil" do build de produção.
