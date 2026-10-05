# Gera docs/bairros-risco.md com tabela de bairros, fontes e decisões.
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR

RAIZ = Path(__file__).resolve().parents[3]
DESTINO = RAIZ / "docs" / "bairros-risco.md"

score = pd.read_csv(DATA_DIR / "score_bairro.csv")
ocorrencias = pd.read_csv(DATA_DIR / "ocorrencias.csv")
ocorrencias = ocorrencias[ocorrencias["bairro"] != "nao_identificado"]

fontes = (
    ocorrencias.groupby(["bairro", "fonte_tipo"])
    .size()
    .unstack(fill_value=0)
    .reset_index()
)
fontes["detalhes"] = fontes.apply(
    lambda r: f"notícia: {r.get('noticia', 0)}, alerta oficial: {r.get('alerta_oficial', 0)}",
    axis=1,
)
detalhes = dict(zip(fontes["bairro"], fontes["detalhes"]))

def decisao(nivel):
    return {"alto": "ALERTA se chuva ≥ limiar", "medio": "ATENÇÃO se chuva forte"}.get(
        str(nivel), "só info de chuva"
    )

linhas = []
for _, r in score.iterrows():
    linhas.append(
        f"| {r['bairro']} | {r['frequencia']} | {r.get('elevacao_m', '')} | "
        f"{r.get('score_freq', '')} | {r.get('score_elev', '')} | {r['score_risco']} | "
        f"{r['nivel']} | {decisao(r['nivel'])} |"
    )

fontes_linhas = []
for bairro, detalhe in sorted(detalhes.items()):
    fontes_linhas.append(f"- **{bairro}**: {detalhe}")

conteudo = f"""# Relatório de bairros — risco de alagamento (Recife)

Gerado automaticamente por `src/backend/pipeline/gerar_relatorio.py` a partir
de `ocorrencias.csv`, `bairros_geo.csv` e `score_bairro.csv`.

## Método

- Ocorrências coletadas de Google News RSS, GDELT e Bing News (tipo `noticia`)
  e menções a INMET/Defesa Civil PE (tipo `alerta_oficial`).
- Peso por ocorrência: fonte oficial 2×, notícia 1×; recência: ≥2024 = 1,5×,
  ≥2020 = 1×, anterior = 0,5×.
- `score_freq` = frequência ponderada normalizada 0–100.
- `elevacao_m` = altitude do centróide do bairro (Open-Meteo/SRTM); mais baixo,
  maior o `score_elev`.
- `score_risco` = 0,6·score_freq + 0,4·score_elev. Faixas: ≤33 baixo,
  34–66 médio, >66 alto.

## Bairros

| Bairro | Freq. ponderada | Elevação (m) | Score freq | Score elev | Score risco | Nível | Decisão |
|---|---|---|---|---|---|---|---|
{chr(10).join(linhas)}

## Fontes por bairro

{chr(10).join(fontes_linhas)}

## Regra de alerta no app

1. Usuário cadastra endereço → bairro pelo centróide mais próximo.
2. ML prevê chuva para o bairro.
3. Nível alto E chuva ≥ limiar → alerta de alagamento; médio E chuva forte →
   atenção; baixo → apenas informação de chuva.
"""

DESTINO.write_text(conteudo, encoding="utf-8")
print(f"Relatório salvo em {DESTINO}")
