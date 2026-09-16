import type { AuthResult, RegisterInput, UserCredentials } from "./types";

// Camada usada pelas telas no futuro.
// Hoje faz só validação local e NÃO chama banco.
// TODO(firebase): injetar AuthRepository com Firebase e trocar os returns
// por `return repository.login(input)` / `repository.register(input)`.

// Usuário provisório em código para abrir a home sem banco.
// TODO(firebase): remover ao conectar o Firebase e autenticar no banco.
const PROVISIONAL_USERS: UserCredentials[] = [
  { username: "admin", password: "admin" },
];

export async function loginService(
  input: UserCredentials,
): Promise<AuthResult> {
  const username = input.username.trim();
  if (!username || !input.password.trim()) {
    return { ok: false, message: "Preencha todos os campos!" };
  }
  const found = PROVISIONAL_USERS.some(
    (u) => u.username === username && u.password === input.password,
  );
  if (!found) {
    return { ok: false, message: "Usuário ou senha inválidos." };
  }
  return { ok: true, message: "Login realizado com sucesso!" };
}

export async function registerService(
  input: RegisterInput,
): Promise<AuthResult> {
  if (
    !input.username.trim() ||
    !input.password.trim() ||
    !input.confirmPassword.trim()
  ) {
    return { ok: false, message: "Preencha todos os campos!" };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, message: "As senhas estão diferentes." };
  }
  return { ok: true, message: "Pronto para salvar no banco." };
}
