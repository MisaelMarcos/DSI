import {
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

import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useAuthStore } from "@/contexts/authContext";
import { bairrosRecife } from "@/data/bairros";

import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function Signup() {
  const { usuario, senha, setUsuarioLogin, setSenhaLogin } =
    useAuthStore();

  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [bairro, setBairro] = useState("");
  const [modalBairro, setModalBairro] = useState(false);

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  const [hasError, setHasError] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function verificarSenhaForte(valor: string) {
    const temTamanho = valor.length >= 8;
    const temMaiuscula = /[A-Z]/.test(valor);
    const temMinuscula = /[a-z]/.test(valor);
    const temNumero = /[0-9]/.test(valor);
    const temEspecial = /[^A-Za-z0-9]/.test(valor);

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

  function limparErro() {
    setHasError(false);
    setMensagemErro("");
  }

  async function handleSignUp() {
    limparErro();

    const email = usuario.trim();

    if (!email) {
      setHasError(true);
      setMensagemErro("Digite seu e-mail.");
      return;
    }

    if (!bairro) {
      setMensagemErro("Selecione o bairro onde você mora.");
      return;
    }

    if (!senhaStatus.forte) {
      setMensagemErro(
        "A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial."
      );
      return;
    }

    if (senha !== confirmarSenha) {
      setHasError(true);
      setMensagemErro(
        "A confirmação não corresponde à senha informada."
      );
      return;
    }

    try {
      setCarregando(true);

      console.log("Tentando cadastrar usuário:", email);

      const credencial = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );

      console.log(
        "Cadastro realizado com sucesso. UID:",
        credencial.user.uid
      );

      setHasError(false);
      setMensagemErro("");

      router.replace("/tabs/home");
    } catch (error: unknown) {
      const codigo =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(error.code)
          : "erro-desconhecido";

      console.error("ERRO NO CADASTRO:", codigo, error);

      const mensagens: Record<string, string> = {
        "auth/email-already-in-use":
          "Este e-mail já está cadastrado. Tente entrar com essa conta.",
        "auth/invalid-email":
          "O formato do e-mail informado é inválido.",
        "auth/weak-password":
          "O Firebase recusou a senha. Tente criar outra.",
        "auth/operation-not-allowed":
          "O cadastro por e-mail e senha não está habilitado no Firebase.",
        "auth/invalid-api-key":
          "A chave de configuração do Firebase parece inválida.",
        "auth/network-request-failed":
          "Falha de conexão. Verifique sua internet e tente novamente.",
        "auth/too-many-requests":
          "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
        "auth/app-not-authorized":
          "Este aplicativo não está autorizado a acessar o projeto Firebase.",
        "auth/configuration-not-found":
          "A configuração do método de autenticação não foi encontrada no Firebase.",
      };

      setHasError(true);
      setMensagemErro(
        mensagens[codigo] ??
          `Não foi possível cadastrar. Código: ${codigo}. Confira o terminal para mais detalhes.`
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({
          ios: "padding",
          android: "height",
        })}
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

            <Text style={styles.title}>Criar conta</Text>

            <Text style={styles.subtitle}>
              Cadastre-se para receber informações de chuva para o seu bairro.
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>E-mail</Text>

              <Input
                placeholder="Digite seu e-mail"
                value={usuario}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!carregando}
                error={hasError}
                onChangeText={(text: string) => {
                  setUsuarioLogin(text);
                  limparErro();
                }}
              />

              <Text style={styles.label}>Seu bairro</Text>

              <Pressable
                style={styles.bairroButton}
                disabled={carregando}
                onPress={() => {
                  limparErro();
                  setModalBairro(true);
                }}
              >
                <View style={styles.bairroLeft}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#2F6BFF"
                  />

                  <Text
                    style={
                      bairro ? styles.bairroText : styles.bairroPlaceholder
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

              <Text style={styles.label}>Senha</Text>

              <View style={styles.passwordContainer}>
                <Input
                  placeholder="Digite uma senha forte"
                  value={senha}
                  secureTextEntry={!mostrarSenha}
                  autoCapitalize="none"
                  editable={!carregando}
                  error={hasError}
                  onChangeText={(text: string) => {
                    setSenhaLogin(text);
                    limparErro();
                  }}
                />

                <Pressable
                  style={styles.eyeButton}
                  disabled={carregando}
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                >
                  <Ionicons
                    name={
                      mostrarSenha ? "eye-off-outline" : "eye-outline"
                    }
                    size={22}
                    color="#64748B"
                  />
                </Pressable>
              </View>

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

              <Text style={styles.label}>Confirmar senha</Text>

              <View style={styles.passwordContainer}>
                <Input
                  placeholder="Digite a senha novamente"
                  value={confirmarSenha}
                  secureTextEntry={!mostrarConfirmacao}
                  autoCapitalize="none"
                  editable={!carregando}
                  error={hasError}
                  onChangeText={(text: string) => {
                    setConfirmarSenha(text);
                    limparErro();
                  }}
                />

                <Pressable
                  style={styles.eyeButton}
                  disabled={carregando}
                  onPress={() =>
                    setMostrarConfirmacao(!mostrarConfirmacao)
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

              {mensagemErro !== "" && (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {mensagemErro}
                </Text>
              )}

              <View style={styles.buttonContainer}>
                {carregando ? (
                  <View style={styles.loadingButton}>
                    <Text style={styles.loadingText}>
                      Cadastrando...
                    </Text>
                  </View>
                ) : (
                  <Button
                    label="Criar minha conta"
                    onPress={handleSignUp}
                  />
                )}
              </View>
            </View>

            <Text style={styles.footerText}>
              Já possui uma conta?{" "}
              <Link href="/login" style={styles.footerLink}>
                Entrar
              </Link>
            </Text>
          </View>
        </ScrollView>

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

                <Pressable onPress={() => setModalBairro(false)}>
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
                      limparErro();
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
    </View>
  );
}

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
        name={valido ? "checkmark-circle" : "ellipse-outline"}
        size={17}
        color={valido ? "#16A34A" : "#94A3B8"}
      />

      <Text style={valido ? styles.regraValida : styles.regraTexto}>
        {texto}
      </Text>
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
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 4,
  },
  loadingButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#3366FF",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
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