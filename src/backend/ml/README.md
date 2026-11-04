# Previsão de chuva — Recife (INMET A301 + Open-Meteo)

MVP de previsão de chuva com 2–3 horas de antecedência para Recife/PE.
O alvo de chuva vem do INMET A301; o Open-Meteo entra como fonte de features
atmosféricas. O módulo entrega:

- treino e avaliação temporal dos classificadores;
- KMeans como etapa de agrupamento meteorológico, comparado com/sem cluster;
- artefatos `.joblib` + `metadata.json`;
- CLI de previsão (`predict.py`);
- coletor horário do INMET com fallback Open-Meteo (`collect_inmet.py`);
- API FastAPI (`POST /prever`, `POST /prever/todos`, `GET /health`,
  `GET /modelos`).

O app ainda **não** consome essa API. A integração com o Firestore e o score
do bairro é a próxima fase; as regras `firestore.rules` permanecem inalteradas.

## Dados

- `dados/clima/recife_inmet_2019_2020.csv`: chuva observada e variáveis do
  INMET A301, 17.544 horas (2019–2020). Fonte dos alvos.
- `dados/clima/open_meteo_recife_2019_2020.csv`: nuvens, radiação, vento,
  camada limite e variáveis de superfície do Open-Meteo (CC BY 4.0).
- `dados/clima/observacoes_inmet_a301.csv`: buffer local gerado pelo coletor,
  ignorado pelo Git.

Detalhes de origem, encoding e licenças em `dados/clima/README.md`.

## Alvos

O modelo é treinado como classificações binárias independentes:

| Nome | Horizonte | Definição |
|---|---:|---|
| `2h_5mm` | 2h | máxima horária futura ≥ 5 mm/h |
| `2h_10mm` | 2h | máxima horária futura ≥ 10 mm/h |
| `3h_5mm` | 3h | máxima horária futura ≥ 5 mm/h |
| `3h_10mm` | 3h | máxima horária futura ≥ 10 mm/h |
| `2h_acum_10mm` | 2h | acumulado futuro ≥ 10 mm |
| `3h_acum_10mm` | 3h | acumulado futuro ≥ 10 mm |
| `3h_acum_20mm` | 3h | acumulado futuro ≥ 20 mm |

O alvo principal operacional é **`3h_acum_10mm`** (chuva significativa em
3h). O alvo `3h_10mm` é usado como confirmação de intensidade (chuva forte).
Os alvos de máximo horário atendem diretamente ao requisito de 5/10 mm/h;
os acumulados melhoram a previsibilidade e a leitura operacional.

## Features

Features do INMET (sem olhar o futuro):

- chuva atual, acumulados de 3/6/12/24h, máximos de 3/6h e lags de
  1/3/6/12/24h;
- pressão e variações de 1/3/6h;
- temperatura, ponto de orvalho, depressão do orvalho e variação de 3h;
- umidade e variações de 1/3h;
- hora, mês, seno/cosseno de hora e mês, estação chuvosa.

Features do Open-Meteo:

- vento, direção (seno/cosseno), rajada, cobertura de nuvens
  (total/baixa/média/alta), radiação e lag de radiação, camada limite;
- variações de nuvem/radiação em 3h, precipitação atual do Open-Meteo e
  acumulado de 3h.

Os alvos são construídos com `shift(-1)` até `shift(-h)`, com
`skipna=False`; linhas sem todas as horas futuras viram `NaN` e são
descartadas no treino. As features nunca usam valores futuros.

## KMeans

- `StandardScaler` + `KMeans` com `k` de 2 a 6 escolhido por silhouette
  (amostra de até 4.000 linhas).
- O KMeans é ajustado apenas no treino de 2019 na comparação com/sem cluster.
- O one-hot do cluster entra como feature adicional.
- Em produção, o KMeans é reajustado com 2019+2020 no alvo que o utiliza.
- Resultado: melhora os alvos de intensidade e é usado em 5 dos 7 alvos;
  não melhora os acumulados de 10/20 mm.

## Validação e limiares

- Validação temporal dentro de 2019 com `TimeSeriesSplit(n_splits=4,
  gap=3)`, para evitar que o futuro do alvo vaze no treino.
- Holdout temporal: treina em 2019, avalia em 2020.
- Métricas: PR-AUC, ROC-AUC, precisão, recall, F1, matriz de confusão e
  avaliação por evento (alerta antes do início, com 2h/3h de antecedência).
- Dois limiares por alvo:
  - **atenção**: prioriza recall ≥ 0,80 (mais avisos, mais falsos positivos);
  - **forte**: maximiza F1 (menos avisos, mais precisão).
- Na saída, `monitoramento=true` significa acima da atenção; `alerta=true`
  significa acima do forte.

Resultados completos em `docs/ml-resultados.md`.

## Instalação

Pré-requisitos: Python 3.11+ (testado com 3.14) e, para o coletor, internet.

