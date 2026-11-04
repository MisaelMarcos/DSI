import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { create } from "zustand";

import { useSession } from "@/contexts/sessionContext";
import { useBairroUsuario } from "@/hooks/useBairroUsuario";
import { usePrevisaoChuva } from "@/hooks/usePrevisaoChuva";
import { useScoreBairro } from "@/hooks/useScoreBairro";
import {
  avaliarGatilhosDeAlerta,
  carregarPreferenciasNotificacao,
  dispararNotificacaoDispositivo,
  gerarAssinaturaGatilho,
  inicializarCanalNotificacoes,
  salvarPreferenciaNotificacao,
  solicitarPermissaoNotificacao,
  type CategoriaNotificacao,
  type NotificacaoDisparada,
  type PreferenciasNotificacao,
} from "@/services/notificacoes";

type NotificacaoStore = {
  uidAtual: string | null;
  preferencias: PreferenciasNotificacao;
  historico: NotificacaoDisparada[];
  salvando: CategoriaNotificacao | null;
  seqSimulacao: number;
  definirEstado: (parcial: Partial<NotificacaoStore>) => void;
  registrarDisparo: (item: NotificacaoDisparada) => void;
  incrementarSimulacao: () => void;
  limparHistorico: () => void;
};

export const useNotificacaoStore = create<NotificacaoStore>((set) => ({
  uidAtual: null,
  preferencias: { chuva: false, desastre: false },
  historico: [],
  salvando: null,
  seqSimulacao: 0,
  definirEstado: (parcial) => set(parcial),
  registrarDisparo: (item) =>
    set((s) => ({
      historico: [item, ...s.historico].slice(0, 10),
    })),
  incrementarSimulacao: () =>
    set((s) => ({ seqSimulacao: s.seqSimulacao + 1 })),
  limparHistorico: () => set({ historico: [] }),
}));

/**
 * Gerencia as preferências de notificação do usuário e permite alterar os
 * switches ("chuva" e "desastre") sincronizados em toda a aplicação.
 */
export function usePreferenciasNotificacao() {
  const { user } = useSession();
  const {
    uidAtual,
    preferencias,
    historico,
    salvando,
    seqSimulacao,
    definirEstado,
    registrarDisparo,
    incrementarSimulacao,
    limparHistorico,
  } = useNotificacaoStore();

  useEffect(() => {
    inicializarCanalNotificacoes();
  }, []);

  useEffect(() => {
    if (!user) {
      definirEstado({
        uidAtual: null,
        preferencias: { chuva: false, desastre: false },
        historico: [],
      });
      return;
    }

    if (uidAtual === user.uid) return;
    definirEstado({ uidAtual: user.uid });

    carregarPreferenciasNotificacao(user.uid)
      .then((prefs) => {
        definirEstado({ preferencias: prefs });
      })
      .catch(() => {});
  }, [user, uidAtual, definirEstado]);

  async function alternarPreferencia(
    categoria: CategoriaNotificacao,
    ativar: boolean,
  ): Promise<{ ok: boolean; motivo?: string }> {
    if (!user) return { ok: false, motivo: "sem_sessao" };

    definirEstado({ salvando: categoria });
    try {
      if (ativar) {
        const concedida = await solicitarPermissaoNotificacao();
        if (!concedida) {
          return { ok: false, motivo: "permissao_negada" };
        }
      }

      await salvarPreferenciaNotificacao(user.uid, categoria, ativar);
      definirEstado({
        preferencias: {
          ...preferencias,
          [categoria]: ativar,
        },
      });
      return { ok: true };
    } catch {
      return { ok: false, motivo: "erro_salvar" };
    } finally {
      definirEstado({ salvando: null });
    }
  }

  return {
    preferencias,
    historico,
    salvando,
    seqSimulacao,
    alternarPreferencia,
    registrarDisparo,
    incrementarSimulacao,
    limparHistorico,
  };
}

/**
 * Monitor automático: observa a previsão de 3h, o bairro escolhido e as
 * preferências de notificação. Sempre que um alerta de chuva forte ou risco de
 * alagamento é detectado (e ainda não foi notificado nesta janela), dispara as
 * notificações locais automaticamente.
 */
export function useMonitorGatilhoAlertas() {
  const { user } = useSession();
  const { bairro } = useBairroUsuario();
  const { score } = useScoreBairro(bairro);
  const { previsao } = usePrevisaoChuva();
  const { preferencias, seqSimulacao, registrarDisparo } =
    usePreferenciasNotificacao();

  const processandoRef = useRef(false);
  const enviadasMemoriaRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !previsao) return;
    if (!preferencias.chuva && !preferencias.desastre) return;

    const gatilhos = avaliarGatilhosDeAlerta(previsao, score, preferencias);
    if (gatilhos.length === 0) return;

    const assinaturaBase = gerarAssinaturaGatilho(
      previsao,
      score?.bairro || bairro || "Recife",
    );
    const sufixoSim = previsao.fonteObservacao.startsWith("SIMULACAO")
      ? `::s${seqSimulacao}`
      : "";

    let cancelado = false;

    async function verificarEDisparar() {
      if (processandoRef.current || !user) return;
      processandoRef.current = true;

      try {
        for (const item of gatilhos) {
          if (cancelado) break;

          const chaveDeduplicacao = `@AlertaChuva:${user.uid}:trigger:${item.categoria}:${assinaturaBase}${sufixoSim}`;
          if (enviadasMemoriaRef.current.has(chaveDeduplicacao)) continue;

          if (!sufixoSim) {
            const jaEnviado = await AsyncStorage.getItem(chaveDeduplicacao);
            if (jaEnviado === "1") {
              enviadasMemoriaRef.current.add(chaveDeduplicacao);
              continue;
            }
            await AsyncStorage.setItem(chaveDeduplicacao, "1");
          }

          enviadasMemoriaRef.current.add(chaveDeduplicacao);
          const disparada = await dispararNotificacaoDispositivo(item);
          if (!cancelado) {
            registrarDisparo(disparada);
          }
        }
      } finally {
        processandoRef.current = false;
      }
    }

    verificarEDisparar();

    return () => {
      cancelado = true;
    };
  }, [
    user,
    bairro,
    score,
    previsao,
    preferencias,
    seqSimulacao,
    registrarDisparo,
  ]);
}
