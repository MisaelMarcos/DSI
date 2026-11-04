"""Testes de fumaca da API (dependem dos modelos treinados)."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from api import app
from config import METADATA_PATH
from features import preparar_base

pytestmark = pytest.mark.skipif(
    not METADATA_PATH.exists(),
    reason="Rode train.py antes dos testes da API.",
)


def _payload() -> dict:
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    df = preparar_base()
    linha = df.iloc[-1]
    features = {
        nome: float(linha[nome]) for nome in metadata["features"]
    }
    return {"features": features}


def test_health():
    with TestClient(app) as client:
        resposta = client.get("/health")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["status"] == "ok"
    assert dados["modelos_carregados"] >= 1


def test_prever_alvo_principal():
    with TestClient(app) as client:
        resposta = client.post(
            "/prever",
            json={**_payload(), "horizonte": 3, "limiar": 10, "tipo": "acum"},
        )
    assert resposta.status_code == 200, resposta.text
    dados = resposta.json()
    assert dados["alvo"] == "3h_acum_10mm"
    assert 0.0 <= dados["probabilidade"] <= 1.0
    assert "alerta" in dados
    assert "monitoramento" in dados


def test_prever_todos():
    with TestClient(app) as client:
        resposta = client.post("/prever/todos", json=_payload())
    assert resposta.status_code == 200, resposta.text
    previsoes = resposta.json()["previsoes"]
    assert "3h_acum_10mm" in previsoes
    assert "3h_10mm" in previsoes
    assert len(previsoes) >= 6


def test_prever_atual_com_csv_temporario(tmp_path, monkeypatch):
    import api as api_mod
    from collect_inmet import salvar_observacoes

    datas = [
        f"2026-06-01T{h:02d}:00:00+00:00" for h in range(24)
    ] + ["2026-06-02T00:00:00+00:00", "2026-06-02T01:00:00+00:00"]
    registros = [
        {
            "datetime": dt,
            "precip_mm": 0.0,
            "pressao_mb": 1013.0,
            "temp_c": 27.5,
            "temp_orvalho_c": 22.0,
            "umid_pct": 78.0,
            "vento_vel_ms": 3.0,
            "vento_dir_gr": 120.0,
            "vento_rajada_ms": 6.0,
            "fonte": "INMET A301",
            "om_disponivel": 1,
            "om_temp": 27.5,
            "om_umid": 78.0,
            "om_dew": 22.0,
            "om_pressao": 1013.0,
            "om_precip": 0.0,
            "om_wind": 3.0,
            "om_wind_dir": 120.0,
            "om_gust": 6.0,
            "om_cloud": 50.0,
            "om_cloud_low": 20.0,
            "om_cloud_mid": 20.0,
            "om_cloud_high": 10.0,
            "om_rad": 300.0,
            "om_blh": 700.0,
        }
        for dt in datas
    ]
    csv_temp = tmp_path / "observacoes_teste.csv"
    salvar_observacoes(registros, csv_temp)
    monkeypatch.setattr(api_mod, "LIVE_CSV", csv_temp)

    with TestClient(app) as client:
        resposta = client.get("/prever/atual")
    assert resposta.status_code == 200, resposta.text
    dados = resposta.json()
    assert "previsao_principal" in dados
    assert "previsao_intensidade" in dados
    assert dados["previsao_principal"]["modelo"] == "3h_acum_10mm"


def test_prever_simular_chuva_forte_e_restaurar(tmp_path, monkeypatch):
    import api as api_mod
    from collect_inmet import salvar_observacoes

    datas = [
        f"2026-06-01T{h:02d}:00:00+00:00" for h in range(24)
    ] + ["2026-06-02T00:00:00+00:00", "2026-06-02T01:00:00+00:00"]
    registros = [
        {
            "datetime": dt,
            "precip_mm": 0.0,
            "pressao_mb": 1013.0,
            "temp_c": 27.5,
            "temp_orvalho_c": 22.0,
            "umid_pct": 78.0,
            "vento_vel_ms": 3.0,
            "vento_dir_gr": 120.0,
            "vento_rajada_ms": 6.0,
            "fonte": "INMET A301",
            "om_disponivel": 1,
            "om_temp": 27.5,
            "om_umid": 78.0,
            "om_dew": 22.0,
            "om_pressao": 1013.0,
            "om_precip": 0.0,
            "om_wind": 3.0,
            "om_wind_dir": 120.0,
            "om_gust": 6.0,
            "om_cloud": 50.0,
            "om_cloud_low": 20.0,
            "om_cloud_mid": 20.0,
            "om_cloud_high": 10.0,
            "om_rad": 300.0,
            "om_blh": 700.0,
        }
        for dt in datas
    ]
    csv_temp = tmp_path / "observacoes_teste.csv"
    salvar_observacoes(registros, csv_temp)
    monkeypatch.setattr(api_mod, "LIVE_CSV", csv_temp)

    with TestClient(app) as client:
        sim = client.post("/prever/simular", json={"cenario": "chuva_forte"})
        assert sim.status_code == 200
        dados_sim = sim.json()
        assert dados_sim["simulado"] is True
        assert dados_sim["previsao_principal"]["alerta"] is True

        atual_sim = client.get("/prever/atual").json()
        assert atual_sim["previsao_principal"]["alerta"] is True

        restaurado = client.post("/prever/simular", json={"cenario": "real"})
        assert restaurado.status_code == 200
        assert not restaurado.json().get("simulado", False)
