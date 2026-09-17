import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  // Exportado pelo build react-native (usado pelo Metro em runtime),
  // mas ausente nos tipos web que o tsc resolve por padrão.
  // @ts-expect-error: tipos RN não visíveis ao tsc (ver index.rn.d.ts)
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Config trazida da branch Firebase-version (mantida hardcoded por decisão
// explícita no merge — ideal futuro: mover para .env com EXPO_PUBLIC_*).
const firebaseConfig = {
  apiKey: "AIzaSyAGHYJqnNQ2uW8JivRQtLgi9N036h7-j4A",
  authDomain: "dsi-ufrpe-58db3.firebaseapp.com",
  projectId: "dsi-ufrpe-58db3",
  storageBucket: "dsi-ufrpe-58db3.firebasestorage.app",
  messagingSenderId: "1098493929183",
  appId: "1:1098493929183:web:c32f16669a952f4d53eb6a",
  measurementId: "G-EQFS4K2RJ2",
};

const app = initializeApp(firebaseConfig);
// Persistência em AsyncStorage: sem isso o Auth cai em memória e a sessão
// se perde ao reiniciar o app (warning @firebase/auth no LogBox).
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
