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

import { loginService } from "@/backend/auth.service";

// Tela de login — rota /login.
// Autentica via loginService (hoje: usuário provisório admin/admin em código).
// TODO(firebase): o service passará a autenticar com os dados do banco.
export default function Login() {
  const [inputUsuarioLogin, setUsuarioLogin] = useState("");
  const [inputSenhaLogin, setSenhaLogin] = useState("");
  const [hasError, setHasError] = useState(false);

  async function handleSignIn() {
    const result = await loginService({
      username: inputUsuarioLogin,
      password: inputSenhaLogin,
    });
    if (!result.ok) {
      setHasError(true);
      return Alert.alert("Erro", result.message);
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
