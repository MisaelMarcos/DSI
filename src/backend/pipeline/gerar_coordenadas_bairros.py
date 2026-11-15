# Gera src/data/bairros-coordenadas.ts a partir de data/bairros_geo.csv.
# Os centroides (lat/lon) são os mesmos usados por verificar_alerta.py, para que
# o app e o backend associem uma coordenada ao mesmo bairro.
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_DIR

RAIZ = Path(__file__).resolve().parents[3]
ORIGEM = DATA_DIR / "bairros_geo.csv"
DESTINO = RAIZ / "src" / "data" / "bairros-coordenadas.ts"

with ORIGEM.open(encoding="utf-8") as arquivo:
    linhas_csv = [
        linha for linha in csv.DictReader(arquivo) if linha["lat"] and linha["lon"]
    ]

linhas = "\n".join(
    f'  {{ nome: "{linha["bairro"].strip()}", '
    f'lat: {float(linha["lat"])}, lon: {float(linha["lon"])} }},'
    for linha in linhas_csv
)
conteudo = f"""// Gerado automaticamente por src/backend/pipeline/gerar_coordenadas_bairros.py
// Fonte: centroides dos {len(linhas_csv)} bairros em data/bairros_geo.csv.
// Não alterar a mão: altere o CSV e rode o script.
export type CoordenadaBairro = {{
  nome: string;
  lat: number;
  lon: number;
}};

export const coordenadasBairros: CoordenadaBairro[] = [
{linhas}
];
"""

DESTINO.write_text(conteudo, encoding="utf-8", newline="\n")
print(f"{len(linhas_csv)} bairros gravados em {DESTINO}")
