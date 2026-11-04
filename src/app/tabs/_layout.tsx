import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useMonitorGatilhoAlertas } from "@/hooks/useNotificacoesAlerta";

export default function TabLayout() {
  useMonitorGatilhoAlertas();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2F6BFF",
        tabBarInactiveTintColor: "#94A3B8",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={typeof color === "string" ? color : "#2F6BFF"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="alertas"
        options={{
          title: "Alertas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="notifications-outline"
              size={size}
              color={typeof color === "string" ? color : "#94A3B8"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
