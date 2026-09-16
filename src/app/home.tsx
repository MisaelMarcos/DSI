import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Home() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá! 👋</Text>

            <View style={styles.locationContainer}>
              <Ionicons
                name="location-sharp"
                size={18}
                color="#2F6BFF"
              />

              <Text style={styles.location}>
                Recife, PE
              </Text>
            </View>
          </View>

          <View style={styles.updateContainer}>
            <Ionicons
              name="refresh-outline"
              size={16}
              color="#64748B"
            />

            <Text style={styles.timestamp}>
              Agora
            </Text>
          </View>
        </View>

        {/* CARD PRINCIPAL */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>
                Condição atual
              </Text>

              <Text style={styles.heroTemp}>
                28°
              </Text>
            </View>

            <View style={styles.weatherIcon}>
              <Ionicons
                name="rainy-outline"
                size={70}
                color="#2F6BFF"
              />
            </View>
          </View>

          <Text style={styles.heroStatus}>
            Pancadas de chuva moderadas
          </Text>

          <View style={styles.riskContainer}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#2F6BFF"
            />

            <Text style={styles.riskText}>
              Possibilidade de chuva nas próximas horas
            </Text>
          </View>
        </View>

        {/* ALERTA */}
        <View style={styles.alertCard}>
          <View style={styles.alertIcon}>
            <Ionicons
              name="warning"
              size={24}
              color="#DC2626"
            />
          </View>

          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>
              Atenção para chuva forte
            </Text>

            <Text style={styles.alertDescription}>
              Há previsão de aumento da intensidade da chuva
              nas próximas 2 horas.
            </Text>
          </View>
        </View>

        {/* PRÓXIMAS HORAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Previsão para as próximas horas
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourlyContainer}
          >
            <View style={styles.hourCard}>
              <Text style={styles.hour}>18h</Text>

              <Ionicons
                name="rainy-outline"
                size={28}
                color="#2F6BFF"
              />

              <Text style={styles.hourTemp}>28°</Text>

              <Text style={styles.hourRain}>
                4,2 mm
              </Text>
            </View>

            <View style={styles.hourCard}>
              <Text style={styles.hour}>19h</Text>

              <Ionicons
                name="rainy-outline"
                size={28}
                color="#2F6BFF"
              />

              <Text style={styles.hourTemp}>27°</Text>

              <Text style={styles.hourRain}>
                7,8 mm
              </Text>
            </View>

            <View style={styles.hourCardAlert}>
              <Text style={styles.hour}>20h</Text>

              <Ionicons
                name="thunderstorm-outline"
                size={28}
                color="#DC2626"
              />

              <Text style={styles.hourTemp}>26°</Text>

              <Text style={styles.hourRainAlert}>
                12,5 mm
              </Text>
            </View>

            <View style={styles.hourCard}>
              <Text style={styles.hour}>21h</Text>

              <Ionicons
                name="rainy-outline"
                size={28}
                color="#2F6BFF"
              />

              <Text style={styles.hourTemp}>26°</Text>

              <Text style={styles.hourRain}>
                6,1 mm
              </Text>
            </View>

            <View style={styles.hourCard}>
              <Text style={styles.hour}>22h</Text>

              <Ionicons
                name="cloud-outline"
                size={28}
                color="#64748B"
              />

              <Text style={styles.hourTemp}>25°</Text>

              <Text style={styles.hourRain}>
                2,0 mm
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* INFORMAÇÕES METEOROLÓGICAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Condições meteorológicas
          </Text>

          <View style={styles.infoGrid}>

            <View style={styles.infoCard}>
              <Ionicons
                name="water-outline"
                size={24}
                color="#2F6BFF"
              />

              <Text style={styles.infoTitle}>
                Umidade
              </Text>

              <Text style={styles.infoValue}>
                82%
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="speedometer-outline"
                size={24}
                color="#2F6BFF"
              />

              <Text style={styles.infoTitle}>
                Vento
              </Text>

              <Text style={styles.infoValue}>
                4,8 m/s
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="thermometer-outline"
                size={24}
                color="#2F6BFF"
              />

              <Text style={styles.infoTitle}>
                Temperatura
              </Text>

              <Text style={styles.infoValue}>
                28°C
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="analytics-outline"
                size={24}
                color="#2F6BFF"
              />

              <Text style={styles.infoTitle}>
                Pressão
              </Text>

              <Text style={styles.infoValue}>
                1012 mB
              </Text>
            </View>

          </View>
        </View>

        {/* SAIR */}
        <View style={styles.logoutContainer}>
          <Text
            style={styles.logout}
            onPress={() => router.replace("/")}
          >
            Sair da conta
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  greeting: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  location: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  updateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  timestamp: {
    fontSize: 12,
    color: "#64748B",
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },

  heroTemp: {
    fontSize: 64,
    fontWeight: "900",
    color: "#0F172A",
  },

  weatherIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  heroStatus: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },

  riskContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  riskText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
  },

  alertCard: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 24,
  },

  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  alertContent: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 4,
  },

  alertDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7F1D1D",
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },

  hourlyContainer: {
    gap: 10,
  },

  hourCard: {
    width: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },

  hourCardAlert: {
    width: 80,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    gap: 8,
  },

  hour: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  hourTemp: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  hourRain: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2F6BFF",
  },

  hourRainAlert: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  infoCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoTitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
  },

  infoValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  logoutContainer: {
    alignItems: "center",
    marginTop: 8,
  },

  logout: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    padding: 10,
  },
});
