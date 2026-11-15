import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { BotaoLocalizacao } from "@/components/botao-localizacao";
import { bairrosRecife } from "@/data/bairros";
import { normalizarTexto } from "@/lib/bairros";

const DURACAO_ENTRADA_MS = 280;
const DURACAO_SAIDA_MS = 200;
const USAR_DRIVER_NATIVO = Platform.OS !== "web";

type Props = {
  visivel: boolean;
  bairroAtual: string;
  aoFechar: () => void;
  aoSelecionar: (bairro: string) => void;
};

export function SeletorBairroModal({
  visivel,
  bairroAtual,
  aoFechar,
  aoSelecionar,
}: Props) {
  const [busca, setBusca] = useState("");
  const { height: alturaTela } = useWindowDimensions();

  const [montado, setMontado] = useState(visivel);
  const progresso = useRef(new Animated.Value(visivel ? 1 : 0)).current;

  useEffect(() => {
    if (visivel) setMontado(true);
  }, [visivel]);

  useEffect(() => {
    if (!montado) return;

    if (visivel) {
      Animated.timing(progresso, {
        toValue: 1,
        duration: DURACAO_ENTRADA_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USAR_DRIVER_NATIVO,
      }).start();
    } else {
      Animated.timing(progresso, {
        toValue: 0,
        duration: DURACAO_SAIDA_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USAR_DRIVER_NATIVO,
      }).start(({ finished }) => {
        if (finished) setMontado(false);
      });
    }
  }, [visivel, montado, progresso]);

  const deslocamentoFolha = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [alturaTela, 0],
  });

  const bairrosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return bairrosRecife;
    return bairrosRecife.filter((nome) =>
      normalizarTexto(nome).includes(termo),
    );
  }, [busca]);

  function fechar() {
    setBusca("");
    aoFechar();
  }

  function escolher(item: string) {
    setBusca("");
    aoSelecionar(item);
    aoFechar();
  }

  return (
    <Modal
      visible={montado}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={fechar}
    >
      <View style={styles.fundo}>
        <Animated.View
          pointerEvents="none"
          style={[styles.escurecimento, { opacity: progresso }]}
        />
        <Pressable style={styles.areaFechar} onPress={fechar} />

        <Animated.View
          style={[
            styles.folha,
            { transform: [{ translateY: deslocamentoFolha }] },
          ]}
        >
          <View style={styles.alca} />

          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>Escolher bairro</Text>

            <Pressable
              style={styles.botaoFechar}
              onPress={fechar}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={20} color="#334155" />
            </Pressable>
          </View>

          <View style={styles.localizacao}>
            <BotaoLocalizacao aoDetectar={({ bairro }) => escolher(bairro)} />
          </View>

          <View style={styles.buscaBox}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar bairro do Recife..."
              placeholderTextColor="#94A3B8"
              style={styles.buscaInput}
              autoCorrect={false}
            />
            {busca.length > 0 && (
              <Pressable onPress={() => setBusca("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          <FlatList
            data={bairrosFiltrados}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <Text style={styles.vazio}>
                Nenhum bairro encontrado para "{busca}".
              </Text>
            }
            renderItem={({ item }) => {
              const selecionado = item === bairroAtual;
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.item,
                    selecionado && styles.itemSelecionado,
                    pressed && styles.itemPressionado,
                  ]}
                  onPress={() => escolher(item)}
                >
                  <Text
                    style={[
                      styles.itemTexto,
                      selecionado && styles.itemTextoSelecionado,
                    ]}
                  >
                    {item}
                  </Text>

                  {selecionado && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#2563EB"
                    />
                  )}
                </Pressable>
              );
            }}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  escurecimento: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  areaFechar: {
    flex: 1,
  },
  folha: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  alca: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  botaoFechar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  localizacao: {
    marginBottom: 12,
  },
  buscaBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  buscaInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 0,
  },
  lista: {
    paddingBottom: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  itemSelecionado: {
    backgroundColor: "#EFF6FF",
    borderBottomColor: "transparent",
  },
  itemPressionado: {
    opacity: 0.7,
  },
  itemTexto: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  itemTextoSelecionado: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  vazio: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    paddingVertical: 28,
  },
});
