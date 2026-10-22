# Calcula o score de risco de alagamento por bairro.
# score = 0.6 * frequencia (ocorrencias, fonte oficial pesa 2x, com peso
# de recencia) + 0.4 * elevacao invertida (quanto mais baixo, maior risco).
# Bairros sem ocorrencias recebem nivel "sem_historico" (nao inventamos risco).
# Saida: data/score_bairro.csv
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR, carregar_bairros

OCORRENCIAS = DATA_DIR / "ocorrencias.csv"
GEO = DATA_DIR / "bairros_geo.csv"
DESTINO = DATA_DIR / "score_bairro.csv"

df = pd.read_csv(OCORRENCIAS)
df = df[df["bairro"] != "nao_identificado"].copy()
df["peso_fonte"] = df["fonte_tipo"].map({"alerta_oficial": 2.0, "noticia": 1.0}).fillna(1.0)
df["ano"] = df["data"].astype(str).str.extract(r"(\d{4})")[0].fillna(0).astype(int)
df["peso_recencia"] = df["ano"].apply(lambda a: 1.5 if a >= 2024 else (1.0 if a >= 2020 else 0.5))
df["peso"] = df["peso_fonte"] * df["peso_recencia"]

freq = (
    df.groupby("bairro")
    .agg(frequencia=("peso", "sum"), ocorrencias=("peso", "size"))
    .reset_index()
)
freq["score_freq"] = (freq["frequencia"] / freq["frequencia"].max() * 100).round(1)

geo = pd.read_csv(GEO)
geo = geo[geo["bairro"].isin(carregar_bairros())].copy()

score = geo.merge(freq, on="bairro", how="left")
score["frequencia"] = score["frequencia"].fillna(0.0)
score["ocorrencias"] = score["ocorrencias"].fillna(0).astype(int)
score["score_freq"] = score["score_freq"].fillna(0.0)
score["elevacao_m"] = pd.to_numeric(score["elevacao_m"], errors="coerce")

elev_max = score["elevacao_m"].max()
score["score_elev"] = (
    (1 - score["elevacao_m"].fillna(elev_max) / (elev_max + 1)) * 100
).round(1)
score["score_risco"] = (
    0.6 * score["score_freq"] + 0.4 * score["score_elev"]
).round(1)
score["tem_historico"] = score["frequencia"] > 0
score["nivel"] = pd.cut(
    score["score_risco"], bins=[-1, 33, 66, 100], labels=["baixo", "medio", "alto"]
).astype(str)
score.loc[~score["tem_historico"], "nivel"] = "sem_historico"

score = score.sort_values(
    ["tem_historico", "score_risco"], ascending=[False, False]
)
score = score[
    [
        "bairro",
        "frequencia",
        "ocorrencias",
        "score_freq",
        "lat",
        "lon",
        "elevacao_m",
        "score_elev",
        "score_risco",
        "nivel",
        "tem_historico",
    ]
]
score.to_csv(DESTINO, index=False, encoding="utf-8")

com_historico = score[score["tem_historico"]]
print(
    f"{len(score)} bairros | {len(com_historico)} com histórico | "
    f"{len(score) - len(com_historico)} sem histórico"
)
print(com_historico[["bairro", "frequencia", "elevacao_m", "score_risco", "nivel"]].head(15).to_string(index=False))
print(f"\nSalvo em {DESTINO}")
