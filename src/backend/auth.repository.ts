import type { AuthResult, RegisterInput, UserCredentials } from "./types";

// Interface que o time de backend vai implementar com Firebase.
// Hoje nenhum método é chamado pelas telas — deixado pronto para plugar.
export interface AuthRepository {
  login(input: UserCredentials): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  logout(): Promise<void>;
}

// Implementação fake só para tipar. Sempre lança — não usar em produção.
export class NotImplementedAuthRepository implements AuthRepository {
  async login(): Promise<AuthResult> {
    throw new Error("AuthRepository.login não implementado — conectar Firebase.");
  }

  async register(): Promise<AuthResult> {
    throw new Error(
      "AuthRepository.register não implementado — conectar Firebase.",
    );
  }

  async logout(): Promise<void> {
    throw new Error("AuthRepository.logout não implementado — conectar Firebase.");
  }
}
