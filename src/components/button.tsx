import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

type ButtonProps = TouchableOpacityProps & {
  label: string;
  // "primary" (padrão): fundo azul, texto branco. "white": fundo branco, texto azul.
  variant?: "primary" | "white";
  // Mostra o indicador de carregamento no lugar do texto e bloqueia o toque.
  loading?: boolean;
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isWhite = variant === "white";
  const bloqueado = Boolean(disabled) || loading;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isWhite && styles.whiteContainer,
        bloqueado && styles.bloqueado,
      ]}
      activeOpacity={0.7}
      disabled={bloqueado}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: bloqueado, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isWhite ? "#2563EB" : "#FFFFFF"} />
      ) : (
        <Text style={[styles.label, isWhite && styles.whiteLabel]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 52,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  whiteContainer: {
    backgroundColor: "#FFFFFF",
  },
  whiteLabel: {
    color: "#2563EB",
  },
  bloqueado: {
    opacity: 0.85,
  },
});
