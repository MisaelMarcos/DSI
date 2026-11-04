# AGENTS.md — Guia e Protocolo Oficial para Agentes de IA

Este documento define os padrões arquiteturais, protocolos de rede, portas, comandos de inicialização e regras de implementação que **qualquer agente de IA** (Antigravity, OpenCode, Cursor, Copilot, Claude Code, etc.) deve seguir ao trabalhar no repositório **Alerta Chuva Recife (DSI)**.

---

## 1. Visão Geral da Arquitetura

O projeto é composto por três camadas integradas:

1. **App Mobile & Web (`src/app/`, `src/components/`, `src/hooks/`, `src/services/`, `src/lib/`)**
   - **Stack:** React Native `0.88.1`, Expo **SDK 58** (`~58.0.23`), Expo Router (`~58.0.30`), TypeScript estrito, Zustand e Firebase (`auth` + `firestore`).
   - **Abas principais (`src/app/tabs/`):**
     - `home.tsx`: Tela enxuta focada exclusivamente na **probabilidade de chuva nas próximas 3 horas** e na **chance agregada de alagamento** no bairro conforme a intensidade prevista da chuva.
     - `alertas.tsx`: Gerenciamento do bairro monitorado, chaves de **notificações automáticas** (chuva forte e risco de alagamento), simulador de gatilho (`trigger`) e histórico detalhado do bairro.

2. **Módulo de Machine Learning — Previsão 3h (`src/backend/ml/`)**
   - **Stack:** Python 3.12+, scikit-learn (Random Forest + KMeans), pandas, FastAPI + Uvicorn.
   - **Fontes:** Estação automática **INMET Recife (A301)** + reanálise/previsão **Open-Meteo** (com backfill automático de 48h em `collect_inmet.py` para evitar *cold start*).
   - **Alvo principal:** `3h_acum_10mm` (acumulado ≥ 10 mm em 3h), apoiado por `3h_10mm` (pico horário ≥ 10 mm) e `3h_5mm` (chuva moderada ≥ 5 mm).

3. **Pipeline de Risco Histórico por Bairro (`src/backend/pipeline/`)**
   - **Stack:** Python (`requests`, `beautifulsoup4`, Nominatim, Open-Meteo Elevation).
   - Consolida ocorrências históricas de alagamento e altitude média para os **94 bairros oficiais do Recife**, gerando `data/score_bairro.csv` e sincronizando com o Firestore.

---

## 2. Portas, Protocolos e Rede

Sempre que um agente precisar subir o ambiente completo para testes (Web e/ou Expo Go no celular), **estas são as portas e protocolos obrigatórios**:

| Serviço | Porta | Protocolo | Host / Bind | URL Local (Web/PC) | URL LAN (Celular / Expo Go) |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Expo / Metro Bundler** | `8081` | `http` / `exp` | `0.0.0.0` (`--lan`) | `http://localhost:8081` | `exp://<IP_DA_LAN>:8081` |
| **API FastAPI (ML 3h)** | `8000` | `http` | `0.0.0.0` | `http://localhost:8000` | `http://<IP_DA_LAN>:8000` |
| **Firebase (Auth/Firestore)** | `443` | `https` | Nuvem (`dsi-ufrpe-58db3`) | `https://firestore.googleapis.com` | `https://firestore.googleapis.com` |

### Regras de Rede para Agentes
1. **Sempre usar `--host 0.0.0.0` (FastAPI) e `--lan` (Expo):** Se o servidor for iniciado apenas em `127.0.0.1`, o celular conectado via Expo Go na mesma rede Wi-Fi **não** conseguirá acessar nem o bundle nem a API de previsão.
2. **Descoberta automática de IP no App (`src/services/previsao.ts`):**
   - Na Web, o app consulta `http://localhost:8000` (ou `EXPO_PUBLIC_ML_API_URL` se definida).
   - No celular (Expo Go), o app extrai automaticamente o IP da máquina host via `Constants.expoConfig?.hostUri` e consulta `http://<IP_DA_LAN>:8000`.
3. **Fallback resiliente obrigatório:**
   - A leitura principal da previsão vem de `/previsoes/atual` no Firestore; se não houver documento ou falhar, faz fallback para `GET /prever/atual` na porta `8000`.
   - A simulação de gatilho (`POST /prever/simular`) tenta a API na porta `8000` e possui **fallback automático em memória** em `src/services/previsao.ts` caso o firewall do Windows bloqueie a porta `8000` na rede Wi-Fi.