```powershell
cd src/backend/ml
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Treino

```powershell
python train.py
```

O treino lê os dois CSVs de `dados/clima/`, gera:

- `models/modelo_<alvo>.joblib`;
- `models/metadata.json`;
- `outputs/metricas.json` e `outputs/metricas.md`.

`models/` e `outputs/` são ignorados pelo Git; o treino é reproduzível a
partir dos CSVs versionados.

Para um teste rápido:

```powershell
python train.py --alvos 3h_acum_10mm --quick
```

Para regenerar as features do Open-Meteo:

```powershell
python baixar_open_meteo.py
```

## Coleta ao vivo

O coletor busca sempre as features do Open-Meteo e a observação do INMET.
Se o INMET falhar, usa o Open-Meteo como fallback da observação.

```powershell
python collect_inmet.py
python collect_inmet.py --loop --interval 600
```

O CSV ao vivo é `dados/clima/observacoes_inmet_a301.csv`. O `predict.py`
exige pelo menos 24 linhas horárias para calcular lags/acumulados com
estabilidade.

## Previsão por CLI

```powershell
python predict.py
python predict.py --csv dados/clima/observacoes_inmet_a301.csv
python predict.py --saida outputs/previsao.json
```

A saída JSON contém `observacao`, `previsao_principal`,
`previsao_intensidade`, `previsoes` (todos os alvos) e `recomendacao`.

## API

```powershell
python -m uvicorn api:app --host 0.0.0.0 --port 8000
```

Endpoints:

- `GET /health`: status e quantidade de modelos carregados.
- `GET /modelos`: versão, fontes, thresholds e métricas do holdout.
- `POST /prever`: um alvo.
- `POST /prever/todos`: todos os alvos com o mesmo vetor de features.

Exemplo de corpo para `POST /prever`:

```json
{
  "features": {
    "chuva_1h": 0.0,
    "chuva_3h": 0.0,
    "chuva_6h": 0.0,
    "chuva_12h": 0.0,
    "chuva_24h": 0.0,
    "chuva_max_3h": 0.0,
    "chuva_max_6h": 0.0,
    "chuva_lag_1h": 0.0,
    "chuva_lag_3h": 0.0,
    "chuva_lag_6h": 0.0,
    "chuva_lag_12h": 0.0,
    "chuva_lag_24h": 0.0,
    "pressao_mb": 1013.0,
    "pressao_delta_1h": 0.0,
    "pressao_delta_3h": 0.0,
    "pressao_delta_6h": 0.0,
    "temp_c": 28.0,
    "temp_orvalho_c": 22.0,
    "orvalho_depressao": 6.0,
    "temp_delta_3h": 0.0,
    "umid_pct": 75.0,
    "umid_delta_1h": 0.0,
    "umid_delta_3h": 0.0,
    "hora": 15,
    "mes": 6,
    "hora_sin": -0.707,
    "hora_cos": 0.707,
    "mes_sin": 1.0,
    "mes_cos": 0.0,
    "estacao_chuvosa": 1,
    "om_wind": 4.0,
    "om_wind_dir_sin": 0.0,
    "om_wind_dir_cos": 1.0,
    "om_gust": 8.0,
    "om_cloud": 60.0,
    "om_cloud_low": 20.0,
    "om_cloud_mid": 30.0,
    "om_cloud_high": 10.0,
    "om_rad": 400.0,
    "om_rad_lag_1h": 420.0,
    "om_blh": 800.0,
    "om_cloud_delta_3h": 10.0,
    "om_rad_delta_3h": -20.0,
    "om_precip": 0.0,
    "om_precip_3h": 0.0
  },
  "horizonte": 3,
  "limiar": 10,
  "tipo": "acum"
}
```

Resposta resumida:

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

`tipo="max"` consulta os alvos de máximo horário; `tipo="acum"` consulta os
acumulados. O default é `horizonte=3`, `limiar=10`, `tipo="acum"`.

## Testes

```powershell
python -m pytest -q
```

Os testes de API são pulados se `models/metadata.json` não existir (rode
`train.py` antes).

## Estrutura

```text
src/backend/ml/
├── config.py             # caminhos, fontes, alvos, versão
├── data.py               # leitura/limpeza do INMET e do CSV ao vivo
├── features.py           # features, alvos e merge com Open-Meteo
├── metrics.py            # métricas, limiares e avaliação por evento
├── modeling.py           # KMeans, Random Forest, validação temporal
├── train.py              # orquestra treino/comparação e salva artefatos
├── predict.py            # inferência via CLI
├── collect_inmet.py      # coletor INMET + features Open-Meteo
├── baixar_open_meteo.py  # regenera o CSV histórico do Open-Meteo
├── api.py                # FastAPI
├── requirements.txt
└── tests/
```

## Limitações

- Apenas 2019–2020 e uma estação (A301). Eventos de chuva forte são raros.
- A precisão no limiar de atenção é baixa; o nível forte é mais preciso,
  porém cobre menos eventos. Os dois níveis são expostos separadamente.
- O Open-Meteo é usado como feature e fallback; a chuva observada continua
  sendo a do INMET. O plano gratuito do Open-Meteo é não comercial.
- Não há radar/satélite nem previsão numérica de curto prazo com lead time
  arquivado; o modelo aprende principalmente com persistência e contexto
  atmosférico.
- O coletor precisa rodar continuamente para manter o buffer de 24h.
- A integração com o app/Firestore ainda não foi feita; a API está pronta
  para ser consumida.
- Os modelos `.joblib` não são versionados; rode `train.py` após clonar.
