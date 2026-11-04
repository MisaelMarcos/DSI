import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SeletorBairroModal } from "@/components/seletor-bairro-modal";
import { useSession } from "@/contexts/sessionContext";
import { useBairroUsuario } from "@/hooks/useBairroUsuario";
import { usePrevisaoChuva } from "@/hooks/usePrevisaoChuva";
import { useScoreBairro } from "@/hooks/useScoreBairro";
import {
  calcularResumoChuvaEAlagamento,
  formatarDataHora,
  formatarProbabilidade,
  RISCO_INFO,
} from "@/lib/risco";

export default function Home() {
  const { logout } = useSession();
  const { bairro, carregandoBairro, selecionarBairro } = useBairroUsuario();
  const [modalBairro, setModalBairro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const { score, carregando: carregandoScore } = useScoreBairro(bairro);
  const {
    previsao,
    carregando: carregandoPrevisao,
    recarregar,
  } = usePrevisaoChuva();

  const carregando =
    carregandoBairro ||
    (carregandoPrevisao && !previsao) ||
    (!!bairro && carregandoScore && !score);

  const resumo = calcularResumoChuvaEAlagamento(previsao, score);
  const nivelBairro = score?.nivel ?? "sem_historico";

  async function aoPuxarAtualizar() {
    setAtualizando(true);
    await recarregar();
    setAtualizando(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoPuxarAtualizar}
            tintColor="#2563EB"
          />
        }
      >
        {/* TOPO: SELETOR DE BAIRRO DIRETO NA HOME */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.seletorBairro,
              pressed && styles.pressionado,
            ]}
            onPress={() => setModalBairro(true)}
          >
            <Ionicons name="location-sharp" size={18} color="#2563EB" />
            <Text style={styles.nomeBairro} numberOfLines={1}>
              {bairro || "Escolher bairro"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </Pressable>

          <Pressable
            onPress={aoPuxarAtualizar}
            style={styles.botaoAtualizar}
            hitSlop={8}
          >
            <Text style={styles.textoAtualizado}>
              {previsao?.geradoEm
                ? formatarDataHora(previsao.geradoEm)
                : "Recife, PE"}
            </Text>
          </Pressable>
        </View>

        {/* BLOCO PRINCIPAL: PREVISÃO DE CHUVA NAS PRÓXIMAS 3 HORAS */}
        <View style={styles.chuvaCard}>
          <View style={styles.chuvaCabecalho}>
            <View style={styles.chuvaTextos}>
              <Text style={styles.rotuloSecao}>
                Previsão para as próximas 3h
              </Text>

              {carregando ? (
                <ActivityIndicator
                  color="#2563EB"
                  style={styles.spinner}
                />
              ) : (
                <>
                  <View style={styles.probLinha}>
                    <Text style={styles.probNumero}>
                      {previsao
                        ? formatarProbabilidade(resumo.probChuva3h)
                        : "—"}
                    </Text>
                    <Text style={styles.probLegenda}>de chance de chuva</Text>
                  </View>

                  <Text style={styles.estadoClima}>
                    {resumo.intensidadeRotulo}
                  </Text>
                </>
              )}
            </View>

            <Ionicons
              name={
                previsao?.alerta
                  ? "thunderstorm-outline"
                  : previsao?.monitoramento
                    ? "rainy-outline"
                    : "partly-sunny-outline"
              }
              size={44}
              color="#2563EB"
            />
          </View>

          <Text style={styles.descricaoClima}>
            {resumo.intensidadeDescricao}
          </Text>

          {previsao && (
            <View style={styles.gradeMetricas}>
              <View style={styles.metricaColuna}>
                <Text style={styles.metricaTitulo}>Chuva moderada</Text>
                <Text style={styles.metricaValor}>
                  {formatarProbabilidade(previsao.probabilidade3h5mm)}
                </Text>
              </View>

              <View style={styles.divisorVertical} />

              <View style={styles.metricaColuna}>
                <Text style={styles.metricaTitulo}>Chuva forte</Text>
                <Text style={styles.metricaValor}>
                  {formatarProbabilidade(previsao.probabilidade3hAcum10mm)}
                </Text>
              </View>

              <View style={styles.divisorVertical} />

              <View style={styles.metricaColuna}>
                <Text style={styles.metricaTitulo}>Última hora</Text>
                <Text style={styles.metricaValor}>
                  {previsao.chuva1hMm.toFixed(1).replace(".", ",")} mm
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* BLOCO AGREGADO: CHANCE DE ALAGAR NO BAIRRO */}
        <View
          style={[
            styles.alagamentoCard,
            {
              backgroundColor: resumo.fundo,
              borderColor: resumo.borda,
            },
          ]}
        >
          <View style={styles.alagamentoCabecalho}>
            <View style={styles.alagamentoTitulos}>
              <Text style={styles.rotuloSecao}>
                Chance de alagamento {bairro ? `em ${bairro}` : "no bairro"}
              </Text>

              {!bairro ? (
                <Pressable
                  style={styles.botaoEscolherBairro}
                  onPress={() => setModalBairro(true)}
                >
                  <Text style={styles.botaoEscolherTexto}>
                    Selecionar bairro para calcular
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#2563EB"
                  />
                </Pressable>
              ) : (
                <View style={styles.alagamentoLinhaPrincipal}>
                  <Text
                    style={[
                      styles.alagamentoPercentual,
                      { color: resumo.cor },
                    ]}
                  >
                    {resumo.chanceAlagarPct}%
                  </Text>
                  <View style={styles.alagamentoStatusTextos}>
                    <Text
                      style={[
                        styles.alagamentoStatus,
                        { color: resumo.cor },
                      ]}
                    >
                      {resumo.chanceAlagarRotulo}
                    </Text>
                    <Text style={styles.historicoSubtitulo}>
                      Histórico local: {RISCO_INFO[nivelBairro].rotulo.toLowerCase()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {Boolean(bairro) && (
            <>
              {/* Barra visual de nível */}
              <View style={styles.barraTrilha}>
                <View
                  style={[
                    styles.barraPreenchimento,
                    {
                      width: `${Math.max(6, resumo.chanceAlagarPct)}%`,
                      backgroundColor: resumo.cor,
                    },
                  ]}
                />
              </View>

              <Text style={styles.alagamentoExplicacao}>
                {resumo.chanceAlagarDescricao}
              </Text>

              {score && (
                <View style={styles.tabelaIntensidade}>
                  <View style={styles.linhaIntensidade}>
                    <Text style={styles.rotuloIntensidade}>
                      Se chover moderado (≥ 5 mm)
                    </Text>
                    <Text style={styles.valorIntensidade}>
                      {resumo.chanceSeChuvaModerada}
                    </Text>
                  </View>

                  <View style={styles.linhaIntensidade}>
                    <Text style={styles.rotuloIntensidade}>
                      Se chover forte (≥ 10 mm)
                    </Text>
                    <Text
                      style={[
                        styles.valorIntensidade,
                        score.nivel === "alto" && { color: "#DC2626" },
                      ]}
                    >
                      {resumo.chanceSeChuvaForte}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.rodape}>
          <Text style={styles.fonte}>
            Dados da estação INMET Recife (A301) e histórico municipal. Em
            emergências, acione a Defesa Civil (199).
          </Text>

          <Pressable onPress={logout} hitSlop={10}>
            <Text style={styles.logout}>Sair da conta</Text>
          </Pressable>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  seletorBairro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
    maxWidth: "68%",
  },
  pressionado: {
    opacity: 0.75,
  },
  nomeBairro: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },
  botaoAtualizar: {
    paddingVertical: 4,
  },
  textoAtualizado: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  rotuloSecao: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  spinner: {
    marginVertical: 16,
    alignSelf: "flex-start",
  },
  chuvaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  chuvaCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  chuvaTextos: {
    flex: 1,
  },
  probLinha: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
  },
  probNumero: {
    fontSize: 42,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -1,
  },
  probLegenda: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  estadoClima: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 4,
  },
  descricaoClima: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    marginTop: 8,
  },
  gradeMetricas: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metricaColuna: {
    flex: 1,
  },
  divisorVertical: {
    width: 1,
    height: 26,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 10,
  },
  metricaTitulo: {
    fontSize: 12,
    color: "#64748B",
  },
  metricaValor: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  alagamentoCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  alagamentoCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alagamentoTitulos: {
    flex: 1,
  },
  botaoEscolherBairro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  botaoEscolherTexto: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563EB",
  },
  alagamentoLinhaPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  alagamentoPercentual: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  alagamentoStatusTextos: {
    flex: 1,
  },
  alagamentoStatus: {
    fontSize: 16,
    fontWeight: "700",
  },
  historicoSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  barraTrilha: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 14,
  },
  barraPreenchimento: {
    height: "100%",
    borderRadius: 3,
  },
  alagamentoExplicacao: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    marginTop: 12,
  },
  tabelaIntensidade: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  linhaIntensidade: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rotuloIntensidade: {
    fontSize: 13,
    color: "#475569",
  },
  valorIntensidade: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  rodape: {
    alignItems: "center",
    gap: 14,
  },
  fonte: {
    fontSize: 12,
    lineHeight: 18,
    color: "#94A3B8",
    textAlign: "center",
  },
  logout: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    paddingVertical: 6,
  },
});
