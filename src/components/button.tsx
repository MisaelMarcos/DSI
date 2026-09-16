import {
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
} from "react-native";

type ButtonProps = TouchableOpacityProps & {
  label: string;
  // "primary" (padrão): fundo azul, texto branco. "white": fundo branco, texto azul.
  variant?: "primary" | "white";
};

export function Button({ label, variant = "primary", ...rest }: ButtonProps) {
  const isWhite = variant === "white";
  return (
    <TouchableOpacity
      style={[styles.container, isWhite && styles.whiteContainer]}
      activeOpacity={0.7}
      {...rest}
    >
      <Text style={[styles.label, isWhite && styles.whiteLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 48,
    backgroundColor: "#3366FF",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 600,
  },
  whiteContainer: {
    backgroundColor: "#FFFFFF",
  },
  whiteLabel: {
    color: "#3366FF",
  },
});
