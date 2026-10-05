# Pipeline de dados — Locais propensos a alagamento (Recife)

Coleta notícias e alertas oficiais, identifica o bairro afetado e gera a
base `ocorrencias.csv` usada depois no score de risco e no ML.

## Setup

```powershell
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Ordem de execução

```powershell
py coletar_noticias.py     # Google News RSS + GDELT + Bing News
py coletar_inmet.py        # alertas INMET (PE)
py coletar_defesacivil.py  # Defesa Civil PE (RSS + site)
py enriquecer_artigos.py   # baixa o corpo das matérias -> data/corpos.jsonl
py extrair_bairros.py      # unifica e extrai bairro -> data/ocorrencias.csv
py enriquecer_geo.py       # geocodifica bairros + elevação -> data/bairros_geo.csv
py score_risco.py          # score de risco por bairro -> data/score_bairro.csv
py resumo.py               # ranking de bairros, fonte, ano
```

## Score de risco e fluxo de alerta

`score_bairro.csv`: `bairro, frequencia, score_freq, elevacao_m, score_elev,
score_risco (0-100), nivel (baixo/medio/alto)`.

Métrica prevista no app:

1. Usuário cadastra endereço → geocode (Nominatim) → bairro por proximidade
   do centróide em `bairros_geo.csv` (best-effort, não precisa ser exato).
2. ML prevê chuva para o bairro (mm/h ou probabilidade).
3. Se chuva ≥ limiar **e** `score_risco` do bairro for alto → alerta:
   "Está chovendo e o local é propenso a alagamento."

Nota: `googlenewsdecoder` depende do backend "modest" do `selectolax`, que
não funciona no Python 3.14. Se o import falhar, edite
`site-packages/googlenewsdecoder/_parse.py` trocando
`from selectolax.parser import HTMLParser` por
`from selectolax.lexbor import LexborHTMLParser as HTMLParser`.

## Saídas (`data/`)

- `bruto_*.jsonl` — registros crus de cada fonte
- `ocorrencias.csv` — schema unificado: `data, bairro, titulo, fonte,
  fonte_tipo, url, severidade, descricao`
- `ranking_bairros.csv` — contagem de ocorrências por bairro
- `bairros_recife.csv` — lista canônica de bairros usada no match

## Próximos passos

- Revisar amostra dos matches `nao_identificado`
- Cruzar com elevação/áreas oficiais de risco do Recife
- Score de risco por bairro e `sync_firebase.py` quando o app precisar
