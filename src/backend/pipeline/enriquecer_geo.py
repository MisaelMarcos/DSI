# Geocodifica cada bairro de Recife (Nominatim) e busca a elevação
# (Open-Meteo). Salva em data/bairros_geo.csv (cache, só baixa o que falta).
import csv
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR, carregar_bairros

DESTINO = DATA_DIR / "bairros_geo.csv"
HEADERS = {"User-Agent": "AlertaChuvaRecife/1.0 (TCC)"}


def carregar_cache():
    cache = {}
    if DESTINO.exists():
        with DESTINO.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                cache[row["bairro"]] = row
    return cache


def geocodificar(bairro: str):
    resp = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": f"{bairro}, Recife, Pernambuco, Brasil", "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=20,
    )
    resultados = resp.json()
    if resultados:
        return resultados[0]["lat"], resultados[0]["lon"]
    return None, None


def elevacao(lat, lon):
    resp = requests.get(
        "https://api.open-meteo.com/v1/elevation",
        params={"latitude": lat, "longitude": lon},
        timeout=20,
    )
    dados = resp.json()
    try:
        return dados["elevation"][0]
    except (KeyError, IndexError, TypeError):
        return ""


if __name__ == "__main__":
    cache = carregar_cache()
    bairros = carregar_bairros()
    faltantes = [b for b in bairros if b not in cache]
    print(f"{len(faltantes)} bairros para geocodificar")

    for bairro in faltantes:
        lat, lon = geocodificar(bairro)
        elev = elevacao(lat, lon) if lat else ""
        cache[bairro] = {"bairro": bairro, "lat": lat or "", "lon": lon or "", "elevacao_m": elev}
        print(f"  {bairro}: lat={lat} lon={lon} elev={elev}")
        time.sleep(1.1)  # Nominatim exige <= 1 req/s

    with DESTINO.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["bairro", "lat", "lon", "elevacao_m"])
        writer.writeheader()
        for bairro in bairros:
            if bairro in cache:
                writer.writerow(cache[bairro])
    print(f"Salvo em {DESTINO}")
