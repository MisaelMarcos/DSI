import { bairrosRecife } from "@/data/bairros";
import { coordenadasBairros } from "@/data/bairros-coordenadas";

// Nomes usados em versões anteriores do app que não são bairros oficiais
// (ou são grafias alternativas). Perfis antigos continuam funcionando.
const ALIASES: Record<string, string> = {
  setubal: "Boa Viagem", // Setúbal é parte de Boa Viagem
  torreoes: "Torrões", // grafia antiga
  "joana bezerra": "Ilha Joana Bezerra",
};

export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const POR_NOME_NORMALIZADO = new Map(
  bairrosRecife.map((bairro) => [normalizarTexto(bairro), bairro]),
);

/**
 * Converte um nome vindo do Firestore/perfil para o nome oficial.
 * Retorna "" quando não é um bairro reconhecido.
 */
export function normalizarBairroOficial(
  valor: string | null | undefined,
): string {
  if (!valor) return "";

  const chave = normalizarTexto(valor);
  const alias = ALIASES[chave];

  if (alias) return alias;

  return POR_NOME_NORMALIZADO.get(chave) ?? "";
}

/** Mesmo formato de slug usado em src/backend/pipeline/common.py. */
export function slugBairro(valor: string): string {
  return normalizarTexto(valor)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Distância máxima (km) entre a posição do usuário e o centroide do bairro mais
 * próximo para considerar que ele está no Recife. Acima disso a localização é
 * tratada como "fora da cidade" para não sugerir um bairro sem sentido.
 */
export const DISTANCIA_MAXIMA_KM = 8;

const RAIO_TERRA_KM = 6371;

function grausParaRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function distanciaHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const p1 = grausParaRadianos(lat1);
  const p2 = grausParaRadianos(lat2);
  const dp = grausParaRadianos(lat2 - lat1);
  const dl = grausParaRadianos(lon2 - lon1);
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type BairroProximo = {
  bairro: string;
  distanciaKm: number;
};

/**
 * Bairro cujo centroide está mais perto da coordenada informada. Equivale a
 * `bairro_mais_proximo` de src/backend/pipeline/verificar_alerta.py.
 * Retorna null quando a coordenada é inválida.
 */
export function bairroMaisProximo(
  lat: number,
  lon: number,
): BairroProximo | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  let melhor: BairroProximo | null = null;

  for (const ponto of coordenadasBairros) {
    const distanciaKm = distanciaHaversineKm(lat, lon, ponto.lat, ponto.lon);
    if (melhor === null || distanciaKm < melhor.distanciaKm) {
      melhor = { bairro: ponto.nome, distanciaKm };
    }
  }

  return melhor;
}
