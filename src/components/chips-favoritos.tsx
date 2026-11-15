import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ehFavorito, LIMITE_FAVORITOS } from "@/lib/favoritos";

type Props = {
  bairroAtual: string;
  favoritos: string[];
  aoSelecionar: (bairro: string) => void;
  aoAlternarFavorito: (bairro: string) => void;
};

/**
 * Atalhos de bairros favoritos: um toque troca o bairro exibido; o "x" no chip
 * ativo remove o atalho; o chip tracejado salva o bairro atual.
 */
export function ChipsFavoritos({
  bairroAtual,
  favoritos,
  aoSelecionar,
  aoAlternarFavorito,
}: Props) {
  const atualJaFavorito = ehFavorito(favoritos, bairroAtual);
  const podeSalvarAtual =
    Boolean(bairroAtual) &&
    !atualJaFavorito &&
    favoritos.length < LIMITE_FAVORITOS;
  const limiteAtingido =
    Boolean(bairroAtual) &&
    !atualJaFavorito &&
    favoritos.length >= LIMITE_FAVORITOS;

  if (favoritos.length === 0 && !podeSalvarAtual) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.linha}
      >
        {favoritos.map((nome) => {
          const ativo = nome === bairroAtual;
          return (
            <View
              key={nome}
              style={[styles.chip, ativo && styles.chipAtivo]}
            >
              <Pressable
                style={styles.chipConteudo}
                onPress={() => aoSelecionar(nome)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                accessibilityLabel={`Ver ${nome}`}
              >
                <Ionicons
                  name={ativo ? "star" : "star-outline"}
                  size={14}
                  color={ativo ? "#FFFFFF" : "#2563EB"}
                />
                <Text
                  style={[styles.texto, ativo && styles.textoAtivo]}
                  numberOfLines={1}
                >
                  {nome}
                </Text>
              </Pressable>

              {ativo && (
                <Pressable
                  onPress={() => aoAlternarFavorito(nome)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${nome} dos favoritos`}
                >
                  <Ionicons name="close-circle" size={16} color="#DBEAFE" />
                </Pressable>
              )}
            </View>
          );
        })}

        {podeSalvarAtual && (
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              styles.chipAdicionar,
              pressed && styles.pressionado,
            ]}
            onPress={() => aoAlternarFavorito(bairroAtual)}
            accessibilityRole="button"
            accessibilityLabel={`Salvar ${bairroAtual} nos favoritos`}
          >
            <Ionicons name="add" size={16} color="#2563EB" />
            <Text style={styles.textoAdicionar} numberOfLines={1}>
              Salvar {bairroAtual}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {limiteAtingido && (
        <Text style={styles.aviso}>
          Limite de {LIMITE_FAVORITOS} favoritos. Remova um (toque no x) para salvar {bairroAtual}.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    maxWidth: 220,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
  },
  chipAtivo: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  chipConteudo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  chipAdicionar: {
    borderStyle: "dashed",
    backgroundColor: "#EFF6FF",
  },
  pressionado: {
    opacity: 0.75,
  },
  texto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1D4ED8",
    flexShrink: 1,
  },
  textoAtivo: {
    color: "#FFFFFF",
  },
  textoAdicionar: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    flexShrink: 1,
  },
  aviso: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },
});
