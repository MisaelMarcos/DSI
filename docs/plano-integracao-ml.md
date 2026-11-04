# Plano — integração do modelo de chuva com o app

## Status

O modelo de chuva (`src/backend/ml/`) e sua integração com o pipeline de
bairros (`src/backend/pipeline/`), Firestore (`/previsoes/atual`) e telas do
aplicativo (`Home` e `Alertas`) estão implementados.

## Arquitetura

- **Modelo (`src/backend/ml/`)**: lê INMET A301 + features Open-Meteo, treina
  classificadores Random Forest com KMeans (`k=3`), salva artefatos e expõe
  CLI (`predict.py`) e API FastAPI (`api.py`).
- **Coletor (`collect_inmet.py`)**: busca a série horária recente do INMET A301
  e do Open-Meteo (com backfill automático das últimas 48h quando o buffer
  local tem menos de 24h), garantindo que `predict.py` funcione já na primeira
  execução.
- **API (`http://localhost:8000`)**: `GET /prever/atual`, `POST /prever`,
  `POST /prever/todos`, `GET /health` e `GET /modelos`.
- **Pipeline de decisão por bairro (`src/backend/pipeline/`)**:
  - `consultar_previsao.py`: consulta a API (`ML_API_URL`) com timeout e
    fallback automático para `outputs/previsao.json` ou inferência local.
  - `verificar_alerta.py`: cruza a previsão de 3h com o `score_risco` de
    `data/score_bairro.csv` (por nome de bairro, coordenadas ou endereço via
    Nominatim + centróide mais próximo em `data/bairros_geo.csv`).
- **Firestore e App (`scripts/sync-previsao.mjs`, `src/services/previsao.ts`)**:
  - Publica a previsão em `/previsoes/atual` via Admin REST (mantendo
    `firestore.rules` somente leitura no cliente).
  - As telas `Home` e `Alertas` leem `/previsoes/atual` (com fallback para
    `EXPO_PUBLIC_ML_API_URL` em desenvolvimento) e exibem a decisão combinada
    (`combinarPrevisaoERisco`).

## O que o modelo responde

`POST /prever` recebe um vetor de features meteorológicas e devolve, para um
alvo:

```json
{
  "alvo": "3h_acum_10mm",
  "probabilidade": 0.12,
  "alerta": false,
  "monitoramento": true,
  "nivel": "atencao",
  "horizonte_h": 3,
  "limiar_mm": 10,
  "limiar_probabilidade": 0.011,
  "limiar_forte": 0.128
}
```

- `monitoramento=true`: passou do limiar de atenção (recall ≥ 0,80).
- `alerta=true`: passou do limiar forte (F1 máximo).
- `GET /prever/atual` lê o buffer de 24h (`observacoes_inmet_a301.csv`),
  calcula as 45 features e retorna todos os alvos e a recomendação.

## Regra de decisão implementada

| Chuva prevista (ML 3h) | Risco do bairro | Decisão (`codigo`) |
|---|---|---|
| `alerta` (forte) | `alto` | `alerta_alagamento` (ALERTA de alagamento) |
| `alerta` (forte) | `medio` | `atencao` (ATENÇÃO nas próximas 3h) |
| `alerta` (forte) | `baixo` / `sem_historico` | `aviso_chuva` (Aviso de chuva forte) |
| `monitoramento` (atenção) | `alto` | `atencao` (ATENÇÃO nas próximas 3h) |
| `monitoramento` (atenção) | `medio` / `baixo` / `sem_historico` | `monitorar` (Monitoramento 3h) |
| `sem_alerta` | qualquer | `sem_alerta` (Estável nas próximas 3h) |
| `sem_previsao` | qualquer | `sem_previsao` (Exibe apenas risco histórico) |

Bairros sem histórico continuam `sem_historico`; o sistema não inventa risco
histórico.

## Execução de ponta a ponta

```powershell
# 1. Coletar observações (preenche 48h automaticamente) e gerar previsão de 3h
src\backend\ml\.venv\Scripts\python.exe src\backend\ml\collect_inmet.py
src\backend\ml\.venv\Scripts\python.exe src\backend\ml\predict.py --saida src\backend\ml\outputs\previsao.json

# 2. Verificar alerta combinado para um bairro (ou --todos)
src\backend\ml\.venv\Scripts\python.exe src\backend\pipeline\verificar_alerta.py --bairro "Boa Viagem"

# 3. Sincronizar previsão de 3h com o Firestore (/previsoes/atual)
node scripts/sync-previsao.mjs            # dry-run
node scripts/sync-previsao.mjs --apply    # grava com GOOGLE_APPLICATION_CREDENTIALS
```
