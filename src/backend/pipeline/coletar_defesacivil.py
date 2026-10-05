# Coleta mencoes da Defesa Civil PE via Google News RSS
# e tenta raspar a pagina de noticias do site oficial.
# Salva em data/bruto_defesacivil.jsonl.
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR, salvar_jsonl

DESTINO = DATA_DIR / "bruto_defesacivil.jsonl"
TERMOS = ["defesa civil recife", "defesa civil pernambuco alerta", "codecipe recife"]
SITE = "https://www.defesacivil.pe.gov.br"


def coletar_rss():
    registros = []
    for termo in TERMOS:
        url = (
            "https://news.google.com/rss/search?q="
            + urllib.parse.quote(termo)
            + "&hl=pt-BR&gl=BR&ceid=BR:pt-419"
        )
        for entry in feedparser.parse(url).entries:
            registros.append(
                {
                    "titulo": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "data": entry.get("published", ""),
                    "fonte": "Defesa Civil (via Google News)",
                    "fonte_tipo": "alerta_oficial",
                    "termo": termo,
                    "coletado_em": datetime.now(timezone.utc).isoformat(),
                }
            )
    return registros


def coletar_site():
    registros = []
    try:
        resp = requests.get(SITE, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.find_all("a", href=True):
            texto = a.get_text(strip=True)
            if any(p in texto.lower() for p in ["alagamento", "chuva", "enchente", "risco", "alerta"]):
                href = a["href"]
                if href.startswith("/"):
                    href = SITE + href
                registros.append(
                    {
                        "titulo": texto,
                        "url": href,
                        "data": "",
                        "fonte": "Defesa Civil PE",
                        "fonte_tipo": "alerta_oficial",
                        "termo": "site",
                        "coletado_em": datetime.now(timezone.utc).isoformat(),
                    }
                )
    except requests.RequestException as exc:
        print(f"Falha ao acessar site da Defesa Civil: {exc}")
    return registros


if __name__ == "__main__":
    encontrados = coletar_rss() + coletar_site()
    novos = salvar_jsonl(encontrados, DESTINO)
    print(f"{len(encontrados)} encontrados, {novos} novos em {DESTINO}")
