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

// Página para criar nova conta

export default function Signup() {
  const { usuario, senha, setUsuarioLogin, setSenhaLogin } = useAuthStore();
  const [inputConfirmarSenhaLogin, setConfirmarSenhaLogin] = useState("");

  function handleSignIn() {
    if (
      !usuario.trim() ||
      !senha.trim() ||
      !inputConfirmarSenhaLogin.trim() ||
      senha !== inputConfirmarSenhaLogin
    ) {
      return Alert.alert(
        "Erro",
        "Preencha todos os campos! ou suas senhas estão diferentes",
      );
    }
    Alert.alert(
      `Parabéns ${usuario}!`,
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
            source={require("@/assets/img2.png")}
            style={styles.illustration}
          />
          <Text style={styles.title}>Cadastrar</Text>
          <Text style={styles.subtitle}>Crie sua conta para acessar!</Text>
          <View style={styles.form}>
            <Input placeholder="Usuário" onChangeText={setUsuarioLogin} />
            <Input
              placeholder="Senha"
              secureTextEntry
              onChangeText={setSenhaLogin}
            />
            <Input
              placeholder="Confirmar senha"
              secureTextEntry
              onChangeText={setConfirmarSenhaLogin}
            />
            <Button label="Cadastrar" onPress={handleSignIn} />
          </View>
          <Text style={styles.footerText}>
            Já tem uma conta?{" "}
            <Link href="/" style={styles.footerLink}>
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
    backgroundColor: "#FDFDFD",
    padding: 32,
  },
  illustration: {
    width: "100%",
    height: 330,
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
