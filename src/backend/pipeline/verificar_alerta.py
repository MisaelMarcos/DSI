"""Cruza a previsao de chuva (3h) do ML com o score de risco do bairro.

Fluxo:
  1. Endereco (Nominatim) ou coordenadas -> bairro pelo centroide mais proximo
     em data/bairros_geo.csv (ou nome direto do bairro).
  2. Busca score_risco, nivel e historico em data/score_bairro.csv.
  3. Consulta a previsao de 3h via consultar_previsao.py.
  4. Aplica a matriz de decisao (Chuva prevista x Risco do bairro).

Uso:
    py verificar_alerta.py --bairro "Boa Viagem"
    py verificar_alerta.py --endereco "Av. Recife, Recife"
    py verificar_alerta.py --lat -8.119 --lon -34.904
    py verificar_alerta.py --todos
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR, normalizar, slug_bairro
from consultar_previsao import DEFAULT_ML_API_URL, consultar_previsao

SCORE_CSV = DATA_DIR / "score_bairro.csv"
GEO_CSV = DATA_DIR / "bairros_geo.csv"
HEADERS = {"User-Agent": "AlertaChuvaRecife/1.0 (TCC)"}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    raio_terra_km = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = (
        math.sin(dp / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    )
    return 2 * raio_terra_km * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def carregar_scores() -> dict[str, dict]:
    if not SCORE_CSV.exists():
        raise FileNotFoundError(
            f"Arquivo {SCORE_CSV} nao encontrado. Rode score_risco.py primeiro."
        )
    scores: dict[str, dict] = {}
    with SCORE_CSV.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            nome = row["bairro"].strip()
            scores[normalizar(nome)] = {
                "bairro": nome,
                "slug": slug_bairro(nome),
                "frequencia": float(row.get("frequencia") or 0.0),
                "ocorrencias": int(float(row.get("ocorrencias") or 0)),
                "score_freq": float(row.get("score_freq") or 0.0),
                "lat": float(row["lat"]) if row.get("lat") else None,
                "lon": float(row["lon"]) if row.get("lon") else None,
                "elevacao_m": (
                    float(row["elevacao_m"]) if row.get("elevacao_m") else None
                ),
                "score_elev": float(row.get("score_elev") or 0.0),
                "score_risco": float(row.get("score_risco") or 0.0),
                "nivel": row.get("nivel") or "sem_historico",
                "tem_historico": str(row.get("tem_historico", "")).lower()
                == "true",
            }
    return scores


def bairro_mais_proximo(
    lat: float,
    lon: float,
    scores: dict[str, dict] | None = None,
) -> tuple[dict, float]:
    base = scores or carregar_scores()
    melhor = None
    menor_dist = float("inf")
    for info in base.values():
        if info["lat"] is None or info["lon"] is None:
            continue
        dist = _haversine_km(lat, lon, info["lat"], info["lon"])
        if dist < menor_dist:
            menor_dist = dist
            melhor = info
    if melhor is None:
        raise ValueError("Nenhum bairro com coordenadas validas encontrado.")
    return melhor, round(menor_dist, 3)


def geocodificar_endereco(endereco: str, timeout: int = 15) -> tuple[float, float, str]:
    consulta = endereco.strip()
    if "recife" not in normalizar(consulta):
        consulta = f"{consulta}, Recife, Pernambuco, Brasil"
    resp = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": consulta, "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=timeout,
    )
    resp.raise_for_status()
    resultados = resp.json()
    if not resultados:
        raise ValueError(f"Endereco nao encontrado no Nominatim: {endereco}")
    item = resultados[0]
    return float(item["lat"]), float(item["lon"]), str(item.get("display_name", ""))


def decidir_alerta(nivel_chuva: str, nivel_bairro: str, tem_historico: bool) -> dict:
    """Aplica a matriz de decisao combinando previsao do ML (3h) e risco do bairro."""
    risco_efetivo = nivel_bairro if tem_historico else "sem_historico"

    if nivel_chuva == "sem_previsao":
        return {
            "decisao": "sem_previsao",
            "severidade": "indisponivel",
            "enviar_notificacao": False,
            "titulo": "Previsão de chuva indisponível",
            "mensagem": (
                "A API de previsão de chuva não respondeu. "
                "Considere o risco histórico do seu bairro."
            ),
        }

    if nivel_chuva == "alerta":
        if risco_efetivo == "alto":
            return {
                "decisao": "alerta_alagamento",
                "severidade": "critica",
                "enviar_notificacao": True,
                "titulo": "ALERTA de alagamento nas próximas 3h",
                "mensagem": (
                    "Previsão de chuva forte nas próximas 3 horas e seu bairro "
                    "possui risco histórico ALTO de alagamento. Evite áreas baixas e deslocamentos."
                ),
            }
        if risco_efetivo == "medio":
            return {
                "decisao": "atencao",
                "severidade": "alta",
                "enviar_notificacao": True,
                "titulo": "ATENÇÃO: chuva forte prevista nas próximas 3h",
                "mensagem": (
                    "Previsão de chuva forte nas próximas 3 horas em bairro com "
                    "histórico moderado de alagamento. Redobre a atenção."
                ),
            }
        return {
            "decisao": "aviso_chuva",
            "severidade": "moderada",
            "enviar_notificacao": True,
            "titulo": "Aviso de chuva forte nas próximas 3h",
            "mensagem": (
                "O modelo indica chuva forte nas próximas 3 horas no Recife. "
                + (
                    "Seu bairro não possui histórico registrado na base, mas acompanhe a chuva."
                    if risco_efetivo == "sem_historico"
                    else "Seu bairro tem risco histórico baixo, mas evite vias críticas da cidade."
                )
            ),
        }

    if nivel_chuva == "monitoramento":
        if risco_efetivo == "alto":
            return {
                "decisao": "atencao",
                "severidade": "alta",
                "enviar_notificacao": True,
                "titulo": "ATENÇÃO: chance de chuva significativa em área de risco alto",
                "mensagem": (
                    "O modelo aponta condição de atenção para chuva nas próximas 3 horas "
                    "e seu bairro tem risco alto de alagamento. Monitore os avisos."
                ),
            }
        return {
            "decisao": "monitorar",
            "severidade": "moderada",
            "enviar_notificacao": False,
            "titulo": "Monitorar: chance de chuva nas próximas 3h",
            "mensagem": (
                "Há indicativo de chuva nas próximas 3 horas (nível de atenção). "
                "Acompanhe a evolução do tempo."
            ),
        }

    return {
        "decisao": "sem_alerta",
        "severidade": "normal",
        "enviar_notificacao": False,
        "titulo": "Sem alerta de chuva para as próximas 3h",
        "mensagem": (
            "O modelo não indica chuva significativa nas próximas 3 horas no Recife."
        ),
    }


def verificar_bairro(
    info_bairro: dict,
    previsao: dict,
    distancia_km: float | None = None,
    endereco_resolvido: str | None = None,
) -> dict:
    decisao = decidir_alerta(
        nivel_chuva=previsao.get("nivel_chuva", "sem_previsao"),
        nivel_bairro=info_bairro["nivel"],
        tem_historico=info_bairro["tem_historico"],
    )
    resultado = {
        "bairro": info_bairro["bairro"],
        "slug": info_bairro["slug"],
        "risco_bairro": {
            "nivel": info_bairro["nivel"],
            "score_risco": info_bairro["score_risco"],
            "tem_historico": info_bairro["tem_historico"],
            "ocorrencias": info_bairro["ocorrencias"],
            "elevacao_m": info_bairro["elevacao_m"],
        },
        "previsao_chuva_3h": {
            "disponivel": previsao.get("disponivel", False),
            "origem": previsao.get("origem"),
            "gerado_em": previsao.get("gerado_em"),
            "nivel_chuva": previsao.get("nivel_chuva"),
            "alerta_forte": previsao.get("alerta", False),
            "monitoramento": previsao.get("monitoramento", False),
            "probabilidade_3h_acum_10mm": previsao.get(
                "probabilidade_3h_acum_10mm"
            ),
            "probabilidade_3h_10mm": previsao.get("probabilidade_3h_10mm"),
            "observacao": previsao.get("observacao", {}),
        },
        "alerta_combinado": decisao,
    }
    if distancia_km is not None:
        resultado["distancia_centroide_km"] = distancia_km
    if endereco_resolvido:
        resultado["endereco_geocodificado"] = endereco_resolvido
    return resultado


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verifica o alerta combinando previsao do ML (3h) e risco do bairro."
    )
    grupo = parser.add_mutually_exclusive_group(required=False)
    grupo.add_argument("--bairro", help="Nome do bairro do Recife.")
    grupo.add_argument(
        "--endereco",
        help="Endereco no Recife (geocodificado via Nominatim).",
    )
    grupo.add_argument(
        "--todos",
        action="store_true",
        help="Avalia todos os 94 bairros.",
    )
    parser.add_argument("--lat", type=float, default=None)
    parser.add_argument("--lon", type=float, default=None)
    parser.add_argument("--api-url", default=DEFAULT_ML_API_URL)
    args = parser.parse_args()

    scores = carregar_scores()
    previsao = consultar_previsao(api_url=args.api_url)

    if args.todos:
        lista = [
            verificar_bairro(info, previsao) for info in scores.values()
        ]
        resumo = {
            "total_bairros": len(lista),
            "previsao_chuva_3h": lista[0]["previsao_chuva_3h"] if lista else {},
            "contagem_decisoes": {},
            "bairros": lista,
        }
        for item in lista:
            d = item["alerta_combinado"]["decisao"]
            resumo["contagem_decisoes"][d] = (
                resumo["contagem_decisoes"].get(d, 0) + 1
            )
        print(json.dumps(resumo, ensure_ascii=False, indent=2))
        return 0

    if args.lat is not None and args.lon is not None:
        info, dist = bairro_mais_proximo(args.lat, args.lon, scores)
        saida = verificar_bairro(info, previsao, distancia_km=dist)
    elif args.endereco:
        lat, lon, display = geocodificar_endereco(args.endereco)
        info, dist = bairro_mais_proximo(lat, lon, scores)
        saida = verificar_bairro(
            info,
            previsao,
            distancia_km=dist,
            endereco_resolvido=display,
        )
    else:
        nome_busca = args.bairro or "Boa Viagem"
        chave = normalizar(nome_busca)
        if chave not in scores:
            raise SystemExit(
                f"Bairro nao reconhecido: '{nome_busca}'. "
                "Consulte data/bairros_recife.csv."
            )
        saida = verificar_bairro(scores[chave], previsao)

    print(json.dumps(saida, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
