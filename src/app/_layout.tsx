import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { SessionProvider, useSession } from "@/contexts/sessionContext";

// Mantém a splash visível até o Firebase informar se há sessão salva.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { user, initializing } = useSession();

  useEffect(() => {
    if (!initializing) {
      SplashScreen.hideAsync();
    }
  }, [initializing]);

  // Não monta nenhuma rota antes de saber se há usuário; senão um link direto
  // para /tabs/home (web) seria tratado como "deslogado" por engano.
  if (initializing) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      {/* Só existe com usuário logado. Ao deslogar, o router sai. */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="tabs" />
      </Stack.Protected>

      {/* Só existe sem usuário. Ao logar/cadastrar, o router sai. */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack.Protected>
    </Stack>
  );
}
