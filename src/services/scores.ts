import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizarBairroOficial, slugBairro } from "@/lib/bairros";
import { nivelRisco, type NivelRisco } from "@/lib/risco";

export type ScoreBairro = {
  bairro: string;
  slug: string;
  frequencia: number;
  ocorrencias: number;
  scoreFreq: number;
  lat: number | null;
  lon: number | null;
  elevacaoM: number | null;
  scoreElev: number;
  scoreRisco: number;
  nivel: NivelRisco;
  temHistorico: boolean;
  atualizadoEm: Date | null;
};

/**
 * Lê scores/{slug} (somente leitura para usuários autenticados).
 * Retorna null quando o bairro não é oficial ou ainda não tem score.
 */
export async function buscarScoreBairro(
  nome: string,
): Promise<ScoreBairro | null> {
  const bairro = normalizarBairroOficial(nome);
  if (!bairro) return null;

  const slug = slugBairro(bairro);
  const snap = await getDoc(doc(db, "scores", slug));
  if (!snap.exists()) return null;

  const dados = snap.data();
  const atualizadoEm = dados.atualizado_em;

  return {
    bairro: typeof dados.bairro === "string" ? dados.bairro : bairro,
    slug: typeof dados.slug === "string" ? dados.slug : slug,
    frequencia: Number(dados.frequencia ?? 0),
    ocorrencias: Number(dados.ocorrencias ?? 0),
    scoreFreq: Number(dados.score_freq ?? 0),
    lat: dados.lat == null ? null : Number(dados.lat),
    lon: dados.lon == null ? null : Number(dados.lon),
    elevacaoM: dados.elevacao_m == null ? null : Number(dados.elevacao_m),
    scoreElev: Number(dados.score_elev ?? 0),
    scoreRisco: Number(dados.score_risco ?? 0),
    nivel: nivelRisco(dados.nivel),
    temHistorico: Boolean(dados.tem_historico),
    atualizadoEm:
      typeof atualizadoEm?.toDate === "function"
        ? atualizadoEm.toDate()
        : null,
  };
}
