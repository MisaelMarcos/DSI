import { Image, StyleSheet } from "react-native";

type LogoPlaceholderProps = {
  size?: number;
};

// Logo oficial do Alerta Chuva Recife.
// Arquivo: src/assets/logo.png (copiado de assets/images/).
export function LogoPlaceholder({ size = 96 }: LogoPlaceholderProps) {
  return (
    <Image
      source={require("@/assets/logo.png")}
      style={[styles.logo, { width: size, height: size, borderRadius: size * 0.24 }]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    resizeMode: "contain",
  },
});
