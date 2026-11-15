import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { create } from "zustand";

import { useSession } from "@/contexts/sessionContext";
import { normalizarBairroOficial } from "@/lib/bairros";
import {
  alternarFavorito,
  normalizarFavoritos,
  type ResultadoAlternarFavorito,
} from "@/lib/favoritos";
import { db } from "@/lib/firebase";

type BairroStore = {
  uidAtual: string | null;
  bairro: string;
  favoritos: string[];
  carregando: boolean;
  definirEstado: (parcial: Partial<BairroStore>) => void;
};

const useBairroStore = create<BairroStore>((set) => ({
  uidAtual: null,
  bairro: "",
  favoritos: [],
  carregando: true,
  definirEstado: (parcial) => set(parcial),
}));

/**
 * Sincroniza o bairro do usuário e seus bairros favoritos (até 3 atalhos) em
 * tempo real entre todas as abas (Home e Alertas). Atualiza a UI
 * instantaneamente (otimista) e persiste no AsyncStorage + Firestore
 * (users/{uid}.bairro e users/{uid}.bairrosFavoritos).
 */
export function useBairroUsuario() {
  const { user } = useSession();
  const { uidAtual, bairro, favoritos, carregando, definirEstado } =
    useBairroStore();

  useEffect(() => {
    if (!user) {
      definirEstado({
        uidAtual: null,
        bairro: "",
        favoritos: [],
        carregando: false,
      });
      return;
    }

    const uid = user.uid;
    const chaveLocal = `@AlertaChuva:${uid}:bairro`;
    const chaveFavoritos = `@AlertaChuva:${uid}:favoritos`;

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

      AsyncStorage.getItem(chaveFavoritos)
        .then((salvoLocal) => {
          if (!salvoLocal) return;
          definirEstado({
            favoritos: normalizarFavoritos(JSON.parse(salvoLocal)),
          });
        })
        .catch(() => {});
    }

    const perfilRef = doc(db, "users", uid);
    const cancelar = onSnapshot(
      perfilRef,
      (snap) => {
        if (snap.exists()) {
          // Contas antigas não têm o campo: nesse caso vale o que está no aparelho.
          const favoritosRemotos = snap.data().bairrosFavoritos;
          if (Array.isArray(favoritosRemotos)) {
            const normalizados = normalizarFavoritos(favoritosRemotos);
            definirEstado({ favoritos: normalizados });
            AsyncStorage.setItem(
              chaveFavoritos,
              JSON.stringify(normalizados),
            ).catch(() => {});
          }

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

  async function gravarPerfil(campos: Record<string, unknown>) {
    if (!user) return;

    const perfilRef = doc(db, "users", user.uid);
    const perfilSnap = await getDoc(perfilRef);
    const agora = new Date().toISOString();

    await setDoc(
      perfilRef,
      {
        uid: user.uid,
        email: user.email ?? "",
        updatedAt: agora,
        ...(perfilSnap.exists()
          ? {}
          : {
              createdAt: agora,
              bairro: useBairroStore.getState().bairro,
            }),
        ...campos,
      },
      { merge: true },
    );
  }

  async function selecionarBairro(novoBairro: string): Promise<boolean> {
    const bairroOficial = normalizarBairroOficial(novoBairro);
    if (!bairroOficial) return false;

    // Atualização imediata na UI em todas as abas
    definirEstado({ bairro: bairroOficial, carregando: false });

    if (!user) return true;

    const chaveLocal = `@AlertaChuva:${user.uid}:bairro`;
    await AsyncStorage.setItem(chaveLocal, bairroOficial).catch(() => {});

    try {
      await gravarPerfil({ bairro: bairroOficial });
      return true;
    } catch (erro) {
      console.error("Erro ao salvar bairro no Firestore:", erro);
      return false;
    }
  }

  /** Adiciona o bairro aos favoritos (máx. 3) ou remove se já estiver neles. */
  async function alternarBairroFavorito(
    nomeBairro: string,
  ): Promise<ResultadoAlternarFavorito> {
    const atuais = useBairroStore.getState().favoritos;
    const { lista, resultado } = alternarFavorito(atuais, nomeBairro);
    if (resultado === "limite" || resultado === "invalido") return resultado;

    definirEstado({ favoritos: lista });

    if (!user) return resultado;

    await AsyncStorage.setItem(
      `@AlertaChuva:${user.uid}:favoritos`,
      JSON.stringify(lista),
    ).catch(() => {});

    try {
      await gravarPerfil({ bairrosFavoritos: lista });
    } catch (erro) {
      // O aparelho já guarda a lista; só o espelho na nuvem falhou.
      console.error("Erro ao salvar favoritos no Firestore:", erro);
    }

    return resultado;
  }

  return {
    bairro,
    favoritos,
    carregandoBairro: carregando,
    selecionarBairro,
    alternarBairroFavorito,
  };
}
