// Traduz códigos de erro do Firebase Auth para mensagens amigáveis (PT-BR).
// Evita exibir o texto cru do SDK (ex.: "auth/weak-password") nas mensagens da tela.

const FRIENDLY_MESSAGES: Record<string, string> = {
  "auth/weak-password": "Senha fraca: use pelo menos 6 caracteres.",
  "auth/email-already-in-use":
    "Este email já está cadastrado. Tente entrar.",
  "auth/invalid-email": "Digite um email válido.",
  "auth/network-request-failed":
    "Sem conexão. Verifique a internet e tente de novo.",
};

const FALLBACK_MESSAGE =
  "Não foi possível concluir o cadastro. Tente de novo.";

export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    return FRIENDLY_MESSAGES[code] ?? FALLBACK_MESSAGE;
  }
  return FALLBACK_MESSAGE;
}

const LOGIN_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/too-many-requests":
    "Muitas tentativas. Aguarde um pouco e tente de novo.",
  "auth/network-request-failed":
    "Sem conexão. Verifique a internet e tente de novo.",
};

const LOGIN_FALLBACK_MESSAGE = "Não foi possível entrar. Tente de novo.";

export function getFriendlyLoginErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    return LOGIN_MESSAGES[code] ?? LOGIN_FALLBACK_MESSAGE;
  }
  return LOGIN_FALLBACK_MESSAGE;
}
