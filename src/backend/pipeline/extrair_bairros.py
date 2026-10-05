# Unifica os brutos, identifica bairro de cada registro e gera
# data/ocorrencias.csv com o schema unificado.
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    DATA_DIR,
    carregar_bairros,
    carregar_jsonl,
    normalizar,
)

FONTES = ["bruto_noticias.jsonl", "bruto_inmet.jsonl", "bruto_defesacivil.jsonl"]
DESTINO = DATA_DIR / "ocorrencias.csv"

CAMPOS = [
    "data",
    "bairro",
    "titulo",
    "fonte",
    "fonte_tipo",
    "url",
    "severidade",
    "descricao",
]


def extrair_bairro(texto: str, bairros_norm: dict):
    texto = normalizar(texto)
    for norm, original in bairros_norm.items():
        if f" {norm} " in f" {texto} ":
            return original
    return "nao_identificado"


if __name__ == "__main__":
    bairros = carregar_bairros()
    bairros_norm = {normalizar(b): b for b in bairros}

    corpos = {r["url"]: r.get("texto", "") for r in carregar_jsonl(DATA_DIR / "corpos.jsonl")}

    vistos = set()
    linhas = []
    for arquivo in FONTES:
        for reg in carregar_jsonl(DATA_DIR / arquivo):
            if reg.get("url") in vistos:
                continue
            vistos.add(reg.get("url"))
            texto = (
                f"{reg.get('titulo', '')} {reg.get('descricao', '')} "
                f"{reg.get('areas', '')} {corpos.get(reg.get('url'), '')}"
            )
            linhas.append(
                {
                    "data": reg.get("data", ""),
                    "bairro": extrair_bairro(texto, bairros_norm),
                    "titulo": reg.get("titulo", ""),
                    "fonte": reg.get("fonte", ""),
                    "fonte_tipo": reg.get("fonte_tipo", ""),
                    "url": reg.get("url", ""),
                    "severidade": reg.get("severidade", ""),
                    "descricao": (reg.get("descricao", "") or "")[:200],
                }
            )

    with DESTINO.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CAMPOS)
        writer.writeheader()
        writer.writerows(linhas)

    identificados = sum(1 for l in linhas if l["bairro"] != "nao_identificado")
    print(f"{len(linhas)} ocorrencias ({identificados} com bairro) em {DESTINO}")
