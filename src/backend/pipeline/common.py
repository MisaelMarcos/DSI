# Helpers compartilhados pelos coletores e extratores.
import json
import re
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

TERMOS_BUSCA = [
    "alagamento recife",
    "enchente recife",
    "ponto de alagamento recife",
    "alagamento pernambuco",
    "defesa civil recife",
]


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto or "")
    texto = texto.encode("ascii", "ignore").decode("ascii")
    texto = texto.lower()
    texto = re.sub(r"[^a-z0-9\s]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def salvar_jsonl(registros, caminho: Path):
    vistos = set()
    if caminho.exists():
        for linha in caminho.read_text(encoding="utf-8").splitlines():
            try:
                vistos.add(json.loads(linha).get("url"))
            except json.JSONDecodeError:
                continue
    novos = 0
    with caminho.open("a", encoding="utf-8") as f:
        for reg in registros:
            if reg.get("url") in vistos:
                continue
            f.write(json.dumps(reg, ensure_ascii=False) + "\n")
            vistos.add(reg.get("url"))
            novos += 1
    return novos


def carregar_jsonl(caminho: Path):
    if not caminho.exists():
        return []
    registros = []
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        try:
            registros.append(json.loads(linha))
        except json.JSONDecodeError:
            continue
    return registros


def carregar_bairros():
    caminho = DATA_DIR / "bairros_recife.csv"
    bairros = []
    for linha in caminho.read_text(encoding="utf-8").splitlines()[1:]:
        nome = linha.split(",")[0].strip()
        if nome:
            bairros.append(nome)
    return bairros
