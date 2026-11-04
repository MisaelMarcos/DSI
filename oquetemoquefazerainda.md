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

## 2. Detecção Automática de Bairro por GPS ("Usar minha localização")

- **Situação atual:**
  - O usuário escolhe seu bairro pesquisando pelo nome entre os 94 bairros oficiais no [`SeletorBairroModal`](src/components/seletor-bairro-modal.tsx).
  - O cálculo de distância geográfica (fórmula de Haversine com os centróides dos 94 bairros) já existe no backend em [`verificar_alerta.py`](src/backend/pipeline/verificar_alerta.py), mas ainda não está no app mobile/web.
- **O que fazer:**
  - Portar a lista de coordenadas (`lat`/`lon`) dos 94 bairros para `src/data/` e criar uma função `bairroMaisProximo(lat, lon)` em `src/lib/bairros.ts`.
  - Adicionar o botão **"Usar minha localização atual"** no topo do [`SeletorBairroModal`](src/components/seletor-bairro-modal.tsx) e na tela de cadastro ([`signup.tsx`](src/app/signup.tsx)).
  - **Resultado esperado:** Com 1 toque, o app identifica o bairro onde o usuário está e já exibe a chance de chuva e alagamento local.

---

## 3. Atalhos de Bairros Favoritos na Home (Ex.: *Casa*, *Trabalho*, *UFRPE*)

- **Situação atual:**
  - O perfil guarda apenas 1 bairro ativo por vez (`users/{uid}.bairro`). Para consultar outro bairro por onde o usuário vai passar, é necessário trocar o bairro principal no modal.
- **O que fazer:**
  - Permitir salvar até **3 bairros favoritos** no perfil do usuário (`bairrosFavoritos: string[]` no Firestore e `AsyncStorage`).
  - Exibir *chips* rápidos no topo da [`home.tsx`](src/app/tabs/home.tsx) para alternar entre os bairros favoritos com 1 toque.
  - Opcionalmente, permitir que o monitor de notificações ([`useNotificacoesAlerta.ts`](src/hooks/useNotificacoesAlerta.ts)) vigie todos os bairros favoritados pelo usuário.

---

## 4. Padronização e Polimento das Telas de Login e Cadastro

- **Situação atual:**
  - A tela de cadastro ([`src/app/signup.tsx`](src/app/signup.tsx)) ainda utiliza um `Modal` antigo com `ScrollView` simples (sem barra de busca) para escolher entre os 94 bairros.
  - A tela de login ([`src/app/login.tsx`](src/app/login.tsx)) exibe um `Alert.alert("Parabéns ...! Login realizado com sucesso!")` desnecessário toda vez que o usuário entra e não possui botão de mostrar/ocultar senha (`ícone de olho`) nem indicador de carregamento (`ActivityIndicator`) no botão de entrar.
- **O que fazer:**
  - Substituir o modal antigo de [`signup.tsx`](src/app/signup.tsx) pelo componente [`SeletorBairroModal`](src/components/seletor-bairro-modal.tsx) (com busca instantânea sem acento).
  - Remover o pop-up `"Parabéns..."` do login, adicionar o botão de visualizar senha e alinhar a tipografia e cores de [`login.tsx`](src/app/login.tsx) e [`signup.tsx`](src/app/signup.tsx) com o padrão visual limpo da `Home` e de `Alertas`.

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
