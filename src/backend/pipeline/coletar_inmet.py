# Coleta avisos meteorologicos do INMET para Recife via Google News RSS.
# A API oficial do INMET exige rota/registro especifico e hoje nao esta
# publica de forma estavel, entao usamos o agregador. Salva em
# data/bruto_inmet.jsonl.
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import feedparser

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR, salvar_jsonl

DESTINO = DATA_DIR / "bruto_inmet.jsonl"
TERMOS = ["inmet recife", "inmet pernambuco alerta", "aviso meteorologico recife"]

if __name__ == "__main__":
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
                    "fonte": "INMET (via Google News)",
                    "fonte_tipo": "alerta_oficial",
                    "termo": termo,
                    "coletado_em": datetime.now(timezone.utc).isoformat(),
                }
            )
    novos = salvar_jsonl(registros, DESTINO)
    print(f"{len(registros)} encontrados, {novos} novos em {DESTINO}")
