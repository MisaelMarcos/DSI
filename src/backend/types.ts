// Contratos de auth — sem integração com Firebase.
// O time de backend vai implementar AuthRepository com Firebase Auth + Firestore.

export type UserCredentials = {
  username: string;
  password: string;
};

export type RegisterInput = UserCredentials & {
  confirmPassword: string;
};

export type AuthResult = {
  ok: boolean;
  message: string;
};

// Formato previsto no banco (coleção `users`):
// { username: string unique, passwordHash: string, createdAt: timestamp }
// Nunca salvar senha em texto puro.
export type UserRecord = {
  username: string;
  passwordHash: string;
  createdAt: string;
};
