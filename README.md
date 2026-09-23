# AgendaPro

SaaS de agendamento para **clínicas de estética e bem-estar**.

Este repositório contém o **frontend de um MVP navegável**: um produto
completo de ponta a ponta, com dados fictícios que vivem no navegador e
autenticação simulada. Serve para demonstrar o sistema a um cliente e, ao
mesmo tempo, para especificar o backend que virá depois.

A demonstração é encenada na **Clínica Lumière**, uma clínica fictícia de
estética em Curitiba com duas unidades, seis profissionais e um catálogo de
estética facial, estética corporal e bem-estar. O modelo de dados continua
multi-segmento (o campo `segment` da empresa aceita também odontologia,
salão e barbearia); o que mudou foi o recorte da demonstração.

---

## Como rodar

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. A raiz é a **página de apresentação**, de onde
se escolhe entre área do cliente, do profissional e do desenvolvedor.
Nenhuma variável de ambiente, nenhum banco, nenhuma chave de API — a base de
demonstração é gerada no primeiro acesso e guardada no `localStorage`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gera também o service worker) |
| `npm start` | Sobe o build |
| `npm test` | 62 testes do motor de agendamento (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Requer Node 20 ou superior.

---

## Credenciais da demonstração

Senha igual para os três: **`demo123`**

| Perfil | E-mail | Quem é | Cai em |
| --- | --- | --- | --- |
| Administrador | `admin@demo.com` | Marina Alves, dona da Clínica Lumière | `/admin` |
| Profissional | `pro@demo.com` | Ana Souza, esteticista facial | `/pro` |
| Cliente | `cliente@demo.com` | Gabriel Lima | `/app` |

A tela de login também tem três botões de acesso rápido, e o menu do usuário
tem **"Trocar de perfil"** — dá para alternar entre os três sem sair. Os
cards de "Como você deseja acessar?" da página inicial levam ao login com o
perfil já preenchido (`/login?perfil=cliente`), e `?proximo=/app/agendar`
manda direto para o fluxo de agendamento depois de entrar.

Há ainda a **área do desenvolvedor** em `/dev`, sem login: status da
aplicação, contadores da base local, mapa de rotas, versões e logs derivados
dos eventos da própria base.

---

## Roteiro de demonstração em 5 minutos

> Antes de começar: no menu do usuário, **"Reiniciar dados da demo"** devolve
> tudo ao estado inicial.

### 0:00 — Entrar como administrador (30s)

Clique em **"Entrar como Administrador"**. O dashboard abre com os números do
dia e o faturamento dos últimos 30 dias comparado ao período anterior. Mostre
o seletor de unidade no topo: a mesma empresa tem duas unidades e todos os
dados respeitam esse recorte.

### 0:30 — A agenda, que é o coração do produto (1min30)

Vá em **Agenda**. Aponte:

- colunas por profissional, com a grade de cada um no cabeçalho — quem não
  atende naquele dia aparece bloqueado, com o motivo;
- alterne para **Salas**: a mesma agenda vista por cadeira, sala e
  equipamento, que é como uma clínica com laser precisa enxergar;
- **arraste um atendimento** para outro horário. Se o destino estiver
  ocupado, o sistema recusa com a razão exata — *"Ana Souza já tem
  atendimento das 10:30 às 11:30"* — e o cartão volta ao lugar;
- **clique num espaço livre**: o formulário abre já naquele profissional e
  naquele horário.

### 2:00 — Criar um agendamento (1min)

No formulário, escolha um serviço. Os horários oferecidos **não são uma
grade fixa**: saem de um cálculo que considera o expediente da unidade, a
grade e as folgas do profissional, a duração mais o buffer do serviço, a
disponibilidade da sala e os atendimentos já marcados.

Escolha um cliente com histórico de faltas e o sistema avisa que a política
da casa pede pagamento antecipado. Ligue o **Encaixe** para ver que ele
libera o horário fora do expediente — mas continua recusando sobrepor duas
pessoas na mesma cadeira.

### 3:00 — O dono olhando o negócio (45s)

**Financeiro**: recebido no período, a receber, sinais e o fechamento de
comissões — expanda um profissional para ver atendimento por atendimento.
**Relatórios**: faturamento, clientes, ocupação e no-show, filtrando por
período, unidade e profissional, com exportação CSV que abre direto no Excel.

### 3:45 — O profissional no celular (45s)

Menu do usuário → **Trocar de perfil → Profissional**. Reduza a janela para
largura de celular. A Ana vê só a agenda dela, com o próximo atendimento em
destaque e contagem regressiva. Abra um atendimento: contraindicações do
cliente, histórico, pacote em andamento e as ações rápidas — confirmar,
iniciar, concluir, registrar pagamento. Em **Produção** ela vê a própria
comissão, e nada do financeiro da empresa.

### 4:30 — O cliente agendando sozinho (30s)

**Trocar de perfil → Cliente**. O próximo horário aparece em destaque com
contagem regressiva. Toque em **Agendar horário**: serviço → profissional
(ou "primeiro disponível") → data (dias sem vaga vêm desabilitados) →
horário → resumo com sinal → confirmação.

Feche com a vitrine pública: abra `/clinica-lumiere` — a página que o
estabelecimento divulga, com serviços, preços, equipe e avaliação média.

---

## O que é simulado e o que seria real

A distinção importa: nada aqui depende de sorte de demonstração, mas também
nada aqui é produção.

### Implementado de verdade

| Peça | Onde |
| --- | --- |
| **Motor de disponibilidade** — expediente, grade, folgas, feriados, duração + buffer, sala/equipamento, conflitos, antecedência | `src/lib/scheduling/availability.ts` |
| **Validação de agendamento** — recusa sobreposição de profissional, de sala e de cliente, com erro tipado e legível | `src/lib/scheduling/validation.ts` |
| **Políticas** — cancelamento com multa por prazo, sinal por faixa de valor, regra de no-show | `src/lib/scheduling/policies.ts` |
| **Cálculos** — comissões, ocupação, retenção, ticket médio, taxas de cancelamento e falta | `src/data/repositories/` |
| **Exportação CSV** — client-side, com `;` e BOM para abrir no Excel em pt-BR | `src/lib/csv/` |
| **PWA** — manifest, ícones, service worker, instalável, telas visitadas abrem offline | `src/app/sw.ts` |

As duas primeiras têm **62 testes** (`npm test`).

### Simulado

| Peça | Como está | Como seria |
| --- | --- | --- |
| **Autenticação** | Três credenciais em código, sessão no `localStorage` | JWT do NestJS, refresh em cookie `httpOnly`. Ver [`src/lib/auth/README.md`](./src/lib/auth/README.md) |
| **Banco de dados** | Objeto em memória persistido no navegador | PostgreSQL + Prisma |
| **Acesso a dados** | Repositórios com latência artificial de 200–400ms | Os mesmos métodos, com `fetch` no corpo |
| **Multitenancy** | Modelado (todo dado tem `companyId`/`unitId`), filtrado no cliente | Filtro no Prisma a partir do token |
| **Permissões** | Matriz papel × recurso aplicada só na interface | Mesma matriz nos guards do NestJS |
| **WhatsApp** | Caixa de saída com a mensagem já renderizada | Fila BullMQ + WhatsApp Business Cloud API |
| **Pagamentos** | Lançamento manual de valor e forma | Gateway com Pix e cartão, webhook de conciliação |
| **Fotos e anexos** | Placeholders, sem upload | Bucket privado com URL assinada |

O contrato REST completo que cada repositório representa está em
[`docs/api-contract.md`](./docs/api-contract.md) — é a especificação do
backend, não uma descrição do que existe.

---

## Arquitetura

```
src/
  app/
    page.tsx                          página de apresentação (hero, serviços,
                                      "como você deseja acessar?", contato)
    (public)/login                    entrada, com perfil pré-selecionável
    (public)/dev                      painel técnico da demonstração
    (public)/[slug]                   vitrine pública do estabelecimento
    (admin)/admin/...                 dashboard, agenda, clientes, financeiro…
    (pro)/pro/...                     área do profissional
    (client)/app/...                  área do cliente
    sw.ts                             service worker (Serwist)
  components/
    site/        seções da página de apresentação
    ui/          shadcn/ui
    scheduling/  grade da agenda, formulários, detalhe do atendimento
    charts/      recharts com paleta validada para daltonismo
    layout/      shells, guards, tema
    common/      estados de loading, vazio e erro; tabela de dados
    forms/       formulários de cadastro
  data/
    seed/          base fictícia determinística
    store/         Zustand + persist
    repositories/  única porta de acesso a dados
  lib/
    scheduling/  motor de horários e políticas (puro, testado)
    auth/        sessão falsa + onde entra o JWT real
    format/      moeda, datas e templates em pt-BR
    csv/         exportação
    permissions/ matriz papel × recurso
    theme/        troca da cor primária em runtime
  types/         DTOs no formato da futura API
docs/            contrato da API e roadmap
public/images/   fotos da vitrine (Pexels, créditos em CREDITS.md)
```

### Três decisões que explicam o resto

**Nenhum componente toca no mock.** Tudo passa pelos repositórios, que já
têm a assinatura assíncrona do backend futuro. Quando a API existir, muda o
corpo dos métodos — não as telas. A latência artificial de 200–400ms está lá
de propósito: garante que os estados de carregamento sejam reais desde já.

**A regra de agendamento é uma função pura.** `getAvailableSlots()` e
`validateAppointment()` não conhecem React, não leem relógio e recebem o
"agora" por parâmetro. Por isso são testáveis, e por isso podem ser movidas
para o NestJS sem reescrita — o que evita o pior bug possível neste domínio:
a agenda do cliente discordando da agenda da recepção.

**A cor da marca é um token só.** Toda a paleta deriva de `--brand` — um
rosé profundo sobre superfícies off-white, bege e nude, com Poppins em toda
a tipografia. A tela de Aparência troca só o matiz e o croma da marca, e
botões, badges e anel de foco acompanham; a luminosidade de cada token é
fixada por modo, para o tema escuro nunca ficar ilegível. A paleta dos
gráficos é separada, com 4 cores em ordem fixa, validada para daltonismo em
claro e escuro — e todo gráfico tem alternativa em tabela, para a leitura
nunca depender só da cor.

---

## Stack

Next.js 15 (App Router) · TypeScript estrito · Tailwind CSS v4 · shadcn/ui ·
Zustand · react-hook-form + zod · date-fns (pt-BR) · recharts · dnd-kit ·
Serwist (PWA) · Vitest

---

## Acessibilidade

Navegação por teclado em toda a aplicação, foco visível consistente, rótulos
e `aria` nos diálogos e na grade da agenda, contraste AA nas superfícies,
link "pular para o conteúdo", dark mode completo e alternativa em tabela para
cada gráfico.

---

## Avisos

- **Todos os dados são fictícios.** Nomes, CPFs, telefones e endereços foram
  gerados; qualquer semelhança é coincidência.
- **Não use em produção.** Não há servidor, autenticação real nem proteção de
  dados. As credenciais estão em código, de propósito.
- **LGPD.** Campos de saúde, contraindicações e fichas de evolução são dados
  pessoais sensíveis. Estão marcados no código com o que o backend real
  precisa fazer: cifragem em repouso, base legal, consentimento e auditoria.
- **Nenhuma chamada de rede externa** em tempo de execução. As fotos da
  vitrine são arquivos locais em `public/images` (banco de imagens Pexels,
  licença livre; créditos em [`public/images/CREDITS.md`](./public/images/CREDITS.md)).
  As pessoas nas fotos são modelos de banco de imagens e não têm relação com
  os dados fictícios da demonstração.
