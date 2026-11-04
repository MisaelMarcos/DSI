import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SeletorBairroModal } from "@/components/seletor-bairro-modal";
import { useBairroUsuario } from "@/hooks/useBairroUsuario";
import { usePreferenciasNotificacao } from "@/hooks/useNotificacoesAlerta";
import { usePrevisaoChuva } from "@/hooks/usePrevisaoChuva";
import { useScoreBairro } from "@/hooks/useScoreBairro";
import {
  combinarPrevisaoERisco,
  formatarData,
  formatarDataHora,
  formatarProbabilidade,
  formatarScore,
  RISCO_INFO,
  type NivelRisco,
} from "@/lib/risco";
import { type CategoriaNotificacao } from "@/services/notificacoes";
import type { CenarioSimulacao, PrevisaoChuva } from "@/services/previsao";
import type { ScoreBairro } from "@/services/scores";

export default function Alertas() {
  const { bairro, carregandoBairro, selecionarBairro } = useBairroUsuario();
  const [modalBairro, setModalBairro] = useState(false);
  const [simulando, setSimulando] = useState(false);

  const {
    preferencias,
    historico,
    salvando: salvandoPreferencia,
    alternarPreferencia,
    incrementarSimulacao,
  } = usePreferenciasNotificacao();

  const {
    score,
    carregando: carregandoScore,
    erro: erroScore,
  } = useScoreBairro(bairro);

  const { previsao, simularCenario } = usePrevisaoChuva();

  async function alterarNotificacao(
    categoria: CategoriaNotificacao,
    ativar: boolean,
  ) {
    const res = await alternarPreferencia(categoria, ativar);
    if (!res.ok) {
      if (res.motivo === "permissao_negada") {
        Alert.alert(
          "Permissão necessária",
          "Habilite as notificações nas configurações do aparelho ou navegador para receber avisos.",
        );
      } else {
        Alert.alert("Não foi possível salvar", "Tente novamente em instantes.");
      }
    }
  }

  async function acionarCenarioGatilho(cenario: CenarioSimulacao) {
    setSimulando(true);
    try {
      // Se nenhum aviso estiver ligado ao testar, ativa ambos automaticamente
      if (
        cenario !== "real" &&
        !preferencias.chuva &&
        !preferencias.desastre
      ) {
        await alternarPreferencia("chuva", true);
        await alternarPreferencia("desastre", true);
      }

      if (cenario !== "real") {
        incrementarSimulacao();
      }

      const novaPrevisao = await simularCenario(cenario);
      if (!novaPrevisao) {
        Alert.alert(
          "API local indisponível",
          "Verifique se o servidor de previsão (porta 8000) está em execução.",
        );
      }
    } finally {
      setSimulando(false);
    }
  }

  if (carregandoBairro && !bairro) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const cenarioAtivo: CenarioSimulacao = previsao?.fonteObservacao.includes(
    "CHUVA_FORTE",
  )
    ? "chuva_forte"
    : previsao?.fonteObservacao.includes("MONITORAMENTO")
      ? "monitoramento"
      : "real";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitulo}>Alertas e Bairro</Text>

        {/* BAIRRO SELECIONADO */}
        <Pressable
          style={({ pressed }) => [
            styles.bairroCard,
            pressed && styles.pressionado,
          ]}
          onPress={() => setModalBairro(true)}
        >
          <View style={styles.bairroInfo}>
            <Text style={styles.bairroLegenda}>Bairro monitorado</Text>
            <Text style={styles.bairroNome}>
              {bairro || "Selecionar bairro"}
            </Text>
          </View>

          <View style={styles.trocarBotao}>
            <Text style={styles.trocarTexto}>Trocar</Text>
            <Ionicons name="chevron-forward" size={16} color="#2563EB" />
          </View>
        </Pressable>

        {/* PREFERÊNCIAS DE NOTIFICAÇÃO */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Avisos automáticos</Text>

          <View style={styles.notificacoesCard}>
            <View style={styles.notificacaoLinha}>
              <View style={styles.notificacaoTexto}>
                <Text style={styles.notificacaoTitulo}>Chuvas fortes</Text>
                <Text style={styles.notificacaoDescricao}>
                  Dispara quando a previsão de 3h indicar chuva intensa (≥ 10 mm)
                </Text>
              </View>

              {salvandoPreferencia === "chuva" ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <Switch
                  value={preferencias.chuva}
                  onValueChange={(v) => alterarNotificacao("chuva", v)}
                  trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                  thumbColor={preferencias.chuva ? "#2563EB" : "#FFFFFF"}
                />
              )}
            </View>

            <View style={styles.divisor} />

            <View style={styles.notificacaoLinha}>
              <View style={styles.notificacaoTexto}>
                <Text style={styles.notificacaoTitulo}>
                  Risco de alagamento
                </Text>
                <Text style={styles.notificacaoDescricao}>
                  Dispara quando a chuva prevista oferecer risco para{" "}
                  {bairro || "seu bairro"}
                </Text>
              </View>

              {salvandoPreferencia === "desastre" ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <Switch
                  value={preferencias.desastre}
                  onValueChange={(v) => alterarNotificacao("desastre", v)}
                  trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                  thumbColor={preferencias.desastre ? "#2563EB" : "#FFFFFF"}
                />
              )}
            </View>
          </View>
        </View>

        {/* SIMULADOR DE GATILHO (TESTE DE DISPARO) */}
        <View style={styles.secao}>
          <View style={styles.secaoCabecalhoLinha}>
            <Text style={styles.secaoTitulo}>Simular gatilho de alerta</Text>
            {simulando ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : null}
          </View>

          <View style={styles.simuladorCard}>
            <Text style={styles.simuladorDescricao}>
              Teste o detector de chuva forte e o disparo imediato das
              notificações para {bairro || "o bairro selecionado"}:
            </Text>

            <View style={styles.botoesCenario}>
              <Pressable
                disabled={simulando}
                onPress={() => acionarCenarioGatilho("real")}
                style={[
                  styles.botaoCenario,
                  cenarioAtivo === "real" && styles.botaoCenarioAtivo,
                ]}
              >
                <Text
                  style={[
                    styles.botaoCenarioTexto,
                    cenarioAtivo === "real" && styles.botaoCenarioTextoAtivo,
                  ]}
                >
                  Tempo real
                </Text>
              </Pressable>

              <Pressable
                disabled={simulando}
                onPress={() => acionarCenarioGatilho("monitoramento")}
                style={[
                  styles.botaoCenario,
                  cenarioAtivo === "monitoramento" &&
                    styles.botaoCenarioModerado,
                ]}
              >
                <Text
                  style={[
                    styles.botaoCenarioTexto,
                    cenarioAtivo === "monitoramento" &&
                      styles.botaoCenarioTextoModerado,
                  ]}
                >
                  Chuva moderada
                </Text>
              </Pressable>

              <Pressable
                disabled={simulando}
                onPress={() => acionarCenarioGatilho("chuva_forte")}
                style={[
                  styles.botaoCenario,
                  cenarioAtivo === "chuva_forte" && styles.botaoCenarioCritico,
                ]}
              >
                <Text
                  style={[
                    styles.botaoCenarioTexto,
                    cenarioAtivo === "chuva_forte" &&
                      styles.botaoCenarioTextoCritico,
                  ]}
                >
                  Chuva forte
                </Text>
              </Pressable>
            </View>

            {historico.length > 0 ? (
              <View style={styles.ultimoDisparoBox}>
                <View style={styles.ultimoDisparoTopo}>
                  <Ionicons
                    name="notifications"
                    size={15}
                    color="#1D4ED8"
                  />
                  <Text style={styles.ultimoDisparoRotulo}>
                    Último aviso enviado ({historico.length})
                  </Text>
                </View>
                <Text style={styles.ultimoDisparoTitulo}>
                  {historico[0].titulo}
                </Text>
                <Text style={styles.ultimoDisparoCorpo}>
                  {historico[0].corpo}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* DADOS E HISTÓRICO DO BAIRRO */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Situação da região</Text>

          {!bairro ? (
            <View style={styles.estadoVazio}>
              <Text style={styles.vazioTitulo}>Nenhum bairro escolhido</Text>
              <Text style={styles.vazioDescricao}>
                Escolha seu bairro para consultar o histórico de ocorrências e a
                elevação local.
              </Text>
              <Pressable
                style={styles.botaoSelecionar}
                onPress={() => setModalBairro(true)}
              >
                <Text style={styles.botaoSelecionarTexto}>
                  Escolher bairro
                </Text>
              </Pressable>
            </View>
          ) : carregandoScore && !score ? (
            <View style={styles.estadoVazio}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : erroScore ? (
            <View style={styles.estadoVazio}>
              <Text style={styles.vazioTitulo}>Erro ao carregar dados</Text>
              <Text style={styles.vazioDescricao}>
                Verifique sua conexão e tente novamente.
              </Text>
            </View>
          ) : score ? (
            <>
              {previsao ? (
                <CartaoPrevisao3h
                  previsao={previsao}
                  nivelBairro={score.nivel}
                />
              ) : null}
              <CartaoRisco score={score} />
            </>
          ) : null}
        </View>
      </ScrollView>

      <SeletorBairroModal
        visivel={modalBairro}
        bairroAtual={bairro}
        aoFechar={() => setModalBairro(false)}
        aoSelecionar={selecionarBairro}
      />
    </SafeAreaView>
  );
}

function CartaoPrevisao3h({
  previsao,
  nivelBairro,
}: {
  previsao: PrevisaoChuva;
  nivelBairro: NivelRisco;
}) {
  const decisao = combinarPrevisaoERisco(previsao.nivelChuva, nivelBairro);

  return (
    <View style={[styles.infoCard, { borderColor: decisao.borda }]}>
      <View style={styles.cardCabecalho}>
        <Text style={styles.cardCategoria}>Próximas 3 horas</Text>
        <Text style={[styles.statusTag, { color: decisao.cor }]}>
          {decisao.rotulo}
        </Text>
      </View>

      <Text style={styles.cardTitulo}>{decisao.titulo}</Text>
      <Text style={styles.cardDescricao}>{decisao.descricao}</Text>

      <View style={styles.metricasLinha}>
        <Text style={styles.metricaItem}>
          Chuva ≥10 mm:{" "}
          <Text style={styles.metricaForte}>
            {formatarProbabilidade(previsao.probabilidade3hAcum10mm)}
          </Text>
        </Text>

        <Text style={styles.metricaItem}>
          Últimas 3h:{" "}
          <Text style={styles.metricaForte}>
            {previsao.chuva3hMm.toFixed(1).replace(".", ",")} mm
          </Text>
        </Text>
      </View>

      {previsao.geradoEm ? (
        <Text style={styles.atualizadoTexto}>
          Leitura de {formatarDataHora(previsao.geradoEm)} (
          {previsao.fonteObservacao})
        </Text>
      ) : null}
    </View>
  );
}

function CartaoRisco({ score }: { score: ScoreBairro }) {
  const info = RISCO_INFO[score.nivel];

  return (
    <View style={styles.infoCard}>
      <View style={styles.cardCabecalho}>
        <Text style={styles.cardCategoria}>Histórico do bairro</Text>
        <Text style={[styles.statusTag, { color: info.cor }]}>
          {info.rotulo}
        </Text>
      </View>

      <Text style={styles.cardTitulo}>{info.titulo}</Text>
      <Text style={styles.cardDescricao}>{info.descricao}</Text>

      <View style={styles.metricasLinha}>
        <Text style={styles.metricaItem}>
          Ocorrências:{" "}
          <Text style={styles.metricaForte}>{score.ocorrencias}</Text>
        </Text>

        <Text style={styles.metricaItem}>
          Altitude média:{" "}
          <Text style={styles.metricaForte}>
            {score.elevacaoM != null ? `${Math.round(score.elevacaoM)} m` : "—"}
          </Text>
        </Text>

        {score.temHistorico ? (
          <Text style={styles.metricaItem}>
            Índice:{" "}
            <Text style={styles.metricaForte}>
              {formatarScore(score.scoreRisco)}/100
            </Text>
          </Text>
        ) : null}
      </View>

      {score.atualizadoEm ? (
        <Text style={styles.atualizadoTexto}>
          Base atualizada em {formatarData(score.atualizadoEm)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  headerTitulo: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
  },
  bairroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },
  pressionado: {
    opacity: 0.75,
  },
  bairroInfo: {
    flex: 1,
  },
  bairroLegenda: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
  bairroNome: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  trocarBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 12,
  },
  trocarTexto: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  secao: {
    marginBottom: 24,
  },
  secaoCabecalhoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  secaoTitulo: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  notificacoesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  notificacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    gap: 12,
  },
  notificacaoTexto: {
    flex: 1,
  },
  notificacaoTitulo: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
  },
  notificacaoDescricao: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 2,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2E8F0",
  },
  simuladorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  simuladorDescricao: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  botoesCenario: {
    flexDirection: "row",
    gap: 8,
  },
  botaoCenario: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoCenarioAtivo: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  botaoCenarioModerado: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  botaoCenarioCritico: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  botaoCenarioTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  botaoCenarioTextoAtivo: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  botaoCenarioTextoModerado: {
    color: "#B45309",
    fontWeight: "700",
  },
  botaoCenarioTextoCritico: {
    color: "#DC2626",
    fontWeight: "700",
  },
  ultimoDisparoBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ultimoDisparoTopo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  ultimoDisparoRotulo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  ultimoDisparoTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  ultimoDisparoCorpo: {
    fontSize: 12,
    lineHeight: 17,
    color: "#475569",
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardCategoria: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  statusTag: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitulo: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  cardDescricao: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  metricasLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  metricaItem: {
    color: "#64748B",
    fontSize: 13,
  },
  metricaForte: {
    color: "#0F172A",
    fontWeight: "700",
  },
  atualizadoTexto: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 10,
  },
  estadoVazio: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vazioTitulo: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  vazioDescricao: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  botaoSelecionar: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  botaoSelecionarTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
