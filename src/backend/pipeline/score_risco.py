# Calcula o score de risco de alagamento por bairro.
# score = 0.6 * frequencia (ocorrencias, fonte oficial pesa 2x, com peso
# de recencia) + 0.4 * elevacao invertida (quanto mais baixo, maior risco).
# Saida: data/score_bairro.csv
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR

OCORRENCIAS = DATA_DIR / "ocorrencias.csv"
GEO = DATA_DIR / "bairros_geo.csv"
DESTINO = DATA_DIR / "score_bairro.csv"

df = pd.read_csv(OCORRENCIAS)
df = df[df["bairro"] != "nao_identificado"].copy()
df["peso_fonte"] = df["fonte_tipo"].map({"alerta_oficial": 2.0, "noticia": 1.0}).fillna(1.0)
df["ano"] = df["data"].astype(str).str.extract(r"(\d{4})")[0].fillna(0).astype(int)
df["peso_recencia"] = df["ano"].apply(lambda a: 1.5 if a >= 2024 else (1.0 if a >= 2020 else 0.5))
df["peso"] = df["peso_fonte"] * df["peso_recencia"]

freq = df.groupby("bairro")["peso"].sum().reset_index().rename(columns={"peso": "frequencia"})
freq["score_freq"] = (freq["frequencia"] / freq["frequencia"].max() * 100).round(1)

geo = pd.read_csv(GEO)
score = freq.merge(geo, on="bairro", how="left")
score["elevacao_m"] = pd.to_numeric(score["elevacao_m"], errors="coerce")

elev_max = score["elevacao_m"].max()
score["score_elev"] = ((1 - score["elevacao_m"].fillna(elev_max) / (elev_max + 1)) * 100).round(1)
score["score_risco"] = (0.6 * score["score_freq"] + 0.4 * score["score_elev"]).round(1)
score["nivel"] = pd.cut(score["score_risco"], bins=[-1, 33, 66, 100], labels=["baixo", "medio", "alto"])

score = score.sort_values("score_risco", ascending=False)
score.to_csv(DESTINO, index=False, encoding="utf-8")
print(score[["bairro", "frequencia", "elevacao_m", "score_risco", "nivel"]].head(15).to_string(index=False))
print(f"\nSalvo em {DESTINO}")