4. **Execução fora de Sandbox para servidores locais:**
   - Em ambientes com sandbox de terminal (como Antigravity), servidores que precisam ser acessados pelo navegador do usuário ou pelo celular via Wi-Fi (`8081` e `8000`) devem ser iniciados fora do sandbox (`BypassSandbox: true`).

---

## 3. Como Subir o Projeto (Passo a Passo)

### 3.1. Subir a API de Machine Learning (Porta `8000`)

Na raiz do repositório (PowerShell):

```powershell
# 1. Criar venv e instalar dependências (apenas na primeira vez)
Push-Location src/backend/ml
py -m venv .venv
.\.venv\Scripts\pip.exe install -r requirements.txt
Pop-Location

# 2. (Opcional) Coletar últimas 48h do INMET/Open-Meteo e gerar previsão inicial
src\backend\ml\.venv\Scripts\python.exe src\backend\ml\collect_inmet.py
src\backend\ml\.venv\Scripts\python.exe src\backend\ml\predict.py --saida src\backend\ml\outputs\previsao.json

# 3. Subir o servidor FastAPI escutando em todas as interfaces na porta 8000
src\backend\ml\.venv\Scripts\python.exe -m uvicorn api:app --app-dir src/backend/ml --host 0.0.0.0 --port 8000
```

**Endpoints disponíveis na porta `8000`:**
- `GET /health` — Status dos 7 modelos carregados.
- `GET /modelos` — Metadados, limiares e métricas de validação.
- `GET /prever/atual?coletar=false` — Retorna a previsão de 3h a partir de `dados/clima/observacoes_inmet_a301.csv` (faz backfill automático se houver `< 24` horas).
- `POST /prever/simular` — Ativa ou restaura cenários de teste (`{"cenario": "real" | "monitoramento" | "chuva_forte"}`).
- `POST /prever` e `POST /prever/todos` — Inferência direta recebendo vetor de features.

---

### 3.2. Subir o Aplicativo Expo — Web + Expo Go (Porta `8081`)

O aplicativo utiliza **Expo SDK 58** para compatibilidade com a versão atual do aplicativo **Expo Go** nos celulares Android/iOS.

```powershell
# 1. Instalar dependências (usar --legacy-peer-deps se houver conflito de peerDeps do React 19.3)
npm install --legacy-peer-deps

# 2. Iniciar o Metro Bundler em modo LAN na porta 8081 (serve Web e Expo Go simultaneamente)
npx expo start --lan --port 8081
```

- **Se o Expo Go apresentar erro de cache ou `Requiring unknown module`:**
  Sempre reinicie o Metro limpando o cache:
  ```powershell
  npx expo start --lan --clear --port 8081
  ```
- **Acesso Web:** Abra `http://localhost:8081` no navegador.
- **Acesso Mobile:** Escaneie o QR Code (`exp://<IP_DA_LAN>:8081`) no app **Expo Go** (SDK 58).

---

### 3.3. Subir via Docker Compose (Alternativa Containerizada)

```powershell
# Sobe apenas o Expo (porta 8081) detectando o IP da máquina automaticamente
npm run docker

# Limpa caches do Metro, recria volumes e sobe do zero
npm run docker:fresh

# Para subir o Expo (8081) + API de ML (8000) juntos via Docker Compose:
docker compose --profile ml up --build
```

---

### 3.4. Sincronizar Dados com o Firestore (Admin REST)

As coleções `/bairros`, `/scores` e `/previsoes` são **somente leitura** para o cliente (`firestore.rules`). A escrita é feita via scripts Node usando Service Account (nunca commitar o arquivo `.json` de credenciais):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\.secrets\dsi-ufrpe-58db3-admin.json"

# Sincronizar os 94 bairros e scores de risco (src/backend/pipeline/data/score_bairro.csv)
npm run sync:firebase          # dry-run
npm run sync:firebase:apply    # grava em /bairros/{slug} e /scores/{slug}

