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

// Essa função é responsável por renderizar a primeira página do aplicativo, que é a tela de login.
// Ela tem 2 variáveis, a inputUsuarioLogin e a inputSenhaLogin, elas precisam ser validadas. A logica dela precisa ser replicada para o signup.tsx

export default function Index() {
  const [inputUsuarioLogin, setUsuarioLogin] = useState("");
  const [inputSenhaLogin, setSenhaLogin] = useState("");
  function handleSignIn() {
    if (!inputUsuarioLogin.trim() || !inputSenhaLogin.trim()) {
      return Alert.alert("Erro", "Preencha todos os campos!");
    }

    Alert.alert(
      `Parabéns ${inputUsuarioLogin}!`,
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
              onChangeText={(text) => setUsuarioLogin(text)}
            />
            <Input
              placeholder="Senha"
              secureTextEntry
              onChangeText={(text) => setSenhaLogin(text)}
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
