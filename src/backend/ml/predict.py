"""Inferencia: le observacoes recentes, monta features e gera alerta JSON.

Uso (a partir de src/backend/ml):
    .venv\\Scripts\\python.exe predict.py
    .venv\\Scripts\\python.exe predict.py --csv ..\\..\\..\\dados\\clima\\observacoes_inmet_a301.csv
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

from config import (
    ALVO_INTENSIDADE,
    ALVO_PRINCIPAL,
    LIVE_CSV,
    METADATA_PATH,
    MODELS_DIR,
)
from data import ler_observacoes_csv
from features import FEATURES_KMEANS, construir_features
from modeling import adicionar_clusters

JANELA_MINIMA_H = 24


def carregar_metadata(caminho: Path = METADATA_PATH) -> dict:
    if not caminho.exists():
        raise FileNotFoundError(
            f"Metadata nao encontrada: {caminho}. Rode train.py primeiro."
        )
    return json.loads(caminho.read_text(encoding="utf-8"))


def carregar_pacotes(metadata: dict) -> dict:
    pacotes = {}
    for alvo, meta in metadata["modelos"].items():
        caminho = MODELS_DIR / meta["arquivo"]
        if not caminho.exists():
            raise FileNotFoundError(f"Modelo nao encontrado: {caminho}")
        pacotes[alvo] = joblib.load(caminho)
    return pacotes


def _features_para_modelo(df: pd.DataFrame, pacote: dict) -> pd.DataFrame:
    if pacote.get("usar_cluster") and pacote.get("kmeans") is not None:
        df_modelo, _ = adicionar_clusters(
            df,
            pacote["kmeans"],
            pacote.get("features_kmeans") or FEATURES_KMEANS,
        )
    else:
        df_modelo = df
    faltantes = [c for c in pacote["features"] if c not in df_modelo.columns]
    if faltantes:
        raise ValueError(f"Features ausentes para {pacote['alvo']}: {faltantes}")
    return df_modelo[pacote["features"]].tail(1)


def prever_dataframe(
    df: pd.DataFrame,
    pacotes: dict,
    metadata: dict,
) -> dict:
    """Recebe um dataframe com features e devolve previsoes para todos os alvos."""
    if len(df) < JANELA_MINIMA_H:
        raise ValueError(
            f"Sao necessarias pelo menos {JANELA_MINIMA_H} observacoes "
            f"horarias; recebi {len(df)}."
        )

    previsoes = {}
    for alvo, pacote in pacotes.items():
        X = _features_para_modelo(df, pacote)
        proba = float(pacote["modelo"].predict_proba(X)[0, 1])
        limiar = float(pacote["limiar_probabilidade"])
        limiar_forte = float(pacote.get("limiar_forte", limiar))
        monitoramento = proba >= limiar
        alerta = proba >= limiar_forte
        nivel = "sem_alerta"
        if alerta:
            nivel = "forte" if pacote["limiar_mm"] >= 10 else "significativa"
        elif monitoramento:
            nivel = "atencao"
        previsoes[alvo] = {
            "probabilidade": round(proba, 4),
            "alerta": bool(alerta),
            "monitoramento": bool(monitoramento),
            "nivel": nivel,
            "horizonte_h": int(pacote["horizonte_h"]),
            "limiar_mm": int(pacote["limiar_mm"]),
            "limiar_probabilidade": round(limiar, 4),
            "limiar_forte": round(limiar_forte, 4),
            "usar_cluster": bool(pacote.get("usar_cluster")),
            "modelo": pacote["alvo"],
        }

    principal = previsoes.get(ALVO_PRINCIPAL)
    intensidade = previsoes.get(ALVO_INTENSIDADE)
    risco_forte = any(
        p and p["alerta"] for p in (principal, intensidade)
    )
    monitorar = any(
        p and p["monitoramento"]
        for p in (principal, intensidade, previsoes.get("3h_5mm"))
    )
    if risco_forte:
        recomendacao = (
            "Risco de chuva forte nas proximas 3 horas. "
            "Evite deslocamentos em areas de alagamento e acompanhe a Defesa Civil."
        )
    elif monitorar:
        recomendacao = (
            "Atencao: chance de chuva significativa nas proximas 3 horas. "
            "Acompanhe a evolucao e evite areas de alagamento."
        )
    else:
        recomendacao = "Sem indicativo de chuva significativa nas proximas horas."

    ultima = df.iloc[-1]
    observacao = {
        "datetime_utc": str(ultima.get("datetime_utc", "")),
        "datetime_local": str(ultima.get("datetime_local", "")),
        "chuva_1h_mm": float(ultima.get("chuva_1h", 0.0)),
        "chuva_3h_mm": float(ultima.get("chuva_3h", 0.0)),
        "fonte": str(ultima.get("fonte", "INMET A301")),
    }
    return {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "modelo_versao": metadata.get("versao"),
        "observacao": observacao,
        "previsao_principal": principal,
        "previsao_intensidade": intensidade,
        "previsoes": previsoes,
        "recomendacao": recomendacao,
    }


def prever_arquivo(caminho: str | Path = LIVE_CSV) -> dict:
    metadata = carregar_metadata()
    pacotes = carregar_pacotes(metadata)
    df = construir_features(ler_observacoes_csv(caminho))
    return prever_dataframe(df, pacotes, metadata)


def main() -> int:
    parser = argparse.ArgumentParser(description="Previsao de chuva no Recife.")
    parser.add_argument("--csv", type=Path, default=LIVE_CSV)
    parser.add_argument("--saida", type=Path, default=None)
    args = parser.parse_args()

    resultado = prever_arquivo(args.csv)
    texto = json.dumps(resultado, ensure_ascii=False, indent=2)
    print(texto)
    if args.saida:
        args.saida.parent.mkdir(parents=True, exist_ok=True)
        args.saida.write_text(texto + "\n", encoding="utf-8")
        print(f"\nSalvo em {args.saida}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
