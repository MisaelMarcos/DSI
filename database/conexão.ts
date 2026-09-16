import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyAGHYJqnNQ2uW8JivRQtLgi9N036h7-j4A",

  authDomain: "dsi-ufrpe-58db3.firebaseapp.com",

  projectId: "dsi-ufrpe-58db3",

  storageBucket: "dsi-ufrpe-58db3.firebasestorage.app",

  messagingSenderId: "1098493929183",

  appId: "1:1098493929183:web:c32f16669a952f4d53eb6a",

  measurementId: "G-EQFS4K2RJ2"

};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
