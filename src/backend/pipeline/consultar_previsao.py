"""Cliente para consultar a previsao de chuva (3h) do modulo de ML.

Tenta primeiro a API FastAPI (ML_API_URL, padrao http://localhost:8000).
Se a API estiver fora do ar, tenta inferencia local usando os artefatos em
src/backend/ml/ ou o cache src/backend/ml/outputs/previsao.json.
Se nenhuma fonte estiver disponivel, degrada de forma segura sem quebrar o
fluxo de risco por bairro.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[2]
ML_DIR = REPO_ROOT / "src" / "backend" / "ml"
PREVISAO_JSON_PATH = ML_DIR / "outputs" / "previsao.json"
LIVE_CSV_PATH = REPO_ROOT / "dados" / "clima" / "observacoes_inmet_a301.csv"
METADATA_PATH = ML_DIR / "models" / "metadata.json"

DEFAULT_ML_API_URL = os.environ.get("ML_API_URL", "http://localhost:8000")


def _resumir_resposta(dados: dict, origem: str) -> dict:
    principal = dados.get("previsao_principal") or dados.get("previsoes", {}).get(
        "3h_acum_10mm", {}
    )
    intensidade = dados.get("previsao_intensidade") or dados.get(
        "previsoes", {}
    ).get("3h_10mm", {})
    moderada_3h = dados.get("previsoes", {}).get("3h_5mm", {})

    alerta_forte = bool(
        (principal and principal.get("alerta"))
        or (intensidade and intensidade.get("alerta"))
    )
    monitoramento = bool(
        alerta_forte
        or (principal and principal.get("monitoramento"))
        or (intensidade and intensidade.get("monitoramento"))
        or (moderada_3h and moderada_3h.get("monitoramento"))
    )

    if alerta_forte:
        nivel_chuva = "alerta"
    elif monitoramento:
        nivel_chuva = "monitoramento"
    else:
        nivel_chuva = "sem_alerta"

    return {
        "disponivel": True,
        "origem": origem,
        "gerado_em": dados.get("gerado_em"),
        "modelo_versao": dados.get("modelo_versao"),
        "nivel_chuva": nivel_chuva,
        "alerta": alerta_forte,
        "monitoramento": monitoramento,
        "probabilidade_3h_acum_10mm": (
            principal.get("probabilidade") if principal else None
        ),
        "probabilidade_3h_10mm": (
            intensidade.get("probabilidade") if intensidade else None
        ),
        "observacao": dados.get("observacao", {}),
        "previsao_principal": principal,
        "previsao_intensidade": intensidade,
        "previsoes": dados.get("previsoes", {}),
        "recomendacao": dados.get(
            "recomendacao",
            "Sem indicativo de chuva significativa nas proximas horas.",
        ),
    }


def _tentar_inferencia_local() -> dict | None:
    if PREVISAO_JSON_PATH.exists():
        try:
            dados = json.loads(PREVISAO_JSON_PATH.read_text(encoding="utf-8"))
            if "previsao_principal" in dados or "previsoes" in dados:
                return _resumir_resposta(dados, origem="arquivo_previsao")
        except Exception:  # noqa: BLE001
            pass

    if METADATA_PATH.exists() and LIVE_CSV_PATH.exists():
        try:
            if str(ML_DIR) not in sys.path:
                sys.path.insert(0, str(ML_DIR))
            from predict import prever_arquivo  # type: ignore[import-not-found]

            dados = prever_arquivo(LIVE_CSV_PATH)
            return _resumir_resposta(dados, origem="inferencia_local")
        except Exception:  # noqa: BLE001
            return None

    return None


def consultar_previsao(
    api_url: str | None = None,
    timeout: int = 5,
    usar_fallback_local: bool = True,
) -> dict:
    """Consulta a previsao de 3h na API do ML com fallback e degradacao segura."""
    url_base = (api_url or DEFAULT_ML_API_URL).rstrip("/")
    erro_api = None

    try:
        resp = requests.get(
            f"{url_base}/prever/atual",
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        dados = resp.json()
        return _resumir_resposta(dados, origem=f"api ({url_base})")
    except Exception as exc:  # noqa: BLE001
        erro_api = str(exc)

    if usar_fallback_local:
        local = _tentar_inferencia_local()
        if local is not None:
            local["aviso_api"] = f"API indisponivel ({erro_api}); usando dados locais."
            return local

    return {
        "disponivel": False,
        "origem": "indisponivel",
        "gerado_em": None,
        "modelo_versao": None,
        "nivel_chuva": "sem_previsao",
        "alerta": False,
        "monitoramento": False,
        "probabilidade_3h_acum_10mm": None,
        "probabilidade_3h_10mm": None,
        "observacao": {},
        "previsao_principal": None,
        "previsao_intensidade": None,
        "previsoes": {},
        "recomendacao": (
            "Previsao de chuva indisponivel no momento. "
            "Exibindo apenas o risco historico do bairro."
        ),
        "erro": erro_api,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Consulta a previsao de chuva (3h) do modelo de ML."
    )
    parser.add_argument("--url", default=DEFAULT_ML_API_URL)
    parser.add_argument("--timeout", type=int, default=5)
    parser.add_argument(
        "--sem-fallback-local",
        action="store_true",
        help="Nao tenta ler outputs/previsao.json ou rodar predict.py se a API falhar.",
    )
    args = parser.parse_args()

    resultado = consultar_previsao(
        api_url=args.url,
        timeout=args.timeout,
        usar_fallback_local=not args.sem_fallback_local,
    )
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
