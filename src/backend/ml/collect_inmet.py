"""Coleta a observacao horaria atual do INMET A301 e features do Open-Meteo.

O INMET fornece a chuva observada. O Open-Meteo fornece features atmosfericas
(nuvens, radiacao, vento, camada limite) e serve como fallback caso a API do
INMET esteja indisponivel. Quando o CSV ao vivo tem menos de 24 horas, o
coletor preenche automaticamente a janela das ultimas 48h para que predict.py
funcione imediatamente na primeira execucao.

Uso (a partir de src/backend/ml):
    .venv\\Scripts\\python.exe collect_inmet.py
    .venv\\Scripts\\python.exe collect_inmet.py --loop --interval 600
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

from config import (
    ESTACAO,
    INMET_ESTACAO_URL,
    LATITUDE,
    LIVE_CSV,
    LONGITUDE,
    OPEN_METEO_URL,
    TIMEZONE,
)

JANELA_MINIMA_H = 24

COLUNAS_OM = [
    "om_temp",
    "om_umid",
    "om_dew",
    "om_pressao",
    "om_precip",
    "om_wind",
    "om_wind_dir",
    "om_gust",
    "om_cloud",
    "om_cloud_low",
    "om_cloud_mid",
    "om_cloud_high",
    "om_rad",
    "om_blh",
]

COLUNAS_LIVE = [
    "datetime",
    "precip_mm",
    "pressao_mb",
    "temp_c",
    "temp_orvalho_c",
    "umid_pct",
    "vento_vel_ms",
    "vento_dir_gr",
    "vento_rajada_ms",
    "fonte",
    "om_disponivel",
    *COLUNAS_OM,
]


def _float(valor, padrao: float = 0.0) -> float:
    try:
        if valor is None or str(valor).strip() in {"", "-", "--", "-9999"}:
            return padrao
        return float(str(valor).replace(",", "."))
    except (TypeError, ValueError):
        return padrao


def _datetime_utc(data: str, hora: str) -> pd.Timestamp:
    hora = "".join(ch for ch in str(hora) if ch.isdigit()).zfill(4)
    timestamp = pd.Timestamp(
        f"{str(data).strip()} {hora[:2]}:{hora[2:4]}:00"
    )
    return timestamp.tz_localize("UTC")


def _parse_item_inmet(dados: dict, estacao_padrao: str = "") -> dict | None:
    if not isinstance(dados, dict):
        return None
    codigo = str(dados.get("CD_ESTACAO") or estacao_padrao or "")
    if codigo and codigo != ESTACAO:
        raise ValueError(f"Estacao inesperada: {codigo} (esperava {ESTACAO}).")

    data_med = dados.get("DT_MEDICAO", "")
    hora_med = dados.get("HR_MEDICAO", "")
    if not data_med or hora_med is None:
        return None

    dt = _datetime_utc(data_med, hora_med)
    # Se todos os sensores principais vierem vazios na hora ainda nao fechada, ignora
    tem_leitura = any(
        dados.get(c) not in (None, "", "-", "--", "-9999")
        for c in ("CHUVA", "PRE_INS", "TEM_INS", "UMD_INS")
    )
    if not tem_leitura:
        return None

    return {
        "datetime": dt.isoformat(),
        "precip_mm": _float(dados.get("CHUVA"), 0.0),
        "pressao_mb": _float(dados.get("PRE_INS"), 0.0),
        "temp_c": _float(dados.get("TEM_INS"), 0.0),
        "temp_orvalho_c": _float(dados.get("PTO_INS"), 0.0),
        "umid_pct": _float(dados.get("UMD_INS"), 0.0),
        "vento_vel_ms": _float(dados.get("VEN_VEL"), 0.0),
        "vento_dir_gr": _float(dados.get("VEN_DIR"), 0.0),
        "vento_rajada_ms": _float(dados.get("VEN_RAJ"), 0.0),
        "fonte": "INMET A301",
    }


def buscar_inmet_serie(timeout: int = 30) -> list[dict]:
    """Retorna todas as leituras horarias validas devolvidas pelo endpoint do INMET."""
    resposta = requests.get(
        INMET_ESTACAO_URL,
        timeout=timeout,
        headers={"User-Agent": "AlertaChuvaRecife/1.0"},
    )
    resposta.raise_for_status()
    payload = resposta.json()
    estacao_codigo = str(payload.get("estacao", {}).get("CODIGO", ""))
    if estacao_codigo and estacao_codigo != ESTACAO:
        raise ValueError(
            f"Estacao inesperada: {estacao_codigo} (esperava {ESTACAO})."
        )

    bruto = payload.get("dados")
    itens = bruto if isinstance(bruto, list) else ([bruto] if isinstance(bruto, dict) else [])
    if not itens:
        raise ValueError("INMET retornou lista de dados vazia.")

    registros = []
    for item in itens:
        parsed = _parse_item_inmet(item, estacao_codigo)
        if parsed is not None:
            registros.append(parsed)

    if not registros:
        # Fallback para o ultimo item mesmo que sensores estejam parciais
        ultimo = itens[-1]
        if not isinstance(ultimo, dict):
            raise ValueError("Formato inesperado da resposta do INMET.")
        dt = _datetime_utc(ultimo.get("DT_MEDICAO", ""), ultimo.get("HR_MEDICAO", ""))
        registros.append(
            {
                "datetime": dt.isoformat(),
                "precip_mm": _float(ultimo.get("CHUVA"), 0.0),
                "pressao_mb": _float(ultimo.get("PRE_INS"), 0.0),
                "temp_c": _float(ultimo.get("TEM_INS"), 0.0),
                "temp_orvalho_c": _float(ultimo.get("PTO_INS"), 0.0),
                "umid_pct": _float(ultimo.get("UMD_INS"), 0.0),
                "vento_vel_ms": _float(ultimo.get("VEN_VEL"), 0.0),
                "vento_dir_gr": _float(ultimo.get("VEN_DIR"), 0.0),
                "vento_rajada_ms": _float(ultimo.get("VEN_RAJ"), 0.0),
                "fonte": "INMET A301",
            }
        )
    return registros


def buscar_inmet(timeout: int = 30) -> dict:
    return buscar_inmet_serie(timeout=timeout)[-1]


def buscar_open_meteo(timeout: int = 30) -> dict:
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "current": (
            "precipitation,temperature_2m,relative_humidity_2m,"
            "dew_point_2m,surface_pressure,wind_speed_10m,"
            "wind_direction_10m,wind_gusts_10m,cloud_cover,"
            "cloud_cover_low,cloud_cover_mid,cloud_cover_high,"
            "shortwave_radiation,boundary_layer_height"
        ),
        "timezone": TIMEZONE,
    }
    resposta = requests.get(
        OPEN_METEO_URL,
        params=params,
        timeout=timeout,
        headers={"User-Agent": "AlertaChuvaRecife/1.0"},
    )
    resposta.raise_for_status()
    atual = resposta.json().get("current", {})
    if not atual:
        raise ValueError("Open-Meteo retornou 'current' vazio.")

    dt_local = pd.Timestamp(atual["time"]).tz_localize(
        TIMEZONE, ambiguous="NaT", nonexistent="NaT"
    )
    if pd.isna(dt_local):
        raise ValueError("Horario local invalido no Open-Meteo.")
    dt_utc = dt_local.tz_convert("UTC")

    velocidade_kmh = _float(atual.get("wind_speed_10m"), 0.0)
    rajada_kmh = _float(atual.get("wind_gusts_10m"), 0.0)
    return {
        "datetime": dt_utc.isoformat(),
        "precip_mm": _float(atual.get("precipitation"), 0.0),
        "pressao_mb": _float(
            atual.get("surface_pressure", atual.get("pressure_msl")), 0.0
        ),
        "temp_c": _float(atual.get("temperature_2m"), 0.0),
        "temp_orvalho_c": _float(atual.get("dew_point_2m"), 0.0),
        "umid_pct": _float(atual.get("relative_humidity_2m"), 0.0),
        "vento_vel_ms": velocidade_kmh / 3.6,
        "vento_dir_gr": _float(atual.get("wind_direction_10m"), 0.0),
        "vento_rajada_ms": rajada_kmh / 3.6,
        "fonte": "open-meteo (fallback)",
        "om_temp": _float(atual.get("temperature_2m"), 0.0),
        "om_umid": _float(atual.get("relative_humidity_2m"), 0.0),
        "om_dew": _float(atual.get("dew_point_2m"), 0.0),
        "om_pressao": _float(
            atual.get("surface_pressure", atual.get("pressure_msl")), 0.0
        ),
        "om_precip": _float(atual.get("precipitation"), 0.0),
        "om_wind": velocidade_kmh / 3.6,
        "om_wind_dir": _float(atual.get("wind_direction_10m"), 0.0),
        "om_gust": rajada_kmh / 3.6,
        "om_cloud": _float(atual.get("cloud_cover"), 0.0),
        "om_cloud_low": _float(atual.get("cloud_cover_low"), 0.0),
        "om_cloud_mid": _float(atual.get("cloud_cover_mid"), 0.0),
        "om_cloud_high": _float(atual.get("cloud_cover_high"), 0.0),
        "om_rad": _float(atual.get("shortwave_radiation"), 0.0),
        "om_blh": _float(atual.get("boundary_layer_height"), 0.0),
    }


def buscar_open_meteo_historico(
    past_days: int = 2,
    timeout: int = 30,
) -> list[dict]:
    """Busca serie horaria recente (ultimas 48h ate o instante atual) no Open-Meteo."""
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "past_days": past_days,
        "forecast_days": 1,
        "hourly": (
            "precipitation,temperature_2m,relative_humidity_2m,"
            "dew_point_2m,surface_pressure,wind_speed_10m,"
            "wind_direction_10m,wind_gusts_10m,cloud_cover,"
            "cloud_cover_low,cloud_cover_mid,cloud_cover_high,"
            "shortwave_radiation,boundary_layer_height"
        ),
        "timezone": "UTC",
    }
    resposta = requests.get(
        OPEN_METEO_URL,
        params=params,
        timeout=timeout,
        headers={"User-Agent": "AlertaChuvaRecife/1.0"},
    )
    resposta.raise_for_status()
    hourly = resposta.json().get("hourly", {})
    tempos = hourly.get("time", [])
    if not tempos:
        raise ValueError("Open-Meteo retornou 'hourly.time' vazio.")

    agora_utc = pd.Timestamp.now(tz="UTC").floor("h")
    registros: list[dict] = []

    def _val(chave: str, idx: int) -> float:
        lista = hourly.get(chave, [])
        return _float(lista[idx] if idx < len(lista) else 0.0, 0.0)

    for i, t_str in enumerate(tempos):
        dt_utc = pd.Timestamp(t_str, tz="UTC")
        if dt_utc > agora_utc:
            continue
        vel_ms = _val("wind_speed_10m", i) / 3.6
        raj_ms = _val("wind_gusts_10m", i) / 3.6
        precip = _val("precipitation", i)
        pressao = _val("surface_pressure", i)
        temp = _val("temperature_2m", i)
        dew = _val("dew_point_2m", i)
        umid = _val("relative_humidity_2m", i)
        wdir = _val("wind_direction_10m", i)

        registros.append(
            {
                "datetime": dt_utc.isoformat(),
                "precip_mm": precip,
                "pressao_mb": pressao,
                "temp_c": temp,
                "temp_orvalho_c": dew,
                "umid_pct": umid,
                "vento_vel_ms": vel_ms,
                "vento_dir_gr": wdir,
                "vento_rajada_ms": raj_ms,
                "fonte": "open-meteo (backfill)",
                "om_disponivel": 1,
                "om_temp": temp,
                "om_umid": umid,
                "om_dew": dew,
                "om_pressao": pressao,
                "om_precip": precip,
                "om_wind": vel_ms,
                "om_wind_dir": wdir,
                "om_gust": raj_ms,
                "om_cloud": _val("cloud_cover", i),
                "om_cloud_low": _val("cloud_cover_low", i),
                "om_cloud_mid": _val("cloud_cover_mid", i),
                "om_cloud_high": _val("cloud_cover_high", i),
                "om_rad": _val("shortwave_radiation", i),
                "om_blh": _val("boundary_layer_height", i),
            }
        )
    return registros


def _contar_linhas_existentes(caminho: Path) -> int:
    if not caminho.exists() or caminho.stat().st_size == 0:
        return 0
    try:
        df = pd.read_csv(caminho, usecols=["datetime"], dtype=str)
        return int(df["datetime"].dropna().nunique())
    except Exception:  # noqa: BLE001
        return 0


def salvar_observacoes(
    registros: list[dict],
    caminho: str | Path = LIVE_CSV,
) -> Path:
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    novo = pd.DataFrame(
        [{coluna: reg.get(coluna) for coluna in COLUNAS_LIVE} for reg in registros]
    )

    if caminho.exists() and caminho.stat().st_size > 0:
        antigo = pd.read_csv(caminho, dtype=str)
        df = pd.concat([antigo, novo], ignore_index=True)
    else:
        df = novo

    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce", utc=True)
    df = df.dropna(subset=["datetime"]).sort_values("datetime")
    df = df.drop_duplicates("datetime", keep="last")
    df["datetime"] = df["datetime"].dt.strftime("%Y-%m-%dT%H:%M:%S%z")
    df.to_csv(caminho, index=False, encoding="utf-8")
    return caminho


def salvar_observacao(registro: dict, caminho: str | Path = LIVE_CSV) -> Path:
    return salvar_observacoes([registro], caminho)


def preencher_janela_minima(caminho: str | Path = LIVE_CSV) -> int:
    """Garante pelo menos 24h de historico combinando Open-Meteo (48h) e INMET."""
    caminho = Path(caminho)
    om_por_hora: dict[pd.Timestamp, dict] = {}
    try:
        for item in buscar_open_meteo_historico(past_days=2):
            ts = pd.Timestamp(item["datetime"]).tz_convert("UTC").floor("h")
            om_por_hora[ts] = item
    except Exception as exc:  # noqa: BLE001
        print(f"[aviso] Backfill Open-Meteo indisponivel: {exc}")

    inmet_por_hora: dict[pd.Timestamp, dict] = {}
    try:
        for item in buscar_inmet_serie():
            ts = pd.Timestamp(item["datetime"]).tz_convert("UTC").floor("h")
            inmet_por_hora[ts] = item
    except Exception as exc:  # noqa: BLE001
        print(f"[aviso] Serie INMET indisponivel no backfill: {exc}")

    todas_horas = sorted(set(om_por_hora.keys()) | set(inmet_por_hora.keys()))
    if not todas_horas:
        return 0

    mesclados: list[dict] = []
    for ts in todas_horas:
        om_item = om_por_hora.get(ts)
        inmet_item = inmet_por_hora.get(ts)
        if inmet_item is not None and om_item is not None:
            reg = dict(inmet_item)
            reg.update(
                {k: v for k, v in om_item.items() if k.startswith("om_")}
            )
            reg["om_disponivel"] = 1
            mesclados.append(reg)
        elif inmet_item is not None:
            reg = dict(inmet_item)
            reg["om_disponivel"] = 0
            mesclados.append(reg)
        elif om_item is not None:
            mesclados.append(dict(om_item))

    salvar_observacoes(mesclados, caminho)
    return len(mesclados)


def coletar_uma_vez(
    caminho: str | Path = LIVE_CSV,
    garantir_janela: bool = True,
) -> dict:
    caminho = Path(caminho)
    if garantir_janela and _contar_linhas_existentes(caminho) < JANELA_MINIMA_H:
        preencher_janela_minima(caminho)

    open_meteo = None
    try:
        open_meteo = buscar_open_meteo()
    except Exception as exc:  # noqa: BLE001
        print(f"[aviso] Open-Meteo indisponivel: {exc}")

    try:
        registro = buscar_inmet()
        if open_meteo is not None:
            registro.update(
                {
                    chave: valor
                    for chave, valor in open_meteo.items()
                    if chave.startswith("om_")
                }
            )
        registro["om_disponivel"] = int(open_meteo is not None)
    except Exception as exc:  # noqa: BLE001
        print(f"[aviso] INMET indisponivel: {exc}")
        if open_meteo is None:
            raise
        print("[aviso] usando Open-Meteo como fallback para a observacao.")
        registro = open_meteo
        registro["fonte"] = "open-meteo (fallback)"
        registro["om_disponivel"] = 1

    salvar_observacao(registro, caminho)
    return registro


def main() -> int:
    parser = argparse.ArgumentParser(description="Coletor horario INMET A301.")
    parser.add_argument("--saida", type=Path, default=LIVE_CSV)
    parser.add_argument("--loop", action="store_true")
    parser.add_argument("--interval", type=int, default=600)
    parser.add_argument(
        "--sem-backfill",
        action="store_true",
        help="Nao preenche automaticamente as ultimas 48h quando o CSV tem < 24h.",
    )
    args = parser.parse_args()

    while True:
        try:
            registro = coletar_uma_vez(
                args.saida,
                garantir_janela=not args.sem_backfill,
            )
            total_linhas = _contar_linhas_existentes(args.saida)
            print(
                json.dumps(
                    {
                        "coletado_em_utc": datetime.now(timezone.utc).isoformat(),
                        "total_horas_buffer": total_linhas,
                        "registro": registro,
                        "arquivo": str(args.saida),
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[erro] falha ao coletar: {exc}")
            if not args.loop:
                return 1
        if not args.loop:
            return 0
        time.sleep(max(args.interval, 60))


if __name__ == "__main__":
    raise SystemExit(main())
