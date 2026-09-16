import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useState } from "react";
import { Link, router } from "expo-router";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { auth } from "../../database/conexão"; // Ajustado para caminhar da pasta src/app para a raiz database/
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Index() {
  // 1. Declarando as variáveis de estado para armazenar as credenciais digitadas
  const [inputUsuarioLogin, setUsuarioLogin] = useState("");
  const [inputSenhaLogin, setSenhaLogin] = useState("");

  // 2. Função assíncrona correta para realizar o login no Firebase
  async function handleSignIn() {
    if (!inputUsuarioLogin.trim() || !inputSenhaLogin.trim()) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    try {
      // Autenticando com o Firebase Auth
      await signInWithEmailAndPassword(auth, inputUsuarioLogin, inputSenhaLogin);

      Alert.alert("Sucesso", "Login realizado com sucesso!", [
        { text: "OK", onPress: () => router.replace("/home") }
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro", "E-mail ou senha incorretos.");
    }
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
    fontWeight: "900", // Alterado de 900 para "900" (string)
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
    fontWeight: "900", // Alterado de 900 para "900" (string)
  },
});
