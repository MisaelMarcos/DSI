import { useEffect, useState } from "react";

import { buscarScoreBairro, type ScoreBairro } from "@/services/scores";

export function useScoreBairro(bairro: string) {
  const [score, setScore] = useState<ScoreBairro | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;

    if (!bairro) {
      setScore(null);
      setCarregando(false);
      setErro(false);
      return;
    }

    setCarregando(true);
    setErro(false);

    buscarScoreBairro(bairro)
      .then((resultado) => {
        if (ativo) setScore(resultado);
      })
      .catch((e) => {
        console.error("Erro ao carregar score do bairro:", e);
        if (ativo) {
          setScore(null);
          setErro(true);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [bairro]);

  return { score, carregando, erro };
}
