import { normalizarBairroOficial } from "@/lib/bairros";

/** Quantidade máxima de bairros favoritos (atalhos) por usuário. */
export const LIMITE_FAVORITOS = 3;

export type ResultadoAlternarFavorito =
  | "adicionado"
  | "removido"
  | "limite"
  | "invalido";

/** Converte qualquer valor vindo do Firestore/AsyncStorage em uma lista válida: */
export function normalizarFavoritos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];

  const lista: string[] = [];
  for (const item of valor) {
    if (typeof item !== "string") continue;
    const oficial = normalizarBairroOficial(item);
    if (oficial && !lista.includes(oficial)) lista.push(oficial);
    if (lista.length >= LIMITE_FAVORITOS) break;
  }
  return lista;
}

export function ehFavorito(lista: string[], bairro: string): boolean {
  const oficial = normalizarBairroOficial(bairro);
  return oficial !== "" && lista.includes(oficial);
}

/** Adiciona o bairro se ainda não for favorito; remove se já for. */
export function alternarFavorito(
  lista: string[],
  bairro: string,
): { lista: string[]; resultado: ResultadoAlternarFavorito } {
  const oficial = normalizarBairroOficial(bairro);
  if (!oficial) return { lista, resultado: "invalido" };

  if (lista.includes(oficial)) {
    return {
      lista: lista.filter((item) => item !== oficial),
      resultado: "removido",
    };
  }

  if (lista.length >= LIMITE_FAVORITOS) {
    return { lista, resultado: "limite" };
  }

  return { lista: [...lista, oficial], resultado: "adicionado" };
}
