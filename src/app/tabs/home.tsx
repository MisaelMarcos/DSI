import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/contexts/sessionContext";
import { useScoreBairro } from "@/hooks/useScoreBairro";
import { normalizarBairroOficial } from "@/lib/bairros";
import { db } from "@/lib/firebase";
import {
  formatarData,
  formatarScore,
  RISCO_INFO,
  type NivelRisco,
} from "@/lib/risco";

const ICONE_POR_NIVEL: Record<
  NivelRisco,
  keyof typeof Ionicons.glyphMap
> = {
  alto: "warning",
  medio: "alert-circle",
  baixo: "shield-checkmark",
  sem_historico: "information-circle",
};

export default function Home() {
  const { user, logout } = useSession();
  const [bairro, setBairro] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  useEffect(() => {
    let ativo = true;

    if (!user) {
      setBairro("");
      setCarregandoPerfil(false);
      return;
    }

    setCarregandoPerfil(true);

    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (!ativo) return;

        const salvo = snap.exists() ? snap.data().bairro : "";
        setBairro(
          normalizarBairroOficial(
            typeof salvo === "string" ? salvo : "",
          ),
        );
      })
      .catch((erro) => {
        console.error("Erro ao carregar perfil:", erro);
        if (ativo) setBairro("");
      })
      .finally(() => {
        if (ativo) setCarregandoPerfil(false);
      });

    return () => {
      ativo = false;
    };
  }, [user]);

  const {
    score,
    carregando: carregandoScore,
    erro: erroScore,
  } = useScoreBairro(bairro);

  const carregando = carregandoPerfil || (!!bairro && carregandoScore);
  const nivel = score?.nivel ?? "sem_historico";
  const info = RISCO_INFO[nivel];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá! 👋</Text>

            <View style={styles.locationContainer}>
              <Ionicons
                name="location-sharp"
                size={18}
                color="#2F6BFF"
              />

              <Text style={styles.location}>
                {bairro || "Recife, PE"}
              </Text>
            </View>
          </View>

          <View style={styles.updateContainer}>
            <Ionicons
              name="leaf-outline"
              size={16}
              color="#64748B"
            />

            <Text style={styles.timestamp}>
              Risco histórico
            </Text>
          </View>
        </View>

        {/* CARD PRINCIPAL */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: info.fundo, borderColor: info.borda },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroTexto}>
              <Text style={styles.heroLabel}>RISCO DE ALAGAMENTO</Text>

              <Text style={[styles.heroNivel, { color: info.cor }]}>
                {carregando
                  ? "Carregando..."
                  : !bairro
                    ? "Selecione seu bairro"
                    : erroScore
                      ? "Dados indisponíveis"
                      : info.rotulo}
              </Text>

              <Text style={styles.heroBairro}>
                {bairro || "Nenhum bairro selecionado"}
              </Text>
            </View>

            <View
              style={[
                styles.heroIcone,
                { backgroundColor: info.borda },
              ]}
            >
              <Ionicons
                name={ICONE_POR_NIVEL[nivel]}
                size={42}
                color={info.cor}
              />
            </View>
          </View>

          {carregando ? (
            <ActivityIndicator
              color={info.cor}
              style={styles.heroLoading}
            />
          ) : !bairro ? (
            <Text style={styles.heroDescricao}>
              Vá até a aba Alertas e selecione seu bairro para ver o
              risco de alagamento.
            </Text>
          ) : erroScore ? (
            <Text style={styles.heroDescricao}>
              Não foi possível carregar os dados deste bairro. Verifique
              sua conexão e tente novamente.
            </Text>
          ) : (
            <>
              {score?.temHistorico && (
                <View style={styles.scoreLinha}>
                  <Text
                    style={[styles.scoreValor, { color: info.cor }]}
                  >
                    {formatarScore(score.scoreRisco)}
                  </Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
              )}

              <Text style={styles.heroDescricao}>{info.descricao}</Text>
            </>
          )}
        </View>

        {/* ALERTA DINÂMICO */}
        {score && !carregando && (
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: info.fundo,
                borderColor: info.borda,
              },
            ]}
          >
            <View
              style={[
                styles.alertIcon,
                { backgroundColor: info.borda },
              ]}
            >
              <Ionicons
                name={ICONE_POR_NIVEL[nivel]}
                size={24}
                color={info.cor}
              />
            </View>

            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: info.cor }]}>
                {info.titulo}
              </Text>

              <Text style={styles.alertDescription}>
                {score.temHistorico
                  ? `${score.ocorrencias} ocorrência(s) registrada(s) no histórico do bairro.`
                  : "Este bairro ainda não aparece nas ocorrências coletadas. A elevação é considerada, mas não há histórico para classificar o risco."}
              </Text>
            </View>
          </View>
        )}

        {/* DADOS DO BAIRRO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do bairro</Text>

          <View style={styles.infoGrid}>
            <InfoCard
              icone="document-text-outline"
              titulo="Ocorrências"
              valor={score ? String(score.ocorrencias) : "—"}
            />

            <InfoCard
              icone="trending-down-outline"
              titulo="Elevação"
              valor={
                score?.elevacaoM != null
                  ? `${Math.round(score.elevacaoM)} m`
                  : "—"
              }
            />

            <InfoCard
              icone="analytics-outline"
              titulo="Score histórico"
              valor={
                score?.temHistorico
                  ? `${formatarScore(score.scoreRisco)}/100`
                  : "—"
              }
            />

            <InfoCard
              icone="calendar-outline"
              titulo="Atualizado"
              valor={
                score?.atualizadoEm
                  ? formatarData(score.atualizadoEm)
                  : "—"
              }
            />
          </View>
        </View>

        {/* PREVISÃO DE CHUVA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previsão de chuva</Text>

          <View style={styles.previsaoCard}>
            <View style={styles.previsaoIcone}>
              <Ionicons
                name="cloud-outline"
                size={26}
                color="#2F6BFF"
              />
            </View>

            <View style={styles.previsaoTexto}>
              <Text style={styles.previsaoTitulo}>
                Integração em desenvolvimento
              </Text>

              <Text style={styles.previsaoDescricao}>
                A previsão de chuva com o modelo de machine learning
                ainda não está disponível. Por enquanto, exibimos o
                risco histórico de alagamento do seu bairro.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.fonte}>
          Fonte: notícias e alertas oficiais coletados pelo pipeline do
          projeto. O risco é histórico e não substitui os avisos da
          Defesa Civil.
        </Text>

        {/* SAIR */}
        <View style={styles.logoutContainer}>
          <Text style={styles.logout} onPress={logout}>
            Sair da conta
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({
  icone,
  titulo,
  valor,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  valor: string;
}) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icone} size={24} color="#2F6BFF" />
      <Text style={styles.infoTitle}>{titulo}</Text>
      <Text style={styles.infoValue}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  greeting: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  location: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  updateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  timestamp: {
    fontSize: 12,
    color: "#64748B",
  },

  heroCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginBottom: 16,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  heroTexto: {
    flex: 1,
  },

  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#64748B",
    marginBottom: 6,
  },

  heroNivel: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },

  heroBairro: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
  },

  heroIcone: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: "center",
    alignItems: "center",
  },

  heroLoading: {
    marginTop: 20,
    alignSelf: "flex-start",
  },

  scoreLinha: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 14,
    gap: 4,
  },

  scoreValor: {
    fontSize: 52,
    fontWeight: "900",
    lineHeight: 56,
  },

  scoreMax: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
  },

  heroDescricao: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
    marginTop: 14,
  },

  alertCard: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },

  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  alertContent: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },

  alertDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  infoCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoTitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
  },

  infoValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  previsaoCard: {
    flexDirection: "row",
    backgroundColor: "#EAF2FF",
    borderRadius: 18,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },

  previsaoIcone: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#D8E6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  previsaoTexto: {
    flex: 1,
  },

  previsaoTitulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E40AF",
  },

  previsaoDescricao: {
    fontSize: 12,
    lineHeight: 19,
    color: "#365987",
    marginTop: 5,
  },

  fonte: {
    fontSize: 11,
    lineHeight: 17,
    color: "#94A3B8",
    marginBottom: 8,
  },

  logoutContainer: {
    alignItems: "center",
    marginTop: 8,
  },

  logout: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    padding: 10,
  },
});
