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
py gerar_relatorio.py      # docs/bairros-risco.md
py gerar_lista_bairros.py  # src/data/bairros.ts (lista usada pelo app)
```

## Lista canônica

`data/bairros_recife.csv` contém os **94 bairros oficiais** do Recife
(Lei Municipal 16.293/1997). Não edite `src/data/bairros.ts` à mão: altere o
CSV e rode `py gerar_lista_bairros.py`.

## Score de risco e fluxo de alerta

`score_bairro.csv`: `bairro, frequencia, ocorrencias, score_freq, lat, lon,
elevacao_m, score_elev, score_risco (0-100), nivel
(baixo/medio/alto/sem_historico), tem_historico`.

Bairros sem ocorrências recebem `nivel = sem_historico` e `tem_historico =
false`; o app não apresenta o score deles como risco, apenas informa que não
há histórico. O score usa elevação para todos.

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

## Sync com o Firestore

O app lê `scores/{slug}` e `bairros/{slug}` (somente leitura autenticada).
A escrita é feita com a service account do Firebase Admin:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\.secrets\dsi-ufrpe-58db3-admin.json"
node scripts/sync-firebase.mjs            # dry-run
node scripts/sync-firebase.mjs --apply    # grava
```

A credencial fica **fora do repositório** e nunca deve ser commitada
(`.gitignore` cobre `*firebase-adminsdk*.json` e `.secrets/`).

## Próximos passos

- Revisar amostra dos matches `nao_identificado` (o nome "Recife" sozinho é
  ambíguo; só "Recife Antigo" é usado como bairro)
- Integrar a previsão de chuva (modelo de ML) e gerar alertas combinando
  chuva + risco do bairro
- Atualizar a coleta/score periodicamente (hoje os dados são de outubro/2026)
