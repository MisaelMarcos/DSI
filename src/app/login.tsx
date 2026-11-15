import { signInWithEmailAndPassword } from "firebase/auth";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/button";
import { Input, InputSenha } from "@/components/input";
import { MensagemInline } from "@/components/mensagem-inline";
import { getFriendlyLoginErrorMessage } from "@/lib/firebase-errors";
import { auth } from "@/lib/firebase";

// Tela de login — rota /login.
// Autenticação via Firebase.
export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const hasError = mensagemErro !== "";

  function limparErro() {
    setMensagemErro("");
  }

  async function handleSignIn() {
    if (carregando) return;

    if (!email.trim() || !senha) {
      setMensagemErro("Preencha o e-mail e a senha.");
      return;
    }

    limparErro();
    setCarregando(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch (erro) {
      setMensagemErro(getFriendlyLoginErrorMessage(erro));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: "padding", android: "height" })}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Image
              source={require("@/assets/img1.png")}
              style={styles.illustration}
            />

            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>
              Acesse sua conta para acompanhar a chuva no seu bairro.
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>E-mail</Text>
              <Input
                placeholder="Digite seu e-mail"
                value={email}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                editable={!carregando}
                error={hasError}
                onChangeText={(text: string) => {
                  setEmail(text);
                  limparErro();
                }}
              />

              <Text style={styles.label}>Senha</Text>
              <InputSenha
                placeholder="Digite sua senha"
                value={senha}
                autoComplete="current-password"
                returnKeyType="go"
                editable={!carregando}
                error={hasError}
                onSubmitEditing={handleSignIn}
                onChangeText={(text: string) => {
                  setSenha(text);
                  limparErro();
                }}
              />

              {hasError ? (
                <MensagemInline tipo="erro" texto={mensagemErro} />
              ) : null}

              <View style={styles.buttonContainer}>
                <Button
                  label="Entrar"
                  loading={carregando}
                  onPress={handleSignIn}
                />
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  illustration: {
    width: "100%",
    height: 220,
    resizeMode: "contain",
    marginTop: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: "#64748B",
    marginTop: 6,
  },
  form: {
    marginTop: 24,
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 6,
  },
  buttonContainer: {
    marginTop: 4,
  },
  footerText: {
    textAlign: "center",
    marginTop: 24,
    color: "#64748B",
  },
  footerLink: {
    color: "#2563EB",
    fontWeight: "700",
  },
});
