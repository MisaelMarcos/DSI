"""Testes da engenharia de features e das metricas."""

from __future__ import annotations

import numpy as np
import pandas as pd

from features import construir_features
from metrics import avaliar_eventos, escolher_limiar, escolher_limiar_f1


def _base_sintetica(n: int = 48) -> pd.DataFrame:
    datas = pd.date_range("2020-01-01", periods=n, freq="h", tz="America/Recife")
    df = pd.DataFrame(
        {
            "datetime_local": datas,
            "datetime_utc": datas.tz_convert("UTC"),
            "ano": datas.year,
            "mes": datas.month,
            "hora": datas.hour,
            "precip_mm_limpa": 0.0,
            "pressao_mb": 1013.0,
            "temp_c": 28.0,
            "temp_orvalho_c": 22.0,
            "umid_pct": 75.0,
            "om_temp": 28.0,
            "om_umid": 75.0,
            "om_dew": 22.0,
            "om_pressao": 1013.0,
            "om_precip": 0.0,
            "om_wind": 3.0,
            "om_wind_dir": 90.0,
            "om_gust": 6.0,
            "om_cloud": 40.0,
            "om_cloud_low": 10.0,
            "om_cloud_mid": 20.0,
            "om_cloud_high": 10.0,
            "om_rad": 500.0,
            "om_blh": 700.0,
        }
    )
    # Evento de 3 horas com 6 mm/h em t=10,11,12.
    df.loc[10:12, "precip_mm_limpa"] = 6.0
    # Evento isolado de 11 mm/h em t=20, para o alvo de intensidade 10 mm/h.
    df.loc[20, "precip_mm_limpa"] = 11.0
    return df


def test_features_e_alvos():
    df = construir_features(_base_sintetica())
    # Em t=9, as proximas 3h sao 10,11,12.
    assert df.loc[9, "alvo_3h_5mm"] == 1
    assert df.loc[9, "alvo_3h_10mm"] == 0
    assert df.loc[9, "alvo_3h_acum_10mm"] == 1
    assert df.loc[9, "alvo_3h_acum_20mm"] == 0
    assert df.loc[6, "alvo_3h_10mm"] == 0
    assert df.loc[9, "acum_fut_3h"] == 18.0
    # Em t=19, a hora 20 tem 11 mm/h.
    assert df.loc[19, "alvo_3h_10mm"] == 1
    # Features em t=9 nao podem enxergar a chuva futura.
    df2_bruto = _base_sintetica()
    df2_bruto.loc[10:12, "precip_mm_limpa"] = 0.0
    df2 = construir_features(df2_bruto)
    assert df.loc[9, "chuva_3h"] == df2.loc[9, "chuva_3h"]
    assert df.loc[9, "chuva_1h"] == df2.loc[9, "chuva_1h"]
    assert "om_wind_dir_sin" in df.columns
    assert "om_precip_3h" in df.columns


def test_metricas_e_eventos():
    y = np.array([0, 1, 1, 0, 1])
    pred = np.array([1, 0, 0, 0, 0])
    eventos = avaliar_eventos(y, pred, horizonte=3)
    assert eventos["eventos"] == 2
    assert eventos["eventos_com_alerta"] == 1
    assert eventos["antecedencia_max_h"] == 1.0

    y2 = np.array([0, 0, 1, 1])
    proba = np.array([0.1, 0.2, 0.8, 0.9])
    corte = escolher_limiar(y2, proba, alvo_recall=1.0)
    assert corte["limiar"] <= 0.8
    corte_f1 = escolher_limiar_f1(y2, proba)
    assert 0.2 <= corte_f1["limiar"] <= 0.8
