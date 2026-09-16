// Traduz códigos de erro do Firebase Auth para mensagens amigáveis (PT-BR).
// Evita exibir o texto cru do SDK (ex.: "auth/weak-password") nos Alerts.

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