# Sincronizar a previsão de 3h atual (src/backend/ml/outputs/previsao.json)
npm run sync:previsao          # dry-run
npm run sync:previsao:apply    # grava em /previsoes/atual
```

---

## 4. Padrões de Código e Regras Críticas (Obrigatório para IAs)

### 4.1. React Native `0.88` / JSX Estrito (Proibido Texto Solto em `<View>`)
No React Native `0.88` + React `19.3` (SDK 58), **qualquer string vazia `""` ou número `0` renderizado diretamente dentro de `<View>` causa crash imediato**:
> `Unexpected text node: . A text node cannot be a child of a <View>.`

- **PROIBIDO:**
  ```tsx
  {bairro && <View>...</View>}
  {previsao.geradoEm && <Text>...</Text>}
  ```
- **OBRIGATÓRIO:** Use sempre `Boolean(...)` ou operador ternário retornando `null`:
  ```tsx
  {Boolean(bairro) && <View>...</View>}
  {previsao.geradoEm ? <Text>...</Text> : null}
  ```

### 4.2. Sincronização Instantânea entre Abas (Zustand + Firestore)
- O bairro do usuário **nunca** deve ser gerenciado por `useState` isolado em cada tela.
- Sempre utilize o hook compartilhado [`useBairroUsuario`](src/hooks/useBairroUsuario.ts), que usa Zustand (`useBairroStore`) + `AsyncStorage` + `onSnapshot` no Firestore (`users/{uid}`). Quando o usuário troca de bairro na `Home` ou em `Alertas`, ambas as abas atualizam instantaneamente.
- Da mesma forma, a previsão de 3h é compartilhada via [`usePrevisaoChuva`](src/hooks/usePrevisaoChuva.ts) (`usePrevisaoStore`).

### 4.3. Sistema de Notificações e Gatilhos (`Triggers`)
- Toda a lógica de notificações está centralizada em [`src/services/notificacoes.ts`](src/services/notificacoes.ts) e [`src/hooks/useNotificacoesAlerta.ts`](src/hooks/useNotificacoesAlerta.ts).
- **Ponto único de disparo:** Apenas o hook `useMonitorGatilhoAlertas()` (montado em [`src/app/tabs/_layout.tsx`](src/app/tabs/_layout.tsx)) deve disparar notificações ao detectar mudança de previsão ou simulação. **Nunca** adicione chamadas duplicadas de `dispararNotificacaoDispositivo` dentro de botões de UI para evitar notificações repetidas.
- **Formato das mensagens de notificação (Regra de UX):**
  - As mensagens devem ser **curtas, diretas e de leitura rápida**.
  - **O único número permitido no texto da notificação é a porcentagem (`%`) da ação** (sem números de horas como `3h`/`1h` e sem milímetros como `10 mm`).
  - Exemplos padrão:
    - **Chuva:** Título `"Chuva forte prevista"` | Corpo `"78% de chance de chuva forte nas próximas horas."`
    - **Alagamento:** Título `"Risco de alagamento em Boa Viagem"` | Corpo `"95% de chance de alagar com a chuva prevista. Evite áreas baixas."`

### 4.4. Diretrizes de UI / Usabilidade (Sem "Cara de IA")
- **Home enxuta (`src/app/tabs/home.tsx`):** Deve exibir apenas o seletor rápido de bairro no topo, o card principal com a **probabilidade de chuva nas próximas horas** e o card agregado com a **chance de alagar no bairro** baseada na intensidade da chuva.
- **Visual limpo e humano:**
  - Evitar excesso de badges em caixa alta, gradientes artificiais, emojis soltos ou textos robóticos longos.
  - Usar tipografia clara, hierarquia direta (percentual em destaque + explicação curta em português natural) e paleta sóbria (`#F8FAFC` fundo, `#FFFFFF` cards, `#0F172A` títulos, `#2563EB` primária, `#DC2626` crítico, `#D97706` atenção, `#16A34A` estável).
- **Seleção de Bairro:** Sempre utilizar o componente [`SeletorBairroModal`](src/components/seletor-bairro-modal.tsx) (bottom-sheet com busca instantânea sem acentos para os 94 bairros).

### 4.5. Segurança e Regras do Firestore (`firestore.rules`)
- O cliente autenticado só pode escrever no próprio documento `users/{uid}` (sem jamais incluir campos `password`, `senha` ou `passwordHash`).
- As coleções `/bairros/{id}`, `/scores/{id}`, `/previsoes/{id}`, `/alertas/{id}` e `/ocorrencias/{id}` têm `allow write: if false;` no cliente. Não tente gravar nelas a partir do código React Native.

---

## 5. Checklist de Verificação Antes de Finalizar Qualquer Tarefa

Todo agente de IA **deve** executar estas validações antes de concluir uma alteração:

1. **Checagem de Tipos TypeScript (Zero erros):**
   ```powershell
   npx tsc --noEmit
   ```
2. **Testes Automatizados da API de ML (se alterar `src/backend/ml/`):**
   ```powershell
   Push-Location src/backend/ml
   .\.venv\Scripts\python.exe -m pytest -q
   Pop-Location
   ```
3. **Verificação de Servidores Ativos:**
   - Se o usuário estiver testando o app, confirmar que o Metro (`8081`) e o FastAPI (`8000`) estão ativos e respondendo.
