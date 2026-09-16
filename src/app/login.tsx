import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useEffect, useState } from "react";

import { Link, router } from "expo-router";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

import { Input } from "@/components/input";

import { Button } from "@/components/button";

import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

WebBrowser.maybeCompleteAuthSession();

// Client IDs do Google Cloud (tipo Web). Sem commitar valores — ver .env.example.
// Necessário + provedor Google ativo no Firebase Console (Authentication → Sign-in method).
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;

// Tela de login — rota /login.
// Layout/rotas do main preservados; autenticação via Firebase (trazida da
// branch Firebase-version).
export default function Login() {
  const [inputUsuarioLogin, setUsuarioLogin] = useState("");
  const [inputSenhaLogin, setSenhaLogin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    async function handleGoogleResponse() {
      if (!googleResponse || googleResponse.type !== "success") {
        if (googleResponse?.type === "error") {
          setGoogleLoading(false);
          setHasError(true);
          Alert.alert("Erro", "Login com Google cancelado ou recusado.");
        }
        if (googleResponse?.type === "dismiss") {
          setGoogleLoading(false);
        }
        return;
      }
      const idToken = googleResponse.params.id_token;
      if (!idToken || typeof idToken !== "string") {
        setGoogleLoading(false);
        setHasError(true);
        return Alert.alert("Erro", "Google não retornou credencial válida.");
      }
      try {
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      } catch (error) {
        setGoogleLoading(false);
        setHasError(true);
        const message =
          error instanceof Error ? error.message : "Falha no login com Google.";
        return Alert.alert("Erro", message);
      }
      setGoogleLoading(false);
      setHasError(false);
      router.replace("/home");
    }
    void handleGoogleResponse();
  }, [googleResponse]);

  async function handleGoogleSignIn() {
    if (!GOOGLE_WEB_CLIENT_ID) {
      return Alert.alert(
        "Configuração faltando",
        "Defina EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env (ver .env.example) e ative o provedor Google no Firebase Console.",
      );
    }
    // Web: popup do Firebase — funciona direto, inclusive para testar agora.
    if (Platform.OS === "web") {
      setGoogleLoading(true);
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (error) {
        setGoogleLoading(false);
        setHasError(true);
        const message =
          error instanceof Error ? error.message : "Falha no login com Google.";
        return Alert.alert("Erro", message);
      }
      setGoogleLoading(false);
      setHasError(false);
      return router.replace("/home");
    }
    // Nativo (dev-build): abre o browser via expo-auth-session; o retorno
    // alimenta o useEffect acima. No Expo Go o redirect não volta ao app —
    // nesse caso teste na web (`npx expo start --web`).
    setGoogleLoading(true);
    try {
      await promptGoogleAsync();
    } catch {
      setGoogleLoading(false);
      setHasError(true);
      Alert.alert("Erro", "Não foi possível abrir o login com Google.");
    }
  }

  async function handleSignIn() {
    if (!inputUsuarioLogin.trim() || !inputSenhaLogin.trim()) {
      setHasError(true);
      return Alert.alert("Erro", "Preencha todos os campos!");
    }
    try {
      await signInWithEmailAndPassword(
        auth,
        inputUsuarioLogin.trim(),
        inputSenhaLogin,
      );
    } catch {
      setHasError(true);
      return Alert.alert("Erro", "Usuário ou senha inválidos.");
    }
    setHasError(false);

    Alert.alert(
      `Parabéns ${inputUsuarioLogin.trim()}!`,
      "Login realizado com sucesso!",
      [{ text: "OK", onPress: () => router.replace("/home") }],
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: "height" })}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.conteiner}>
          <Image
            source={require("@/assets/img1.png")}
            style={styles.illustration}
          />
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>
            Acesse sua conta ou crie uma nova!
          </Text>
          <View style={styles.form}>
            <Input
              placeholder="Usuário"
              autoCapitalize="none"
              error={hasError}
              onChangeText={(text: string) => {
                setUsuarioLogin(text);
                setHasError(false);
              }}
            />
            <Input
              placeholder="Senha"
              secureTextEntry
              error={hasError}
              onChangeText={(text: string) => {
                setSenhaLogin(text);
                setHasError(false);
              }}
            />
            <Button label="Entrar" onPress={handleSignIn} />
            <Button
              label={googleLoading ? "Aguarde..." : "Entrar com Google"}
              variant="white"
              disabled={googleLoading}
              onPress={handleGoogleSignIn}
            />
          </View>
          <Text style={styles.footerText}>
            Não tem uma conta?{" "}
            <Link href="/signup" style={styles.footerLink}>
              Cadastre-se
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteiner: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    padding: 32,
  },
  illustration: {
    width: "100%",
    height: 260,
    resizeMode: "contain",
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 900,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginTop: 24,
    gap: 12,
  },
  footerText: {
    textAlign: "center",
    marginTop: 24,
    color: "#585860",
  },
  footerLink: {
    textAlign: "center",
    marginTop: 24,
    color: "#203bb3",
    fontWeight: 900,
  },
});
