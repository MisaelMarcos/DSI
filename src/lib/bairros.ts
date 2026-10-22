import { bairrosRecife } from "@/data/bairros";

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
