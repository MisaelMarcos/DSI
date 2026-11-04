"""Baixa features historicas do Open-Meteo para Recife (2019-2020).

As variaveis de chuva observada e os alvos continuam vindo do INMET A301.
O Open-Meteo entra apenas como fonte de features atmosfericas (nuvens,
radiacao, vento e camada limite), disponiveis tambem na previsao atual.

Uso:
    .venv\\Scripts\\python.exe baixar_open_meteo.py
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

import pandas as pd
import requests

from config import LATITUDE, LONGITUDE, OPEN_METEO_ARCHIVE_URL, OPEN_METEO_CSV

GRUPOS = {
    "base": (
        "temperature_2m,relative_humidity_2m,dew_point_2m,"
        "surface_pressure,precipitation,wind_speed_10m,"
        "wind_direction_10m,wind_gusts_10m"
    ),
    "nuvens": (
        "cloud_cover,cloud_cover_low,cloud_cover_mid,"
        "cloud_cover_high,shortwave_radiation"
    ),
    "camada_limite": "boundary_layer_height",
}

RENOMEAR = {
    "temperature_2m": "om_temp",
    "relative_humidity_2m": "om_umid",
    "dew_point_2m": "om_dew",
    "surface_pressure": "om_pressao",
    "precipitation": "om_precip",
    "wind_speed_10m": "om_wind",
    "wind_direction_10m": "om_wind_dir",
    "wind_gusts_10m": "om_gust",
    "cloud_cover": "om_cloud",
    "cloud_cover_low": "om_cloud_low",
    "cloud_cover_mid": "om_cloud_mid",
    "cloud_cover_high": "om_cloud_high",
    "shortwave_radiation": "om_rad",
    "boundary_layer_height": "om_blh",
}

COLUNAS = [
    "datetime_utc",
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


def baixar_grupo(nome: str, variaveis: str, inicio: str, fim: str) -> pd.DataFrame:
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "start_date": inicio,
        "end_date": fim,
        "hourly": variaveis,
        "timezone": "UTC",
    }
    ultimo_erro = None
    for tentativa in range(1, 4):
        try:
            resposta = requests.get(
                OPEN_METEO_ARCHIVE_URL,
                params=params,
                timeout=240,
                headers={"User-Agent": "AlertaChuvaRecife/1.0"},
            )
            resposta.raise_for_status()
            dados = resposta.json()
            if "hourly" not in dados:
                raise ValueError(dados)
            df = pd.DataFrame(dados["hourly"])
            df["time"] = pd.to_datetime(df["time"], utc=True)
            print(f"[ok] {nome}: {len(df)} horas")
            return df.set_index("time")
        except Exception as exc:  # noqa: BLE001
            ultimo_erro = exc
            print(f"[aviso] {nome} tentativa {tentativa}/3 falhou: {exc}")
            time.sleep(3)
    raise RuntimeError(f"Falha ao baixar grupo {nome}: {ultimo_erro}")


def baixar(inicio: str = "2019-01-01", fim: str = "2020-12-31") -> pd.DataFrame:
    partes = [
        baixar_grupo(nome, variaveis, inicio, fim)
        for nome, variaveis in GRUPOS.items()
    ]
    df = pd.concat(partes, axis=1)
    df = df.rename(columns=RENOMEAR)
    df = df.loc[:, ~df.columns.duplicated()]
    df = df.reset_index().rename(columns={"time": "datetime_utc"})
    for coluna in COLUNAS:
        if coluna not in df.columns:
            df[coluna] = pd.NA
    df = df[COLUNAS]
    # Remove colunas que vieram inteiramente vazias para o periodo/local.
    vazias = [c for c in df.columns if c != "datetime_utc" and df[c].isna().all()]
    if vazias:
        print(f"[aviso] colunas vazias removidas: {vazias}")
        df = df.drop(columns=vazias)
    return df


def main() -> int:
    parser = argparse.ArgumentParser(description="Baixa Open-Meteo historico.")
    parser.add_argument("--inicio", default="2019-01-01")
    parser.add_argument("--fim", default="2020-12-31")
    parser.add_argument("--saida", type=Path, default=OPEN_METEO_CSV)
    args = parser.parse_args()

    df = baixar(args.inicio, args.fim)
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.saida, index=False)
    print(f"Salvo: {args.saida} ({len(df)} linhas, {args.saida.stat().st_size} bytes)")
    print(df.head(3).to_string(index=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
