import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type TipoMensagem = "erro" | "aviso" | "info";

export type Mensagem = {
  tipo: TipoMensagem;
  titulo?: string;
  texto: string;
};

type Props = Mensagem & {
  // Quando informado, mostra o "x" para dispensar a mensagem.
  aoFechar?: () => void;
};

const ESTILOS: Record<
  TipoMensagem,
  {
    icone: keyof typeof Ionicons.glyphMap;
    cor: string;
    fundo: string;
    borda: string;
  }
> = {
  erro: {
    icone: "alert-circle",
    cor: "#DC2626",
    fundo: "#FEF2F2",
    borda: "#FECACA",
  },
  aviso: {
    icone: "warning",
    cor: "#B45309",
    fundo: "#FFFBEB",
    borda: "#FCD34D",
  },
  info: {
    icone: "information-circle",
    cor: "#1D4ED8",
    fundo: "#EFF6FF",
    borda: "#BFDBFE",
  },
};

/**
 * Mensagem exibida dentro da própria tela (no lugar de Alert.alert), com o
 * mesmo visual dos cards de Home e Alertas: fundo suave, borda fina e ícone.
 */
export function MensagemInline({ tipo, titulo, texto, aoFechar }: Props) {
  const estilo = ESTILOS[tipo];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: estilo.fundo, borderColor: estilo.borda },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={estilo.icone} size={20} color={estilo.cor} />

      <View style={styles.textos}>
        {titulo ? (
          <Text style={[styles.titulo, { color: estilo.cor }]}>{titulo}</Text>
        ) : null}
        <Text style={styles.texto}>{texto}</Text>
      </View>

      {aoFechar ? (
        <Pressable
          onPress={aoFechar}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Fechar mensagem"
        >
          <Ionicons name="close" size={18} color="#64748B" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: 14,
    fontWeight: "700",
  },
  texto: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
  },
});
