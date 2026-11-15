# O Que Temos Que Fazer Ainda — Roadmap de Melhorias

Este documento reúne as próximas melhorias planejadas para o **Alerta Chuva Recife (DSI)**, organizadas por prioridade de experiência do usuário (UX), funcionalidades em tempo real e acabamento técnico.

---

## 1. Atualização Automática da Previsão em Tempo Real (Background / Live Sync)

- **Situação atual:**
  - O hook [`usePrevisaoChuva.ts`](src/hooks/usePrevisaoChuva.ts) consulta a previsão de 3h quando o aplicativo abre ou quando o usuário puxa a tela para atualizar (*pull-to-refresh*).
- **O que fazer:**
  - Adicionar um listener em tempo real (`onSnapshot`) no documento `/previsoes/atual` do Firestore em [`src/services/previsao.ts`](src/services/previsao.ts).
  - Adicionar um *polling* periódico leve (ex.: a cada 5 minutos) na API FastAPI (`GET /prever/atual`) enquanto o app estiver ativo.
  - **Resultado esperado:** Quando o modelo detectar chuva forte, o card da **Home** atualizará sozinho e o gatilho de notificação disparará automaticamente sem que o usuário precise tocar na tela.

---

## 2. Detecção Automática de Bairro por GPS ("Usar minha localização") — ✅ Implementado

> Implementado em `src/data/bairros-coordenadas.ts`, `bairroMaisProximo` em `src/lib/bairros.ts`, `src/hooks/useLocalizacaoBairro.ts` e `src/components/botao-localizacao.tsx` (usado no `SeletorBairroModal` e em `signup.tsx`). Rodar `python src/backend/pipeline/gerar_coordenadas_bairros.py` para regenerar as coordenadas.

---

## 3. Atalhos de Bairros Favoritos na Home (Ex.: *Casa*, *Trabalho*, *UFRPE*) — ✅ Implementado

> Implementado em `src/lib/favoritos.ts` (limite e regras), `useBairroUsuario.ts` (`favoritos` + `alternarBairroFavorito`, persistidos em `users/{uid}.bairrosFavoritos` e `@AlertaChuva:{uid}:favoritos`), `src/components/chips-favoritos.tsx` (chips na Home) e `useMonitorGatilhoAlertas` (vigia os favoritos quando o alerta de alagamento está ligado). Regras publicadas no firestore.

---

## 4. Padronização e Polimento das Telas de Login e Cadastro — ✅ Implementado

> - `signup.tsx` usa o `SeletorBairroModal`; o modal antigo não existe mais.
> - Mensagens aparecem dentro da tela com `src/components/mensagem-inline.tsx` (`erro`, `aviso`, `info`), em `login.tsx`, `signup.tsx` e `tabs/alertas.tsx`. O pop-up "Parabéns..." foi removido: ao logar, o guard de `_layout.tsx` leva direto para `/tabs/home`.
> - `InputSenha` (`src/components/input.tsx`) traz o ícone de olho para mostrar/ocultar a senha em login e cadastro.
> - `Button` ganhou a prop `loading` (`ActivityIndicator` + toque bloqueado); login e cadastro usam o mesmo botão.
> - Tipografia e cores de login/cadastro seguem Home e Alertas (`#0F172A` títulos, `#64748B` apoio, `#E2E8F0` bordas, `#2563EB` primária, raio 12).
> - Erros de login são traduzidos por `getFriendlyLoginErrorMessage` em `src/lib/firebase-errors.ts`.

---

## 5. Navegação Inteligente ao Tocar na Notificação

- **Situação atual:**
  - As notificações locais de chuva forte e risco de alagamento já são disparadas no celular (Expo Go / Android / iOS) e Web com texto curto focado na porcentagem (`%`), mas tocar no banner apenas traz o app para frente.
- **O que fazer:**
  - Registrar `Notifications.addNotificationResponseReceivedListener` em [`src/services/notificacoes.ts`](src/services/notificacoes.ts) / [`src/app/tabs/_layout.tsx`](src/app/tabs/_layout.tsx).
  - Ao tocar na notificação recebida, redirecionar automaticamente para `/tabs/home` (ou `/tabs/alertas`) e forçar a atualização imediata dos dados (`recarregar()`).

---

## 6. Automação da Sincronização da Previsão na Nuvem (Cron / GitHub Actions)

- **Situação atual:**
  - A coleta do INMET/Open-Meteo (`collect_inmet.py`), geração da previsão (`predict.py`) e publicação no Firestore (`npm run sync:previsao:apply`) rodam sob demanda ou via servidor local na porta `8000`.
- **O que fazer:**
  - Criar um workflow agendado (`.github/workflows/atualizar-previsao.yml` com `cron: '0 * * * *'` a cada 1 hora) ou job containerizado que execute a coleta + inferência e grave automaticamente em `/previsoes/atual` no Firestore usando a Service Account configurada nos *Secrets* do repositório.
  - **Resultado esperado:** Mesmo com o computador local desligado, qualquer celular abrirá o app com a previsão das próximas 3 horas sempre atualizada na nuvem.
