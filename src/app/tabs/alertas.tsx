import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { bairrosRecife } from "@/data/bairros";
import { auth, db } from "@/lib/firebase";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CategoriaAlerta = "chuva" | "desastre";
type NivelRisco = "Moderado" | "Alto" | "Muito alto";

type Alerta = {
  id: string;
  bairro: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaAlerta;
  nivel: NivelRisco;
  horario: string;
  icone: keyof typeof Ionicons.glyphMap;
};

const CORES = {
  azul: "#3366FF",
  azulEscuro: "#1D3FBF",
  fundo: "#F4F7FC",
  texto: "#172B4D",
  secundario: "#6B7A90",
  branco: "#FFFFFF",
  borda: "#E5EAF2",
  verde: "#16865C",
  laranja: "#D97706",
  vermelho: "#D93636",
};

function obterNivel(indice: number): NivelRisco {
  const niveis: NivelRisco[] = ["Moderado", "Alto", "Muito alto"];
  return niveis[indice % niveis.length];
}

function criarAlertas(bairro: string): Alerta[] {
  const indice = Math.max(
    0,
    bairrosRecife.findIndex((item) => item === bairro)
  );

  return [
    {
      id: `${bairro}-chuva`,
      bairro,
      titulo: "Chuva forte",
      descricao:
        "Fique atento à intensidade da chuva e evite áreas com histórico de alagamento.",
      categoria: "chuva",
      nivel: obterNivel(indice + 1),
      horario: "Atenção meteorológica",
      icone: "rainy-outline",
    },
    {
      id: `${bairro}-desastre`,
      bairro,
      titulo: "Alagamentos e deslizamentos",
      descricao:
        "Evite ruas alagadas e fique atento a sinais de movimentação de terra em áreas de encosta.",
      categoria: "desastre",
      nivel: obterNivel(indice + 2),
      horario: "Atenção à segurança",
      icone: "warning-outline",
    },
  ];
}

function coresDoRisco(nivel: NivelRisco) {
  if (nivel === "Muito alto") {
    return {
      fundo: "#FFF0F0",
      texto: "#C62828",
      ponto: "#E53935",
    };
  }

  if (nivel === "Alto") {
    return {
      fundo: "#FFF4E5",
      texto: "#B45309",
      ponto: "#F59E0B",
    };
  }

  return {
    fundo: "#EAF7F0",
    texto: "#18794E",
    ponto: "#22A06B",
  };
}

