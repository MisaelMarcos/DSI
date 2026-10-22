# Gera src/data/bairros.ts a partir da lista canônica oficial.
# Fonte: Lei Municipal 16.293/1997 (Prefeitura do Recife).
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import carregar_bairros

RAIZ = Path(__file__).resolve().parents[3]
DESTINO = RAIZ / "src" / "data" / "bairros.ts"

bairros = carregar_bairros()
linhas = "\n".join(f'  "{bairro}",' for bairro in bairros)
conteudo = f"""// Gerado automaticamente por src/backend/pipeline/gerar_lista_bairros.py
// Fonte: Lei Municipal 16.293/1997 (Prefeitura do Recife) — 94 bairros oficiais.
// Não edite à mão: altere data/bairros_recife.csv e rode o script.
export const bairrosRecife = [
{linhas}
];
"""

DESTINO.write_text(conteudo, encoding="utf-8", newline="\n")
print(f"{len(bairros)} bairros gravados em {DESTINO}")
