import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { create } from "zustand";

import { useSession } from "@/contexts/sessionContext";
import { normalizarBairroOficial } from "@/lib/bairros";
import { db } from "@/lib/firebase";

type BairroStore = {
  uidAtual: string | null;
  bairro: string;
  carregando: boolean;
  definirEstado: (parcial: Partial<BairroStore>) => void;
};

const useBairroStore = create<BairroStore>((set) => ({
  uidAtual: null,
  bairro: "",
  carregando: true,
  definirEstado: (parcial) => set(parcial),
}));

/**
 * Sincroniza o bairro do usuário em tempo real entre todas as abas (Home e Alertas).
 * Atualiza a UI instantaneamente (otimista) ao trocar de bairro e persiste no
 * AsyncStorage + Firestore (users/{uid}).
 */
export function useBairroUsuario() {
  const { user } = useSession();
  const { uidAtual, bairro, carregando, definirEstado } = useBairroStore();

  useEffect(() => {
    if (!user) {
      definirEstado({ uidAtual: null, bairro: "", carregando: false });
      return;
    }

    const uid = user.uid;
    const chaveLocal = `@AlertaChuva:${uid}:bairro`;

    if (uidAtual !== uid) {
      definirEstado({ uidAtual: uid, carregando: true });
      AsyncStorage.getItem(chaveLocal)
        .then((salvoLocal) => {
          const normalizado = normalizarBairroOficial(salvoLocal);
          if (normalizado) {
            definirEstado({ bairro: normalizado, carregando: false });
          }
        })
        .catch(() => {});
    }

    const perfilRef = doc(db, "users", uid);
    const cancelar = onSnapshot(
      perfilRef,
      (snap) => {
        if (snap.exists()) {
          const salvoRemoto = normalizarBairroOficial(
            typeof snap.data().bairro === "string" ? snap.data().bairro : "",
          );
          if (salvoRemoto) {
            definirEstado({ bairro: salvoRemoto, carregando: false });
            AsyncStorage.setItem(chaveLocal, salvoRemoto).catch(() => {});
            return;
          }
        }
        definirEstado({ carregando: false });
      },
      (erro) => {
        console.warn("Aviso ao escutar perfil do usuário:", erro);
        definirEstado({ carregando: false });
      },
    );

    return cancelar;
  }, [user, uidAtual, definirEstado]);

  async function selecionarBairro(novoBairro: string): Promise<boolean> {
    const bairroOficial = normalizarBairroOficial(novoBairro);
    if (!bairroOficial) return false;

    // Atualização imediata na UI em todas as abas
    definirEstado({ bairro: bairroOficial, carregando: false });

    if (!user) return true;

    const chaveLocal = `@AlertaChuva:${user.uid}:bairro`;
    await AsyncStorage.setItem(chaveLocal, bairroOficial).catch(() => {});

    try {
      const perfilRef = doc(db, "users", user.uid);
      const perfilSnap = await getDoc(perfilRef);
      const agora = new Date().toISOString();

      await setDoc(
        perfilRef,
        {
          uid: user.uid,
          email: user.email ?? "",
          bairro: bairroOficial,
          updatedAt: agora,
          ...(perfilSnap.exists() ? {} : { createdAt: agora }),
        },
        { merge: true },
      );
      return true;
    } catch (erro) {
      console.error("Erro ao salvar bairro no Firestore:", erro);
      return false;
    }
  }

  return {
    bairro,
    carregandoBairro: carregando,
    selecionarBairro,
  };
}
