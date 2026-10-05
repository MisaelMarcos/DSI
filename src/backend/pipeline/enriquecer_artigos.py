# Busca o corpo de cada noticia/alerta para melhorar o match de bairro.
# Salva {url, texto} em data/corpos.jsonl (reutilizavel entre rodadas).
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from googlenewsdecoder import gnewsdecoder

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR, carregar_jsonl, salvar_jsonl

DESTINO = DATA_DIR / "corpos.jsonl"
FONTES = ["bruto_noticias.jsonl", "bruto_inmet.jsonl", "bruto_defesacivil.jsonl"]
HEADERS = {"User-Agent": "Mozilla/5.0"}


def extrair_texto(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    texto = " ".join(p.get_text(" ", strip=True) for p in soup.find_all("p"))
    return re.sub(r"\s+", " ", texto).strip()[:2000]


def buscar(url: str) -> dict:
    try:
        if "news.google.com" in url:
            decoded = gnewsdecoder(url)
            if decoded.get("success"):
                url_fetch = decoded["decoded_url"]
            else:
                return {"url": url, "texto": ""}
        else:
            url_fetch = url
        resp = requests.get(url_fetch, timeout=12, headers=HEADERS, allow_redirects=True)
        return {"url": url, "texto": extrair_texto(resp.text)}
    except (requests.RequestException, Exception):
        return {"url": url, "texto": ""}


if __name__ == "__main__":
    ja_feitos = {r["url"] for r in carregar_jsonl(DESTINO)}
    urls = []
    for fonte in FONTES:
        for reg in carregar_jsonl(DATA_DIR / fonte):
            url = reg.get("url")
            if url and url not in ja_feitos and url not in urls:
                urls.append(url)

    print(f"Buscando corpo de {len(urls)} paginas...")
    resultados = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(buscar, u): u for u in urls}
        for i, futuro in enumerate(as_completed(futures), 1):
            resultados.append(futuro.result())
            if i % 50 == 0:
                print(f"  {i}/{len(urls)}")

    novos = salvar_jsonl(resultados, DESTINO)
    com_texto = sum(1 for r in resultados if r["texto"])
    print(f"{com_texto}/{len(resultados)} com texto extraido, {novos} salvos em {DESTINO}")
