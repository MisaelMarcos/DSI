"""API FastAPI para servir as previsoes de chuva.

Uso (a partir de src/backend/ml):
    .venv\\Scripts\\python.exe -m uvicorn api:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Literal

from datetime import datetime, timezone

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import LIVE_CSV, MODEL_VERSION
from data import ler_observacoes_csv
from features import FEATURES_KMEANS, construir_features
from modeling import adicionar_clusters
from predict import (
    JANELA_MINIMA_H,
    carregar_metadata,
    carregar_pacotes,
    prever_dataframe,
)

ESTADO: dict = {
    "metadata": None,
    "pacotes": None,
    "erro": None,
    "simulacao": None,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        metadata = carregar_metadata()
        pacotes = carregar_pacotes(metadata)
        ESTADO.update({"metadata": metadata, "pacotes": pacotes, "erro": None})
    except Exception as exc:  # noqa: BLE001
        ESTADO.update({"metadata": None, "pacotes": None, "erro": str(exc)})
    yield


app = FastAPI(
    title="Alerta Chuva Recife - Previsao de chuva",
    description="Classificadores Random Forest com features do INMET A301.",
    version=MODEL_VERSION,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PrevisaoRequest(BaseModel):
    features: dict[str, float] = Field(
        ...,
        description="Features meteorologicas do instante atual.",
    )
    horizonte: Literal[2, 3] = 3
    limiar: Literal[5, 10, 20] = 10
    tipo: Literal["max", "acum"] = "acum"


class PrevisaoTodosRequest(BaseModel):
    features: dict[str, float]


class SimulacaoChuvaRequest(BaseModel):
    cenario: Literal["real", "monitoramento", "chuva_forte"] = "real"
    chuva_1h_mm: float | None = None
    chuva_3h_mm: float | None = None
    probabilidade_3h_acum_10mm: float | None = None
    probabilidade_3h_10mm: float | None = None
    probabilidade_3h_5mm: float | None = None


def _montar_previsao_simulada(cfg: dict) -> dict:
    agora = datetime.now(timezone.utc)
    cenario = cfg.get("cenario", "chuva_forte")

    if cenario == "monitoramento":
        prob_acum10 = float(cfg.get("probabilidade_3h_acum_10mm") or 0.085)
        prob_max10 = float(cfg.get("probabilidade_3h_10mm") or 0.062)
        prob_5mm = float(cfg.get("probabilidade_3h_5mm") or 0.42)
        chuva_1h = float(cfg.get("chuva_1h_mm") or 2.8)
        chuva_3h = float(cfg.get("chuva_3h_mm") or 5.4)
        alerta = False
        monitoramento = True
        nivel_10 = "atencao"
        recomendacao = (
            "ATENCAO: ha chance de chuva significativa nas proximas 3 horas "
            "(simulacao de monitoramento ativa)."
        )
    else:
        prob_acum10 = float(cfg.get("probabilidade_3h_acum_10mm") or 0.78)
        prob_max10 = float(cfg.get("probabilidade_3h_10mm") or 0.64)
        prob_5mm = float(cfg.get("probabilidade_3h_5mm") or 0.89)
        chuva_1h = float(cfg.get("chuva_1h_mm") or 12.4)
        chuva_3h = float(cfg.get("chuva_3h_mm") or 24.6)
        alerta = True
        monitoramento = True
        nivel_10 = "forte"
        recomendacao = (
            "ALERTA: alta probabilidade de chuva forte nas proximas 3 horas. "
            "Monitore areas de risco de alagamento."
        )

    bloco_acum10 = {
        "alvo": "3h_acum_10mm",
        "horizonte_h": 3,
        "limiar_mm": 10,
        "tipo": "acum",
        "probabilidade": round(prob_acum10, 4),
        "limiar_probabilidade": 0.011,
        "limiar_forte": 0.128,
        "monitoramento": monitoramento,
        "alerta": alerta,
        "nivel": nivel_10,
        "usar_cluster": True,
    }
    bloco_max10 = {
        "alvo": "3h_10mm",
        "horizonte_h": 3,
        "limiar_mm": 10,
        "tipo": "max",
        "probabilidade": round(prob_max10, 4),
        "limiar_probabilidade": 0.014,
        "limiar_forte": 0.105,
        "monitoramento": monitoramento,
        "alerta": alerta,
        "nivel": nivel_10,
        "usar_cluster": True,
    }
    bloco_5mm = {
        "alvo": "3h_5mm",
        "horizonte_h": 3,
        "limiar_mm": 5,
        "tipo": "max",
        "probabilidade": round(prob_5mm, 4),
        "limiar_probabilidade": 0.024,
        "limiar_forte": 0.155,
        "monitoramento": True,
        "alerta": alerta,
        "nivel": "significativa" if alerta else "atencao",
        "usar_cluster": True,
    }

    return {
        "gerado_em": agora.isoformat(),
        "modelo_versao": MODEL_VERSION,
        "simulado": True,
        "cenario_simulado": cenario,
        "observacao": {
            "datetime_utc": agora.isoformat(),
            "datetime_local": agora.strftime("%Y-%m-%d %H:%M:%S"),
            "fonte": f"SIMULACAO ({cenario.upper()})",
            "chuva_1h_mm": chuva_1h,
            "chuva_3h_mm": chuva_3h,
            "chuva_6h_mm": round(chuva_3h * 1.3, 1),
            "chuva_24h_mm": round(chuva_3h * 1.8, 1),
        },
        "previsao_principal": bloco_acum10,
        "previsao_intensidade": bloco_max10,
        "previsoes": {
            "3h_acum_10mm": bloco_acum10,
            "3h_10mm": bloco_max10,
            "3h_5mm": bloco_5mm,
        },
        "recomendacao": recomendacao,
    }


def _pacote_do_alvo(horizonte: int, limiar: int, tipo: str) -> dict:
    if ESTADO["pacotes"] is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Modelos nao carregados. Rode train.py e reinicie a API. "
                f"Erro: {ESTADO['erro']}"
            ),
        )
    alvo = (
        f"{horizonte}h_acum_{limiar}mm"
        if tipo == "acum"
        else f"{horizonte}h_{limiar}mm"
    )
    pacote = ESTADO["pacotes"].get(alvo)
    if pacote is None:
        raise HTTPException(status_code=404, detail=f"Alvo nao treinado: {alvo}")
    return pacote


def _validar_features(features: dict[str, float], nomes: list[str]) -> None:
    faltantes = [nome for nome in nomes if nome not in features]
    if faltantes:
        raise HTTPException(
            status_code=422,
            detail={"features_ausentes": faltantes},
        )


def _prever_pacote(features: dict[str, float], pacote: dict) -> dict:
    df = pd.DataFrame([features])
    if pacote.get("usar_cluster") and pacote.get("kmeans") is not None:
        df, _ = adicionar_clusters(
            df,
            pacote["kmeans"],
            pacote.get("features_kmeans") or FEATURES_KMEANS,
        )
    faltantes = [nome for nome in pacote["features"] if nome not in df.columns]
    if faltantes:
        raise HTTPException(
            status_code=422,
            detail={"features_ausentes_no_modelo": faltantes},
        )
    proba = float(pacote["modelo"].predict_proba(df[pacote["features"]])[0, 1])
    limiar = float(pacote["limiar_probabilidade"])
    limiar_forte = float(pacote.get("limiar_forte", limiar))
    monitoramento = proba >= limiar
    alerta = proba >= limiar_forte
    nivel = "sem_alerta"
    if alerta:
        nivel = "forte" if pacote["limiar_mm"] >= 10 else "significativa"
    elif monitoramento:
        nivel = "atencao"
    return {
        "alvo": pacote["alvo"],
        "probabilidade": round(proba, 4),
        "alerta": bool(alerta),
        "monitoramento": bool(monitoramento),
        "nivel": nivel,
        "horizonte_h": int(pacote["horizonte_h"]),
        "limiar_mm": int(pacote["limiar_mm"]),
        "limiar_probabilidade": round(limiar, 4),
        "limiar_forte": round(limiar_forte, 4),
        "usar_cluster": bool(pacote.get("usar_cluster")),
        "versao": pacote.get("versao"),
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if ESTADO["pacotes"] else "degradado",
        "modelos_carregados": len(ESTADO["pacotes"] or {}),
        "erro": ESTADO["erro"],
        "versao": MODEL_VERSION,
    }


@app.get("/modelos")
def modelos() -> dict:
    if ESTADO["metadata"] is None:
        raise HTTPException(status_code=503, detail=ESTADO["erro"])
    metadata = ESTADO["metadata"]
    return {
        "versao": metadata.get("versao"),
        "gerado_em": metadata.get("gerado_em"),
        "fonte": metadata.get("fonte"),
        "alvo_principal": metadata.get("alvo_principal"),
        "modelos": {
            alvo: {
                "horizonte_h": meta["horizonte_h"],
                "limiar_mm": meta["limiar_mm"],
                "usar_cluster": meta["usar_cluster"],
                "limiar_probabilidade": meta["limiar_probabilidade"],
                "limiar_forte": meta.get("limiar_forte"),
                "metricas_holdout_2020": meta["metricas_holdout_2020"],
                "metricas_holdout_2020_forte": meta.get(
                    "metricas_holdout_2020_forte"
                ),
            }
            for alvo, meta in metadata["modelos"].items()
        },
    }


@app.post("/prever")
def prever(payload: PrevisaoRequest) -> dict:
    pacote = _pacote_do_alvo(payload.horizonte, payload.limiar, payload.tipo)
    _validar_features(
        payload.features,
        pacote.get("features_base") or pacote["features"],
    )
    return _prever_pacote(payload.features, pacote)


@app.post("/prever/todos")
def prever_todos(payload: PrevisaoTodosRequest) -> dict:
    if ESTADO["pacotes"] is None or ESTADO["metadata"] is None:
        raise HTTPException(status_code=503, detail=ESTADO["erro"])
    _validar_features(payload.features, ESTADO["metadata"]["features"])
    return {
        "previsoes": {
            alvo: _prever_pacote(payload.features, pacote)
            for alvo, pacote in ESTADO["pacotes"].items()
        }
    }


@app.get("/prever/atual")
def prever_atual(coletar: bool = False) -> dict:
    """Gera a previsao de 3h a partir do CSV ao vivo (coletando se necessario)."""
    if ESTADO.get("simulacao") is not None:
        return _montar_previsao_simulada(ESTADO["simulacao"])

    if ESTADO["pacotes"] is None or ESTADO["metadata"] is None:
        raise HTTPException(status_code=503, detail=ESTADO["erro"])

    precisa_coleta = coletar or not LIVE_CSV.exists()
    if not precisa_coleta:
        try:
            df_atual = ler_observacoes_csv(LIVE_CSV)
            precisa_coleta = len(df_atual) < JANELA_MINIMA_H
        except Exception:  # noqa: BLE001
            precisa_coleta = True

    if precisa_coleta:
        from collect_inmet import coletar_uma_vez

        try:
            coletar_uma_vez(LIVE_CSV, garantir_janela=True)
        except Exception as exc:  # noqa: BLE001
            if not LIVE_CSV.exists():
                raise HTTPException(
                    status_code=503,
                    detail=f"Sem observacoes locais e falha ao coletar: {exc}",
                ) from exc

    try:
        df = construir_features(ler_observacoes_csv(LIVE_CSV))
        return prever_dataframe(df, ESTADO["pacotes"], ESTADO["metadata"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/prever/simular")
def prever_simular(payload: SimulacaoChuvaRequest) -> dict:
    """Ativa ou desativa um cenario simulado de chuva forte/monitoramento para testes de trigger."""
    if payload.cenario == "real":
        ESTADO["simulacao"] = None
        return prever_atual(coletar=False)

    ESTADO["simulacao"] = payload.model_dump(exclude_none=True)
    return _montar_previsao_simulada(ESTADO["simulacao"])
