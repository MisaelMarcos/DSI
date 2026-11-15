import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";

import { BotaoLocalizacao } from "@/components/botao-localizacao";
import { Button } from "@/components/button";
import { Input, InputSenha } from "@/components/input";
import { MensagemInline } from "@/components/mensagem-inline";
import { SeletorBairroModal } from "@/components/seletor-bairro-modal";
import { useAuthStore } from "@/contexts/authContext";

import { normalizarBairroOficial } from "@/lib/bairros";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Signup() {
  const { usuario, senha, setUsuarioLogin, setSenhaLogin } =
    useAuthStore();

  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [bairro, setBairro] = useState("");
  const [modalBairro, setModalBairro] = useState(false);

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
    if (carregando) return;
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

      const bairroOficial = normalizarBairroOficial(bairro) || bairro;
      const agora = new Date().toISOString();

      // Guarda o bairro no aparelho antes de gravar na nuvem: se o Firestore
      // falhar, o app ainda sabe o bairro escolhido (useBairroUsuario lê daqui).
      await AsyncStorage.setItem(
        `@AlertaChuva:${credencial.user.uid}:bairro`,
        bairroOficial
      ).catch(() => {});

      // A conta já foi criada; se o perfil falhar, o usuário ainda entra e a
      // Home oferece "Selecionar bairro" caso o bairro não tenha sido salvo.
      try {
        await setDoc(
          doc(db, "users", credencial.user.uid),
          {
            uid: credencial.user.uid,
            email,
            bairro: bairroOficial,
            createdAt: agora,
            updatedAt: agora,
          },
          { merge: true }
        );
      } catch (erroPerfil) {
        console.error("Erro ao salvar perfil no Firestore:", erroPerfil);
      }

      setHasError(false);
      setMensagemErro("");

      // Sem router.replace: o cadastro já loga o usuário e o guard em _layout.tsx leva para /tabs/home.
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
                    color="#2563EB"
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

              <BotaoLocalizacao
                desabilitado={carregando}
                aoDetectar={({ bairro: detectado }) => {
                  setBairro(detectado);
                  limparErro();
                }}
              />

              <Text style={styles.label}>Senha</Text>

              <InputSenha
                placeholder="Digite uma senha forte"
                value={senha}
                autoComplete="new-password"
                editable={!carregando}
                error={hasError}
                onChangeText={(text: string) => {
                  setSenhaLogin(text);
                  limparErro();
                }}
              />

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

              <InputSenha
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                autoComplete="new-password"
                returnKeyType="go"
                editable={!carregando}
                error={hasError}
                onSubmitEditing={handleSignUp}
                onChangeText={(text: string) => {
                  setConfirmarSenha(text);
                  limparErro();
                }}
              />

              {mensagemErro !== "" ? (
                <MensagemInline tipo="erro" texto={mensagemErro} />
              ) : null}

              <View style={styles.buttonContainer}>
                <Button
                  label="Criar minha conta"
                  loading={carregando}
                  onPress={handleSignUp}
                />
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

        <SeletorBairroModal
          visivel={modalBairro}
          bairroAtual={bairro}
          aoFechar={() => setModalBairro(false)}
          aoSelecionar={(escolhido) => {
            setBairro(escolhido);
            limparErro();
          }}
        />
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
  bairroButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
  passwordRules: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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