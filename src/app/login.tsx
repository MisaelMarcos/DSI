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

import { useState } from "react";

import { Link, router } from "expo-router";

import { Input } from "@/components/input";

import { Button } from "@/components/button";

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

// Tela de login — rota /login.
// Layout/rotas do main preservados; autenticação via Firebase (trazida da
// branch Firebase-version).
export default function Login() {
  const [inputUsuarioLogin, setUsuarioLogin] = useState("");
  const [inputSenhaLogin, setSenhaLogin] = useState("");
  const [hasError, setHasError] = useState(false);

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