export default function Alertas() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [bairro, setBairro] = useState("");
  const [modalBairro, setModalBairro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [notificarChuva, setNotificarChuva] = useState(false);
  const [notificarDesastres, setNotificarDesastres] = useState(false);
  const [salvandoPreferencia, setSalvandoPreferencia] =
    useState<CategoriaAlerta | null>(null);

  const alertas = useMemo(
    () => (bairro ? criarAlertas(bairro) : []),
    [bairro]
  );

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (usuarioAtual) => {
      if (!usuarioAtual) {
        setUsuario(null);
        setCarregando(false);
        router.replace("/login");
        return;
      }

      setUsuario(usuarioAtual);

      try {
        const perfilRef = doc(db, "users", usuarioAtual.uid);
        const perfilSnap = await getDoc(perfilRef);

        let bairroSalvo = "";

        if (perfilSnap.exists()) {
          const dados = perfilSnap.data();
          const bairroPerfil = dados.bairro;

          if (
            typeof bairroPerfil === "string" &&
            bairrosRecife.includes(bairroPerfil)
          ) {
            bairroSalvo = bairroPerfil;
          }
        }

        setBairro(bairroSalvo);

        const [chuvaSalva, desastresSalvos] = await Promise.all([
          AsyncStorage.getItem(
            `@AlertaChuva:${usuarioAtual.uid}:chuva`
          ),
          AsyncStorage.getItem(
            `@AlertaChuva:${usuarioAtual.uid}:desastre`
          ),
        ]);

        setNotificarChuva(chuvaSalva === "true");
        setNotificarDesastres(desastresSalvos === "true");
      } catch (erro) {
        console.error("Erro ao carregar alertas:", erro);
        Alert.alert(
          "Não foi possível carregar",
          "Verifique sua conexão e tente novamente."
        );
      } finally {
        setCarregando(false);
      }
    });

    return cancelar;
  }, []);

  async function salvarBairro(novoBairro: string) {
    if (!usuario) {
      Alert.alert("Atenção", "Entre na sua conta para salvar seu bairro.");
      return;
    }

    try {
      setBairro(novoBairro);
      setModalBairro(false);

      await setDoc(
        doc(db, "users", usuario.uid),
        {
          uid: usuario.uid,
          email: usuario.email ?? "",
          bairro: novoBairro,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      Alert.alert(
        "Bairro atualizado",
        `Os alertas exibidos agora são referentes a ${novoBairro}.`
      );
    } catch (erro) {
      console.error("Erro ao salvar bairro:", erro);

      Alert.alert(
        "Erro ao salvar",
        "Não foi possível atualizar seu bairro no momento."
      );
    }
  }

  async function alterarNotificacao(
    categoria: CategoriaAlerta,
    ativar: boolean
  ) {
    if (!usuario) {
      Alert.alert("Atenção", "Entre na sua conta para configurar alertas.");
      return;
    }

    setSalvandoPreferencia(categoria);

    try {
      if (ativar) {
        const permissaoAtual =
          await Notifications.getPermissionsAsync();

        let status = permissaoAtual.status;

        if (status !== "granted") {
          const permissaoSolicitada =
            await Notifications.requestPermissionsAsync();

          status = permissaoSolicitada.status;
        }

        if (status !== "granted") {
          Alert.alert(
            "Permissão necessária",
            "Para permitir notificações, habilite essa opção nas configurações do seu celular."
          );
          return;
        }
      }

      const chave = `@AlertaChuva:${usuario.uid}:${categoria}`;

      await AsyncStorage.setItem(chave, String(ativar));

      if (categoria === "chuva") {
        setNotificarChuva(ativar);
      } else {
        setNotificarDesastres(ativar);
      }

      Alert.alert(
        ativar ? "Notificações ativadas" : "Notificações desativadas",
        ativar
          ? "Sua preferência foi salva neste dispositivo."
          : "Você pode ativar essa opção novamente quando quiser."
      );
    } catch (erro) {
      console.error("Erro ao configurar notificações:", erro);

      Alert.alert(
        "Não foi possível salvar",
        "Tente novamente em instantes."
      );
    } finally {
      setSalvandoPreferencia(null);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={CORES.fundo} />
        <ActivityIndicator size="large" color={CORES.azul} />
        <Text style={styles.loadingText}>Carregando seus alertas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={CORES.fundo} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>Alertas</Text>
            <Text style={styles.headerSubtitulo}>
              Acompanhe os riscos e cuide-se.
            </Text>
          </View>

          <View style={styles.headerIcone}>
            <Ionicons
              name="notifications-outline"
              size={27}
              color={CORES.azul}
            />
          </View>
        </View>

        {/* Bairro selecionado */}
        <Pressable
          style={({ pressed }) => [
            styles.bairroCard,
            pressed && styles.pressionado,
          ]}
          onPress={() => setModalBairro(true)}
        >
          <View style={styles.bairroIcone}>
            <Ionicons
              name="location"
              size={24}
              color={CORES.azul}
            />
          </View>

          <View style={styles.bairroInfo}>
            <Text style={styles.bairroLegenda}>SEU BAIRRO</Text>
            <Text style={styles.bairroNome}>
              {bairro || "Selecione seu bairro"}
            </Text>
            <Text style={styles.bairroAcao}>Toque para alterar</Text>
          </View>

          <View style={styles.bairroSeta}>
            <Ionicons
              name="chevron-forward"
              size={21}
              color={CORES.azul}
            />
          </View>
        </Pressable>

        {/* Preferências de notificação */}
        <View style={styles.secao}>
          <View style={styles.tituloLinha}>
            <View style={styles.tituloIcone}>
              <Ionicons
                name="notifications"
                size={20}
                color={CORES.azul}
              />
            </View>

            <Text style={styles.secaoTitulo}>Notificações</Text>
          </View>

          <View style={styles.notificacoesCard}>
            <View style={styles.notificacaoLinha}>
              <View style={[styles.notificacaoIcone, styles.iconeChuva]}>
                <Ionicons
                  name="rainy-outline"
                  size={23}
                  color="#3366FF"
                />
              </View>

              <View style={styles.notificacaoTexto}>
                <Text style={styles.notificacaoTitulo}>
                  Chuvas fortes
                </Text>
                <Text style={styles.notificacaoDescricao}>
                  Avisos sobre chuva intensa
                </Text>
              </View>

              {salvandoPreferencia === "chuva" ? (
                <ActivityIndicator color={CORES.azul} />
              ) : (
                <Switch
                  value={notificarChuva}
                  onValueChange={(valor) =>
                    alterarNotificacao("chuva", valor)
                  }
                  trackColor={{
                    false: "#D8DEE9",
                    true: "#AFC2FF",
                  }}
                  thumbColor={
                    notificarChuva ? CORES.azul : "#FFFFFF"
                  }
                  accessibilityLabel="Notificações de chuvas fortes"
                />
              )}
            </View>

            <View style={styles.divisor} />

            <View style={styles.notificacaoLinha}>
              <View
                style={[
                  styles.notificacaoIcone,
                  styles.iconeDesastres,
                ]}
              >
                <Ionicons
                  name="warning-outline"
                  size={23}
                  color="#D97706"
                />
              </View>

              <View style={styles.notificacaoTexto}>
                <Text style={styles.notificacaoTitulo}>
                  Riscos de desastres
                </Text>
                <Text style={styles.notificacaoDescricao}>
                  Avisos sobre alagamentos e deslizamentos
                </Text>
              </View>

              {salvandoPreferencia === "desastre" ? (
                <ActivityIndicator color={CORES.azul} />
              ) : (
                <Switch
                  value={notificarDesastres}
                  onValueChange={(valor) =>
                    alterarNotificacao("desastre", valor)
                  }
                  trackColor={{
                    false: "#D8DEE9",
                    true: "#AFC2FF",
                  }}
                  thumbColor={
                    notificarDesastres ? CORES.azul : "#FFFFFF"
                  }
                  accessibilityLabel="Notificações de riscos de desastres"
                />
              )}
            </View>
          </View>
        </View>

        {/* Alertas do bairro */}
        <View style={styles.secao}>
          <View style={styles.alertasTituloLinha}>
            <View style={styles.tituloLinha}>
              <View style={styles.tituloIcone}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color={CORES.azul}
                />
              </View>

              <Text style={styles.secaoTitulo}>
                Alertas do seu bairro
              </Text>
            </View>

            <View style={styles.quantidadeBadge}>
              <Text style={styles.quantidadeTexto}>
                {alertas.length}
              </Text>
            </View>
          </View>

          {!bairro ? (
            <View style={styles.estadoVazio}>
              <View style={styles.vazioIcone}>
                <Ionicons
                  name="location-outline"
                  size={32}
                  color={CORES.azul}
                />
              </View>

              <Text style={styles.vazioTitulo}>
                Escolha seu bairro
              </Text>

              <Text style={styles.vazioDescricao}>
                Selecione seu bairro para visualizar os alertas.
              </Text>

              <Pressable
                style={styles.botaoSelecionar}
                onPress={() => setModalBairro(true)}
              >
                <Text style={styles.botaoSelecionarTexto}>
                  Selecionar bairro
                </Text>
              </Pressable>
            </View>
          ) : (
            alertas.map((alerta) => (
              <CartaoAlerta key={alerta.id} alerta={alerta} />
            ))
          )}
        </View>

        {/* Orientação de segurança */}
        <View style={styles.segurancaCard}>
          <View style={styles.segurancaIcone}>
            <Ionicons
              name="information-circle-outline"
              size={25}
              color="#1D4ED8"
            />
          </View>

          <View style={styles.segurancaTexto}>
            <Text style={styles.segurancaTitulo}>
              Cuide da sua segurança
            </Text>
            <Text style={styles.segurancaDescricao}>
              Em situações de perigo, evite áreas alagadas e siga as
              orientações da Defesa Civil.
            </Text>
          </View>
        </View>

        <View style={styles.rodape}>
          <Ionicons
            name="umbrella-outline"
            size={18}
            color={CORES.secundario}
          />
          <Text style={styles.rodapeTexto}>
            AlertaChuva · Recife, PE
          </Text>
        </View>
      </ScrollView>

      {/* Modal de bairros */}
      <Modal
        visible={modalBairro}
        animationType="slide"
        transparent
        onRequestClose={() => setModalBairro(false)}
      >
        <View style={styles.modalFundo}>
          <Pressable
            style={styles.modalAreaFechar}
            onPress={() => setModalBairro(false)}
          />

          <View style={styles.modalContainer}>
            <View style={styles.modalIndicador} />

            <View style={styles.modalCabecalho}>
              <View>
                <Text style={styles.modalTitulo}>
                  Seu bairro
                </Text>
                <Text style={styles.modalSubtitulo}>
                  Escolha uma região do Recife
                </Text>
              </View>

              <Pressable
                style={styles.modalFechar}
                onPress={() => setModalBairro(false)}
                accessibilityLabel="Fechar seleção de bairro"
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={CORES.texto}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listaBairros}
            >
              {bairrosRecife.map((item) => {
                const selecionado = item === bairro;

                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.itemBairro,
                      selecionado && styles.itemBairroSelecionado,
                    ]}
                    onPress={() => salvarBairro(item)}
                  >
                    <View
                      style={[
                        styles.itemBairroIcone,
                        selecionado &&
                          styles.itemBairroIconeSelecionado,
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={19}
                        color={
                          selecionado ? CORES.azul : CORES.secundario
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.itemBairroTexto,
                        selecionado && styles.itemBairroTextoSelecionado,
                      ]}
                    >
                      {item}
                    </Text>

                    {selecionado && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={CORES.azul}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CartaoAlerta({ alerta }: { alerta: Alerta }) {
  const risco = coresDoRisco(alerta.nivel);

  const descricaoCategoria =
    alerta.categoria === "chuva"
      ? "CHUVA"
      : "RISCO DE DESASTRE";

  return (
    <View style={styles.alertaCard}>
      <View style={styles.alertaTopo}>
        <View
          style={[
            styles.alertaIcone,
            {
              backgroundColor: risco.fundo,
            },
          ]}
        >
          <Ionicons
            name={alerta.icone}
            size={26}
            color={risco.texto}
          />
        </View>

        <View style={styles.alertaTituloContainer}>
          <Text style={styles.alertaCategoria}>
            {descricaoCategoria}
          </Text>
          <Text style={styles.alertaTitulo}>
            {alerta.titulo}
          </Text>
        </View>

        <View
          style={[
            styles.pontoRisco,
            { backgroundColor: risco.ponto },
          ]}
        />
      </View>

      <Text style={styles.alertaDescricao}>
        {alerta.descricao}
      </Text>

      <View style={styles.alertaRodape}>
        <View
          style={[
            styles.riscoBadge,
            { backgroundColor: risco.fundo },
          ]}
        >
          <View
            style={[
              styles.riscoPonto,
              { backgroundColor: risco.ponto },
            ]}
          />
          <Text
            style={[
              styles.riscoTexto,
              { color: risco.texto },
            ]}
          >
            Risco {alerta.nivel.toLowerCase()}
          </Text>
        </View>

        <View style={styles.horarioContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={15}
            color={CORES.secundario}
          />
          <Text style={styles.horarioTexto}>
            {alerta.horario}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CORES.fundo,
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    color: CORES.secundario,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  headerTextos: {
    flex: 1,
  },
  headerTitulo: {
    color: CORES.texto,
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  headerSubtitulo: {
    color: CORES.secundario,
    fontSize: 15,
    marginTop: 4,
  },
  headerIcone: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#E8EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bairroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CORES.branco,
    borderRadius: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginBottom: 27,
    shadowColor: "#1D3557",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  pressionado: {
    opacity: 0.8,
  },
  bairroIcone: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  bairroInfo: {
    flex: 1,
  },
  bairroLegenda: {
    color: CORES.secundario,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  bairroNome: {
    color: CORES.texto,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 4,
  },
  bairroAcao: {
    color: CORES.azul,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  bairroSeta: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F1F5FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  secao: {
    marginBottom: 27,
  },
  tituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tituloIcone: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secaoTitulo: {
    color: CORES.texto,
    fontSize: 19,
    fontWeight: "800",
    flexShrink: 1,
  },
  notificacoesCard: {
    backgroundColor: CORES.branco,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 4,
    marginTop: 15,
    borderWidth: 1,
    borderColor: CORES.borda,
    shadowColor: "#1D3557",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  notificacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  notificacaoIcone: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconeChuva: {
    backgroundColor: "#EAF0FF",
  },
  iconeDesastres: {
    backgroundColor: "#FFF1DE",
  },
  notificacaoTexto: {
    flex: 1,
  },
  notificacaoTitulo: {
    color: CORES.texto,
    fontSize: 15,
    fontWeight: "700",
  },
  notificacaoDescricao: {
    color: CORES.secundario,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  divisor: {
    height: 1,
    backgroundColor: "#EDF0F5",
    marginLeft: 58,
  },
  alertasTituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 15,
  },
  quantidadeBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: "#E8EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  quantidadeTexto: {
    color: CORES.azul,
    fontSize: 13,
    fontWeight: "800",
  },
  alertaCard: {
    backgroundColor: CORES.branco,
    borderRadius: 22,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: CORES.borda,
    shadowColor: "#1D3557",
    shadowOpacity: 0.045,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  alertaTopo: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertaIcone: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  alertaTituloContainer: {
    flex: 1,
  },
  alertaCategoria: {
    color: CORES.secundario,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  alertaTitulo: {
    color: CORES.texto,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  pontoRisco: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: 8,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  alertaDescricao: {
    color: "#58677D",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 15,
  },
  alertaRodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF0F5",
    marginTop: 15,
    paddingTop: 13,
  },
  riscoBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  riscoPonto: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  riscoTexto: {
    fontSize: 11,
    fontWeight: "800",
  },
  horarioContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  horarioTexto: {
    color: CORES.secundario,
    fontSize: 10,
  },
  estadoVazio: {
    alignItems: "center",
    backgroundColor: CORES.branco,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  vazioIcone: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  vazioTitulo: {
    color: CORES.texto,
    fontSize: 18,
    fontWeight: "800",
  },
  vazioDescricao: {
    color: CORES.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  botaoSelecionar: {
    backgroundColor: CORES.azul,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 13,
  },
  botaoSelecionarTexto: {
    color: CORES.branco,
    fontSize: 14,
    fontWeight: "800",
  },
  segurancaCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EAF2FF",
    borderRadius: 19,
    padding: 16,
    gap: 11,
    marginTop: 2,
  },
  segurancaIcone: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#D8E6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  segurancaTexto: {
    flex: 1,
  },
  segurancaTitulo: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "800",
  },
  segurancaDescricao: {
    color: "#365987",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  rodape: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginTop: 24,
  },
  rodapeTexto: {
    color: CORES.secundario,
    fontSize: 12,
    fontWeight: "500",
  },
  modalFundo: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  modalAreaFechar: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: CORES.branco,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "78%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalIndicador: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D8DEE9",
    alignSelf: "center",
    marginBottom: 22,
  },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  modalTitulo: {
    color: CORES.texto,
    fontSize: 23,
    fontWeight: "800",
  },
  modalSubtitulo: {
    color: CORES.secundario,
    fontSize: 13,
    marginTop: 5,
  },
  modalFechar: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#F1F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  listaBairros: {
    paddingBottom: 12,
  },
  itemBairro: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 5,
    gap: 11,
  },
  itemBairroSelecionado: {
    backgroundColor: "#EDF2FF",
  },
  itemBairroIcone: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  itemBairroIconeSelecionado: {
    backgroundColor: "#DCE6FF",
  },
  itemBairroTexto: {
    flex: 1,
    color: CORES.texto,
    fontSize: 14,
    fontWeight: "500",
  },
  itemBairroTextoSelecionado: {
    color: CORES.azulEscuro,
    fontWeight: "800",
  },
});