import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useLocalizacaoBairro } from "@/hooks/useLocalizacaoBairro";
import type { BairroProximo } from "@/lib/bairros";

type Props = {
  aoDetectar: (resultado: BairroProximo) => void;
  desabilitado?: boolean;
};

export function BotaoLocalizacao({ aoDetectar, desabilitado }: Props) {
  const { detectar, buscando, erro } = useLocalizacaoBairro();

  async function aoPressionar() {
    const resultado = await detectar();
    if (resultado) aoDetectar(resultado);
  }

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.botao,
          (desabilitado || buscando) && styles.botaoDesabilitado,
          pressed && styles.botaoPressionado,
        ]}
        disabled={desabilitado || buscando}
        onPress={aoPressionar}
        accessibilityRole="button"
        accessibilityLabel="Usar minha localização atual"
      >
        {buscando ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <Ionicons name="locate" size={20} color="#2563EB" />
        )}
        <Text style={styles.texto}>
          {buscando ? "Detectando bairro..." : "Usar minha localização atual"}
        </Text>
      </Pressable>

      {erro !== "" && (
        <Text style={styles.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  botao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoPressionado: {
    opacity: 0.8,
  },
  texto: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  erro: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#DC2626",
  },
});
