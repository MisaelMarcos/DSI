import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useState } from "react";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { useAuthStore } from "@/contexts/authContext";

import { bairrosRecife } from "@/data/bairros";

import { auth } from "@/lib/firebase";
import { getFriendlyAuthErrorMessage } from "@/lib/firebase-errors";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function Signup() {
  const {
    usuario,
    senha,
    setUsuarioLogin,
    setSenhaLogin,
  } = useAuthStore();

  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [bairro, setBairro] = useState("");
  const [modalBairro, setModalBairro] = useState(false);

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  const [hasError, setHasError] = useState(false);

  function verificarSenhaForte(senha: string) {
    const temTamanho = senha.length >= 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temMinuscula = /[a-z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temEspecial = /[^A-Za-z0-9]/.test(senha);

    return {
      temTamanho,
      temMaiuscula,
      temMinuscula,
      temNumero,
      temEspecial,
      forte:
        temTamanho &&
        temMaiuscula &&
        temMinuscula &&
        temNumero &&
        temEspecial,
    };
  }

  const senhaStatus = verificarSenhaForte(senha);

  async function handleSignUp() {
    if (!usuario.trim()) {
      setHasError(true);
      return Alert.alert(
        "Campo obrigatório",
        "Digite um usuário.",
      );
    }

    if (!bairro) {
      return Alert.alert(
        "Bairro não selecionado",
        "Selecione o bairro onde você mora.",
      );
    }

    if (!senhaStatus.forte) {
      return Alert.alert(
        "Senha fraca",
        "Sua senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial.",
      );
    }

    if (senha !== confirmarSenha) {
      setHasError(true);
      return Alert.alert(
        "Senhas diferentes",
        "A confirmação da senha não corresponde à senha informada.",
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
      "Cadastro realizado!",
      `Bem-vindo, ${usuario}!\n\nBairro: ${bairro}`,
      [
        {
          text: "Continuar",
          onPress: () => router.replace("/home"),
        },
      ],
    );
  }

  return (
    <SafeAreaViewWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.select({
            ios: "padding",
            android: "height",
          })
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>

            <Image
              source={require("@/assets/img2.png")}
              style={styles.illustration}
            />

            <Text style={styles.title}>
              Criar conta
            </Text>

            <Text style={styles.subtitle}>
              Cadastre-se para receber informações de chuva
              para o seu bairro.
            </Text>

            {/* USUÁRIO */}
            <View style={styles.form}>

              <Text style={styles.label}>
                Usuário
              </Text>

              <Input
                placeholder="Digite seu usuário"
                autoCapitalize="none"
                error={hasError}
                onChangeText={(text: string) => {
                  setUsuarioLogin(text);
                  setHasError(false);
                }}
              />

              {/* BAIRRO */}
              <Text style={styles.label}>
                Seu bairro
              </Text>

              <Pressable
                style={styles.bairroButton}
                onPress={() => setModalBairro(true)}
              >
                <View style={styles.bairroLeft}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#2F6BFF"
                  />

                  <Text
                    style={
                      bairro
                        ? styles.bairroText
                        : styles.bairroPlaceholder
                    }
                  >
                    {bairro || "Selecione seu bairro"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={20}
                  color="#64748B"
                />
              </Pressable>

              {/* SENHA */}
              <Text style={styles.label}>
                Senha
              </Text>

              <View style={styles.passwordContainer}>
                <Input
                  placeholder="Digite uma senha forte"
                  secureTextEntry={!mostrarSenha}
                  error={hasError}
                  onChangeText={(text: string) => {
                    setSenhaLogin(text);
                    setHasError(false);
                  }}
                />

                <Pressable
                  style={styles.eyeButton}
                  onPress={() =>
                    setMostrarSenha(!mostrarSenha)
                  }
                >
                  <Ionicons
                    name={
                      mostrarSenha
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={22}
                    color="#64748B"
                  />
                </Pressable>
              </View>

              {/* FORÇA DA SENHA */}
              {senha.length > 0 && (
                <View style={styles.passwordRules}>

                  <Text style={styles.rulesTitle}>
                    Sua senha precisa ter:
                  </Text>

                  <Regra
                    texto="8 caracteres ou mais"
                    valido={senhaStatus.temTamanho}
                  />

                  <Regra
                    texto="Uma letra maiúscula"
                    valido={senhaStatus.temMaiuscula}
                  />

                  <Regra
                    texto="Uma letra minúscula"
                    valido={senhaStatus.temMinuscula}
                  />

                  <Regra
                    texto="Um número"
                    valido={senhaStatus.temNumero}
                  />

                  <Regra
                    texto="Um caractere especial"
                    valido={senhaStatus.temEspecial}
                  />

                </View>
              )}

              {/* CONFIRMAR SENHA */}
              <Text style={styles.label}>
                Confirmar senha
              </Text>

              <View style={styles.passwordContainer}>
                <Input
                  placeholder="Digite a senha novamente"
                  secureTextEntry={!mostrarConfirmacao}
                  error={hasError}
                  onChangeText={(text: string) => {
                    setConfirmarSenha(text);
                    setHasError(false);
                  }}
                />

                <Pressable
                  style={styles.eyeButton}
                  onPress={() =>
                    setMostrarConfirmacao(
                      !mostrarConfirmacao,
                    )
                  }
                >
                  <Ionicons
                    name={
                      mostrarConfirmacao
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={22}
                    color="#64748B"
                  />
                </Pressable>
              </View>

              {/* BOTÃO */}
              <Button
                label="Criar minha conta"
                onPress={handleSignUp}
              />

            </View>

            <Text style={styles.footerText}>
              Já possui uma conta?{" "}

              <Link
                href="/login"
                style={styles.footerLink}
              >
                Entrar
              </Link>
            </Text>

          </View>
        </ScrollView>

        {/* MODAL DOS BAIRROS */}
        <Modal
          visible={modalBairro}
          animationType="slide"
          transparent
          onRequestClose={() => setModalBairro(false)}
        >
          <View style={styles.modalBackground}>

            <View style={styles.modalContainer}>

              <View style={styles.modalHeader}>

                <Text style={styles.modalTitle}>
                  Escolha seu bairro
                </Text>

                <Pressable
                  onPress={() => setModalBairro(false)}
                >
                  <Ionicons
                    name="close"
                    size={26}
                    color="#0F172A"
                  />
                </Pressable>

              </View>

              <ScrollView>
                {bairrosRecife.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.bairroItem}
                    onPress={() => {
                      setBairro(item);
                      setModalBairro(false);
                    }}
                  >
                    <Text style={styles.bairroItemText}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

            </View>

          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
}

/* COMPONENTE DA REGRA DA SENHA */

function Regra({
  texto,
  valido,
}: {
  texto: string;
  valido: boolean;
}) {
  return (
    <View style={styles.regra}>
      <Ionicons
        name={
          valido
            ? "checkmark-circle"
            : "ellipse-outline"
        }
        size={17}
        color={valido ? "#16A34A" : "#94A3B8"}
      />

      <Text
        style={
          valido
            ? styles.regraValida
            : styles.regraTexto
        }
      >
        {texto}
      </Text>
    </View>
  );
}

/* SAFE AREA */

function SafeAreaViewWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { SafeAreaView } = require(
    "react-native-safe-area-context",
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    padding: 24,
    paddingBottom: 40,
  },

  illustration: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
    marginTop: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
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

  bairroButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bairroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  bairroText: {
    fontSize: 15,
    color: "#0F172A",
  },

  bairroPlaceholder: {
    fontSize: 15,
    color: "#94A3B8",
  },

  passwordContainer: {
    position: "relative",
  },

  eyeButton: {
    position: "absolute",
    right: 14,
    top: 14,
  },

  passwordRules: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },

  rulesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },

  regra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginVertical: 2,
  },

  regraTexto: {
    fontSize: 12,
    color: "#64748B",
  },

  regraValida: {
    fontSize: 12,
    color: "#16A34A",
  },

  footerText: {
    textAlign: "center",
    marginTop: 24,
    color: "#64748B",
  },

  footerLink: {
    color: "#203BB3",
    fontWeight: "800",
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  bairroItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  bairroItemText: {
    fontSize: 16,
    color: "#334155",
  },
});
