# Coleta manchetes de alagamento/enchente em Recife via Google News RSS
# e GDELT. Salva bruto em data/bruto_noticias.jsonl.
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR, TERMOS_BUSCA, salvar_jsonl

DESTINO = DATA_DIR / "bruto_noticias.jsonl"


def coletar_google_news():
    registros = []
    for termo in TERMOS_BUSCA:
        url = (
            "https://news.google.com/rss/search?q="
            + urllib.parse.quote(termo)
            + "&hl=pt-BR&gl=BR&ceid=BR:pt-419"
        )
        feed = feedparser.parse(url)
        for entry in feed.entries:
            registros.append(
                {
                    "titulo": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "data": entry.get("published", ""),
                    "fonte": entry.get("source", {}).get("title", "Google News"),
                    "fonte_tipo": "noticia",
                    "termo": termo,
                    "coletado_em": datetime.now(timezone.utc).isoformat(),
                }
            )
    return registros


def coletar_bing():
    # Links diretos das materias (diferente do Google News, que redireciona).
    registros = []
    for termo in TERMOS_BUSCA:
        url = (
            "https://www.bing.com/news/search?q="
            + urllib.parse.quote(termo)
            + "&format=rss&setlang=pt-br&cc=BR"
        )
        for entry in feedparser.parse(url).entries:
            registros.append(
                {
                    "titulo": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "data": entry.get("published", ""),
                    "fonte": entry.get("source", {}).get("title", "Bing News"),
                    "fonte_tipo": "noticia",
                    "termo": termo,
                    "descricao": entry.get("summary", ""),
                    "coletado_em": datetime.now(timezone.utc).isoformat(),
                }
            )
    return registros


def coletar_gdelt():
    registros = []
    for termo in TERMOS_BUSCA:
        try:
            resp = requests.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query": f'"{termo}"',
                    "mode": "artlist",
                    "format": "json",
                    "maxrecords": 50,
                    "timespan": "1year",
                },
                timeout=30,
            )
            artigos = resp.json().get("articles", [])
        except (ValueError, requests.RequestException):
            continue
        for art in artigos:
            registros.append(
                {
                    "titulo": art.get("title", ""),
                    "url": art.get("url", ""),
                    "data": art.get("seendate", ""),
                    "fonte": art.get("domain", "GDELT"),
                    "fonte_tipo": "noticia",
                    "termo": termo,
                    "coletado_em": datetime.now(timezone.utc).isoformat(),
                }
            )
    return registros


if __name__ == "__main__":
    encontrados = coletar_google_news() + coletar_gdelt() + coletar_bing()
    novos = salvar_jsonl(encontrados, DESTINO)
    print(f"{len(encontrados)} encontrados, {novos} novos em {DESTINO}")
