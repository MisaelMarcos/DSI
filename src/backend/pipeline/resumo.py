# Gera resumo da base: ranking de bairros e contagens por fonte/ano.
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR

ARQUIVO = DATA_DIR / "ocorrencias.csv"
if not ARQUIVO.exists():
    print("Rode extrair_bairros.py primeiro.")
    sys.exit(1)

df = pd.read_csv(ARQUIVO)
df["ano"] = df["data"].astype(str).str.extract(r"(\d{4})")

print(f"Total de registros: {len(df)}\n")

print("Top 20 bairros:")
print(df[df["bairro"] != "nao_identificado"]["bairro"].value_counts().head(20).to_string())
print()

print("Por tipo de fonte:")
print(df["fonte_tipo"].value_counts().to_string())
print()

print("Por ano:")
print(df["ano"].value_counts().sort_index().to_string())

df[df["bairro"] != "nao_identificado"]["bairro"].value_counts().to_csv(
    DATA_DIR / "ranking_bairros.csv"
)
print(f"\nRanking salvo em {DATA_DIR / 'ranking_bairros.csv'}")
