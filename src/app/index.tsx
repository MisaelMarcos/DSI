import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { Button } from "@/components/button";
import { LogoPlaceholder } from "@/components/logo-placeholder";

// Landing — rota /.
// Fundo em gradiente azul-claro + logo destacada em card branco.
export default function Landing() {
  return (
    <LinearGradient colors={["#2F6BFF", "#4697ee"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.logoCard}>
            <LogoPlaceholder size={200} />
          </View>
          <Text style={styles.title}>
            Alerta<Text style={styles.titleBlue}>Chuva</Text>
          </Text>
          <Text style={styles.tagline}>
            Informação para você se proteger da chuva
          </Text>
          <Text style={styles.city}>Recife</Text>
          <View style={styles.cta}>
            <Button
              label="Começar"
              variant="white"
              onPress={() => router.push("/login")}
            />
          </View>
          <Text style={styles.hint}>
            Previsão horária • Alertas • Recife
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 44,
    padding: 14,
    // Sombra no iOS.
    shadowColor: "#0B2A5B",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    // Sombra no Android.
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
    color: "#FFFFFF",
  },
  titleBlue: {
    color: "#3366FF",
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
    color: "#FFFFFF",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  city: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#FFFFFF",
    marginTop: 4,
    opacity: 0.9,
  },
  cta: {
    width: "100%",
    marginTop: 24,
  },
  hint: {
    marginTop: 16,
    fontSize: 13,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.85,
  },
});
