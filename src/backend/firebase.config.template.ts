// Template de config do Firebase — NÃO integrar ainda.
// Passos para o time de backend:
// 1. Criar projeto no console Firebase.
// 2. Ativar Auth + Firestore.
// 3. Copiar as chaves para um arquivo `.env` local (não commitar) como
//    EXPO_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, etc.
// 4. Trocar este objeto por `initializeApp(firebaseConfig)` lendo o `.env`.
// Nenhum SDK instalado de propósito (ver docs/design-referencias.md).
// Valores vazios de propósito para `tsc --noEmit` passar sem @types/node.

export const firebaseConfigTemplate = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
