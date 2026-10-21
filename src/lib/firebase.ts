import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  // Exportado pelo build react-native (usado pelo Metro em runtime),
  // mas ausente nos builds web/node — por isso o guard abaixo.
  // @ts-expect-error: tipos RN não visíveis ao tsc (ver index.rn.d.ts)
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
// No React Native o Metro resolve `firebase/auth` para o build RN, que tem
// `getReactNativePersistence` (persistência em AsyncStorage). No bundle web
// (condição "browser") esse export NÃO existe e chamá-lo direto derrubava o
// app com "(0, _firebaseAuth.getReactNativePersistence) is not a function".
// O guard mantém a persistência no nativo e cai no getAuth() no web/node,
// que usa a persistência padrão da plataforma.
export const auth =
  typeof getReactNativePersistence === "function"
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(app);
export const db = getFirestore(app);
