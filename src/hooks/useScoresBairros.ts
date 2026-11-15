import { useEffect, useState } from "react";

import { buscarScoreBairro, type ScoreBairro } from "@/services/scores";

/**
 * Carrega o score de risco de vários bairros de uma vez (ex.: favoritos).
 * Bairros sem score (ou com falha na leitura) simplesmente ficam de fora.
 */
export function useScoresBairros(bairros: string[]): ScoreBairro[] {
  const [scores, setScores] = useState<ScoreBairro[]>([]);

  // Chave estável: o array novo a cada render não deve refazer a busca.
  const chave = bairros.join("|");

  useEffect(() => {
    let ativo = true;
    const nomes = chave ? chave.split("|") : [];

    if (nomes.length === 0) {
      setScores([]);
      return;
    }

    Promise.all(
      nomes.map((nome) =>
        buscarScoreBairro(nome).catch((erro) => {
          console.warn("Erro ao carregar score de favorito:", nome, erro);
          return null;
        }),
      ),
    ).then((resultados) => {
      if (ativo) {
        setScores(
          resultados.filter((item): item is ScoreBairro => item !== null),
        );
      }
    });

    return () => {
      ativo = false;
    };
  }, [chave]);

  return scores;
}
