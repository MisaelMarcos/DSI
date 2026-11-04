import { useEffect } from "react";
import { create } from "zustand";

import {
  buscarPrevisaoAtual,
  simularCenarioPrevisao,
  type CenarioSimulacao,
  type PrevisaoChuva,
} from "@/services/previsao";

type PrevisaoStore = {
  previsao: PrevisaoChuva | null;
  carregando: boolean;
  erro: boolean;
  inicializado: boolean;
  recarregar: () => Promise<PrevisaoChuva | null>;
  simularCenario: (cenario: CenarioSimulacao) => Promise<PrevisaoChuva | null>;
};

export const usePrevisaoStore = create<PrevisaoStore>((set) => ({
  previsao: null,
  carregando: true,
  erro: false,
  inicializado: false,

  recarregar: async () => {
    set({ carregando: true, erro: false });
    try {
      const resultado = await buscarPrevisaoAtual();
      set({
        previsao: resultado,
        carregando: false,
        erro: !resultado,
        inicializado: true,
      });
      return resultado;
    } catch (e) {
      console.error("Erro ao carregar previsão de chuva:", e);
      set({
        previsao: null,
        carregando: false,
        erro: true,
        inicializado: true,
      });
      return null;
    }
  },

  simularCenario: async (cenario) => {
    set({ carregando: true, erro: false });
    try {
      const resultado = await simularCenarioPrevisao(cenario);
      if (resultado) {
        set({
          previsao: resultado,
          carregando: false,
          erro: false,
          inicializado: true,
        });
        return resultado;
      }
      set({ carregando: false });
      return null;
    } catch (e) {
      console.error("Erro ao simular cenário de chuva:", e);
      set({ carregando: false, erro: true });
      return null;
    }
  },
}));

export function usePrevisaoChuva() {
  const {
    previsao,
    carregando,
    erro,
    inicializado,
    recarregar,
    simularCenario,
  } = usePrevisaoStore();

  useEffect(() => {
    if (!inicializado) {
      recarregar();
    }
  }, [inicializado, recarregar]);

  return { previsao, carregando, erro, recarregar, simularCenario };
}
