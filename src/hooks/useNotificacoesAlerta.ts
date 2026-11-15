import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef } from "react";
import { create } from "zustand";

import { useSession } from "@/contexts/sessionContext";
import { useBairroUsuario } from "@/hooks/useBairroUsuario";
import { usePrevisaoChuva } from "@/hooks/usePrevisaoChuva";
import { useScoreBairro } from "@/hooks/useScoreBairro";
import { useScoresBairros } from "@/hooks/useScoresBairros";
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
 * Monitor automático: observa a previsão de 3h, o bairro escolhido, os bairros
 * favoritos e as preferências de notificação. Sempre que um alerta de chuva
 * forte ou risco de alagamento é detectado (e ainda não foi notificado nesta
 * janela), dispara as notificações locais automaticamente.
 *
 * - Bairro principal: avalia as duas categorias ("chuva" e "desastre").
 * - Favoritos: avalia só "desastre" (risco de alagamento), que depende do
 *   bairro. O alerta de chuva forte vale para a cidade toda.
 */
export function useMonitorGatilhoAlertas() {
  const { user } = useSession();
  const { bairro, favoritos } = useBairroUsuario();
  const { score } = useScoreBairro(bairro);
  const { previsao } = usePrevisaoChuva();
  const { preferencias, seqSimulacao, registrarDisparo } =
    usePreferenciasNotificacao();

  // Só vigia favoritos quando o alerta de alagamento está ligado.
  const favoritosVigiados = useMemo(
    () =>
      preferencias.desastre
        ? favoritos.filter((nome) => nome !== bairro)
        : [],
    [preferencias.desastre, favoritos, bairro],
  );
  const scoresFavoritos = useScoresBairros(favoritosVigiados);

  const enviadasMemoriaRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !previsao) return;
    if (!preferencias.chuva && !preferencias.desastre) return;

    const alertasDesastre = { chuva: false, desastre: preferencias.desastre };

    const itens = [
      ...avaliarGatilhosDeAlerta(previsao, score, preferencias).map(
        (gatilho) => ({
          gatilho,
          assinatura: gerarAssinaturaGatilho(
            previsao,
            score?.bairro || bairro || "Recife",
          ),
        }),
      ),
      ...scoresFavoritos.flatMap((scoreFavorito) =>
        avaliarGatilhosDeAlerta(previsao, scoreFavorito, alertasDesastre).map(
          (gatilho) => ({
            gatilho,
            assinatura: gerarAssinaturaGatilho(previsao, scoreFavorito.bairro),
          }),
        ),
      ),
    ];
    if (itens.length === 0) return;

    const sufixoSim = previsao.fonteObservacao.startsWith("SIMULACAO")
      ? `::s${seqSimulacao}`
      : "";

    let cancelado = false;

    async function verificarEDisparar() {
      if (!user) return;

      for (const { gatilho, assinatura } of itens) {
        if (cancelado) break;

        const chaveDeduplicacao = `@AlertaChuva:${user.uid}:trigger:${gatilho.categoria}:${assinatura}${sufixoSim}`;
        if (enviadasMemoriaRef.current.has(chaveDeduplicacao)) continue;

        // Reserva a chave antes de qualquer await: execuções do efeito que se
        // sobrepõem (ex.: scores dos favoritos chegando em momentos diferentes)
        // não notificam o mesmo alerta duas vezes.
        enviadasMemoriaRef.current.add(chaveDeduplicacao);

        if (!sufixoSim) {
          const jaEnviado = await AsyncStorage.getItem(chaveDeduplicacao);
          if (jaEnviado === "1") continue;
          await AsyncStorage.setItem(chaveDeduplicacao, "1");
        }

        const disparada = await dispararNotificacaoDispositivo(gatilho);
        registrarDisparo(disparada);
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
    scoresFavoritos,
    previsao,
    preferencias,
    seqSimulacao,
    registrarDisparo,
  ]);
}
