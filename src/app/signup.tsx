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

import { useAuthStore } from "@/contexts/authContext";

import { auth } from "@/lib/firebase";
import { getFriendlyAuthErrorMessage } from "@/lib/firebase-errors";
import { createUserWithEmailAndPassword } from "firebase/auth";

// Página para criar nova conta — rota /signup.
// Layout/validação do main preservados; cadastro via Firebase (trazido da
// branch Firebase-version).

export default function Signup() {
  const { usuario, senha, setUsuarioLogin, setSenhaLogin } = useAuthStore();
  const [inputConfirmarSenhaLogin, setConfirmarSenhaLogin] = useState("");
  const [hasError, setHasError] = useState(false);

  async function handleSignUp() {
    if (
      !usuario.trim() ||
      !senha.trim() ||
      !inputConfirmarSenhaLogin.trim() ||
      senha !== inputConfirmarSenhaLogin
    ) {
      setHasError(true);
      return Alert.alert(
        "Erro",
        "Preencha todos os campos! ou suas senhas estão diferentes",
      );
    }
    try {
      await createUserWithEmailAndPassword(auth, usuario.trim(), senha);
    } catch (error: unknown) {
      setHasError(true);
      return Alert.alert(
        "Erro ao cadastrar",
        getFriendlyAuthErrorMessage(error),
      );
    }
    setHasError(false);
    Alert.alert(
      `Parabéns ${usuario}!`,
      "Usuário cadastrado com sucesso!",
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
            source={require("@/assets/img2.png")}
            style={styles.illustration}
          />
          <Text style={styles.title}>Cadastrar</Text>
          <Text style={styles.subtitle}>Crie sua conta para acessar!</Text>
          <View style={styles.form}>
            <Input
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
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
            <Input
              placeholder="Confirmar senha"
              secureTextEntry
              error={hasError}
              onChangeText={(text: string) => {
                setConfirmarSenhaLogin(text);
                setHasError(false);
              }}
            />
            <Button label="Cadastrar" onPress={handleSignUp} />
          </View>
          <Text style={styles.footerText}>
            Já tem uma conta?{" "}
            <Link href="/login" style={styles.footerLink}>
              Entre aqui
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
