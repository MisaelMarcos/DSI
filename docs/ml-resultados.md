# Resultados do modelo de chuva — Recife

Gerado em: 2026-11-03  
Fonte dos alvos: INMET A301 (Recife)  
Features: INMET + Open-Meteo  
Período: 2019–2020

## Comparação KMeans (validação temporal em 2019)

- k escolhido: **3**
- silhouette: **0,280**
- O KMeans foi comparado com e sem cluster em cada alvo. Ele melhorou os
  modelos de intensidade (2h/3h, 5/10 mm/h) e foi usado em 5 dos 7 alvos.
  Nos alvos de volume acumulado (3h_acum_10mm e 3h_acum_20mm) o cluster não
  melhorou o PR-AUC e foi descartado.

## Métricas por alvo

| Alvo | KMeans | PR-AUC OOF | Limiar atenção | P | R | F1 | Limiar forte | P forte | R forte | Eventos (2020) | 2h antes | 3h antes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2h_5mm | sim | 0,131 | 0,019 | 0,051 | 0,715 | 0,095 | 0,126 | 0,253 | 0,315 | 32/52 | 27 | 0 |
| 2h_10mm | sim | 0,067 | 0,001 | 0,011 | 1,000 | 0,021 | 0,087 | 0,088 | 0,143 | 20/20 | 20 | 0 |
| 3h_5mm | sim | 0,129 | 0,024 | 0,063 | 0,698 | 0,115 | 0,120 | 0,160 | 0,330 | 32/50 | 28 | 25 |
| 3h_10mm | sim | 0,086 | 0,003 | 0,020 | 0,855 | 0,039 | 0,108 | 0,167 | 0,210 | 16/19 | 15 | 14 |
| 2h_acum_10mm | sim | 0,095 | 0,005 | 0,023 | 0,783 | 0,044 | 0,084 | 0,179 | 0,333 | 23/28 | 21 | 0 |
| **3h_acum_10mm** | não | 0,158 | 0,011 | 0,043 | 0,817 | 0,081 | 0,128 | 0,298 | 0,346 | **23/33** | **19** | **18** |
| 3h_acum_20mm | não | 0,042 | 0,002 | 0,014 | 0,824 | 0,028 | 0,033 | 0,065 | 0,382 | 11/13 | 10 | 8 |

## Leitura

- `PR-AUC OOF` é a área sob a curva precisão-recall na validação temporal
  dentro de 2019, com gap de 3 horas entre treino e validação.
- As métricas de precisão, recall, F1 e eventos são do holdout de 2020,
  usando os limiares escolhidos no OOF de 2019.
- **Limiar atenção** prioriza recall ≥ 0,80 (mais avisos, mais falsos
  positivos). **Limiar forte** maximiza F1 (menos avisos, mais precisão).
- `Eventos (2020)` conta blocos contíguos do alvo que receberam pelo menos
  um alerta nas 3 horas anteriores. `2h antes` e `3h antes` mostram quantos
  eventos tiveram alerta com pelo menos 2h ou 3h de antecedência.
- O alvo principal operacional é **3h_acum_10mm**: 23 de 33 eventos (70%)
  receberam algum alerta; 18 de 33 (55%) tiveram pelo menos 3h de
  antecedência. O nível de atenção tem precisão baixa (4,3%), enquanto o
  nível forte sobe para 29,8% de precisão com 34,6% de recall.
- O alvo de intensidade **3h_10mm** cobre 16 de 19 eventos (84%) no nível de
  atenção, com 14 eventos avisados com 3h de antecedência. É útil como
  confirmação de chuva forte, mas também tem precisão baixa no nível de
  atenção.
- A base tem apenas dois anos e eventos raros (54 horas com ≥10 mm/h e 142
  horas com máximo de 3h ≥10 mm/h). Os números devem ser tratados como MVP,
  não como validação operacional definitiva.

## Como o alerta é exposto

- `monitoramento = true`: probabilidade acima do limiar de atenção.
- `alerta = true`: probabilidade acima do limiar forte.
- `nivel`: `sem_alerta`, `atencao`, `forte` ou `significativa` (para alvos de
  5 mm).
- O app ainda não consome a API; a integração com o Firestore e o score do
  bairro é a próxima fase.

## Reprodução

```powershell
cd src/backend/ml
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train.py
```

Os modelos ficam em `src/backend/ml/models/` e são ignorados pelo Git. O
relatório bruto também é gravado em `src/backend/ml/outputs/metricas.md`.
