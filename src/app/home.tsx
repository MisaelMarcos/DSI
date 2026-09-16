import { ScrollView, StyleSheet, Text, View } from "react-native";

import { router } from "expo-router";

import { Button } from "@/components/button";

// Home provisória — rota /home. Template estilo Climatempo.
// TODO(home): trocar cards mock por dados de previsão + alertas do Firebase/API.
export default function Home() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <Text style={styles.location}>Recife • agora</Text>
        <View style={styles.hero}>
          <Text style={styles.heroTemp}>--°</Text>
          <Text style={styles.heroSub}>Home provisória — template</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hoje</Text>
            <Text style={styles.cardSub}>--</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Amanhã</Text>
            <Text style={styles.cardSub}>--</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alertas</Text>
            <Text style={styles.cardSub}>--</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Button label="Sair" onPress={() => router.replace("/")} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F2F6FF",
    padding: 24,
  },
  location: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 40,
  },
  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginTop: 12,
    alignItems: "center",
  },
  heroTemp: {
    fontSize: 56,
    fontWeight: "900",
  },
  heroSub: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
  },
});
