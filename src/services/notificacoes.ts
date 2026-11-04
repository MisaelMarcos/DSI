import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";

import { db } from "@/lib/firebase";
import {
  calcularResumoChuvaEAlagamento,
  combinarPrevisaoERisco,
} from "@/lib/risco";
import type { PrevisaoChuva } from "@/services/previsao";
import type { ScoreBairro } from "@/services/scores";

export type CategoriaNotificacao = "chuva" | "desastre";

export type PreferenciasNotificacao = {
  chuva: boolean;
  desastre: boolean;
};

export type NotificacaoDisparada = {
  id: string;
  categoria: CategoriaNotificacao;
  titulo: string;
  corpo: string;
  bairro: string;
  severidade: "critica" | "alta" | "moderada";
  horario: string;
};

const CANAL_ANDROID_ID = "alertas-chuva-recife";
let handlerConfigurado = false;

/**
 * Configura o handler de notificações em primeiro plano (foreground) e o canal
 * de alta prioridade no Android. Funciona em Expo Go e em builds nativos para
 * notificações locais agendadas via scheduleNotificationAsync.
 */
export async function inicializarCanalNotificacoes(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const Notifications = await import("expo-notifications");

    if (!handlerConfigurado) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerConfigurado = true;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CANAL_ANDROID_ID, {
        name: "Alertas de Chuva e Alagamento",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 200, 250],
        lightColor: "#2563EB",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        showBadge: true,
      });
    }
  } catch (erro) {
    console.warn("Aviso ao inicializar canal de notificações:", erro);
  }
}

export async function solicitarPermissaoNotificacao(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (window.Notification.permission === "granted") return true;
      const perm = await window.Notification.requestPermission();
      return perm === "granted";
    }
    return true;
  }

  try {
    await inicializarCanalNotificacoes();
    const Notifications = await import("expo-notifications");
    const atual = await Notifications.getPermissionsAsync();
    if (atual.granted) return true;

    const solicitada = await Notifications.requestPermissionsAsync();
    return Boolean(solicitada.granted);
  } catch (erro) {
    console.warn("Aviso ao solicitar permissão de notificação:", erro);
    return false;
  }
}

export async function carregarPreferenciasNotificacao(
  uid: string,
): Promise<PreferenciasNotificacao> {
  const chaveChuva = `@AlertaChuva:${uid}:chuva`;
  const chaveDesastre = `@AlertaChuva:${uid}:desastre`;

  const [localChuva, localDesastre] = await Promise.all([
    AsyncStorage.getItem(chaveChuva),
    AsyncStorage.getItem(chaveDesastre),
  ]);

  if (localChuva !== null || localDesastre !== null) {
    return {
      chuva: localChuva === "true",
      desastre: localDesastre === "true",
    };
  }

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const d = snap.data();
      const chuva = Boolean(d.notificarChuva);
      const desastre = Boolean(d.notificarDesastres);
      await Promise.all([
        AsyncStorage.setItem(chaveChuva, String(chuva)),
        AsyncStorage.setItem(chaveDesastre, String(desastre)),
      ]);
      return { chuva, desastre };
    }
  } catch {
    // fallback silencioso
  }

  return { chuva: false, desastre: false };
}

export async function salvarPreferenciaNotificacao(
  uid: string,
  categoria: CategoriaNotificacao,
  ativar: boolean,
): Promise<void> {
  const chave = `@AlertaChuva:${uid}:${categoria}`;
  await AsyncStorage.setItem(chave, String(ativar));

  try {
    await setDoc(
      doc(db, "users", uid),
      {
        ...(categoria === "chuva"
          ? { notificarChuva: ativar }
          : { notificarDesastres: ativar }),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // As regras ou falta de rede não impedem o funcionamento local
  }
}

/**
 * Dispara uma notificação nativa no celular (via expo-notifications) ou no
 * navegador (Notification API).
 */
export async function dispararNotificacaoDispositivo(
  notificacao: Omit<NotificacaoDisparada, "id" | "horario">,
): Promise<NotificacaoDisparada> {
  const registro: NotificacaoDisparada = {
    ...notificacao,
    id: `${notificacao.categoria}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    horario: new Date().toISOString(),
  };

  if (Platform.OS === "web") {
    try {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        new window.Notification(registro.titulo, {
          body: registro.corpo,
        });
      }
    } catch {
      // Ignora bloqueio do browser
    }
    return registro;
  }

  try {
    await inicializarCanalNotificacoes();
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: registro.titulo,
        body: registro.corpo,
        sound: "default",
        data: {
          categoria: registro.categoria,
          bairro: registro.bairro,
          severidade: registro.severidade,
        },
      },
      trigger:
        Platform.OS === "android" ? { channelId: CANAL_ANDROID_ID } : null,
    });
  } catch (erro) {
    console.warn("Erro ao agendar notificação local:", erro);
  }

  return registro;
}

/**
 * Avalia se a previsão de 3h atual + risco do bairro devem acionar os triggers:
 * 1. Categoria "chuva": dispara quando a previsão entra em alerta de chuva forte
 *    ou probabilidade de chuva forte supera o limiar.
 * 2. Categoria "desastre" (alagamento): dispara quando a combinação de chuva +
 *    vulnerabilidade do bairro gera risco de alagamento.
 */
export function avaliarGatilhosDeAlerta(
  previsao: PrevisaoChuva | null,
  score: ScoreBairro | null,
  preferencias: PreferenciasNotificacao,
): Omit<NotificacaoDisparada, "id" | "horario">[] {
  if (!previsao) return [];

  const nomeBairro = score?.bairro || "Recife";
  const nivelBairro = score?.nivel ?? "sem_historico";
  const resumo = calcularResumoChuvaEAlagamento(previsao, score);
  const decisao = combinarPrevisaoERisco(previsao.nivelChuva, nivelBairro);

  const lista: Omit<NotificacaoDisparada, "id" | "horario">[] = [];

  // Trigger 1: Alerta de Chuva Forte
  const chuvaForteDetectada =
    previsao.alerta ||
    previsao.nivelChuva === "alerta" ||
    previsao.probabilidade3hAcum10mm >= previsao.limiarForte3hAcum10mm;

  if (preferencias.chuva && chuvaForteDetectada) {
    const pctChuvaForte = Math.round(
      Math.max(
        previsao.probabilidade3hAcum10mm,
        previsao.probabilidade3h10mm,
      ) * 100,
    );
    lista.push({
      categoria: "chuva",
      bairro: nomeBairro,
      severidade: "alta",
      titulo: "Chuva forte prevista",
      corpo: `${pctChuvaForte}% de chance de chuva forte nas próximas horas.`,
    });
  }

  // Trigger 2: Alerta de Risco de Alagamento no Bairro
  const riscoAlagamentoDetectado =
    Boolean(score) &&
    (decisao.codigo === "alerta_alagamento" ||
      decisao.codigo === "atencao" ||
      resumo.chanceAlagarPct >= 30);

  if (preferencias.desastre && riscoAlagamentoDetectado && score) {
    const critico =
      decisao.codigo === "alerta_alagamento" || resumo.chanceAlagarPct >= 55;
    lista.push({
      categoria: "desastre",
      bairro: score.bairro,
      severidade: critico ? "critica" : "alta",
      titulo: `Risco de alagamento em ${score.bairro}`,
      corpo: `${resumo.chanceAlagarPct}% de chance de alagar com a chuva prevista. Evite áreas baixas.`,
    });
  }

  return lista;
}

export function gerarAssinaturaGatilho(
  previsao: PrevisaoChuva,
  bairro: string,
): string {
  const carimbo =
    previsao.fonteObservacao.startsWith("SIMULACAO")
      ? `sim-${previsao.nivelChuva}-${Math.round(previsao.probabilidade3hAcum10mm * 100)}`
      : previsao.observacaoLocal ||
        previsao.geradoEm?.toISOString().slice(0, 13) ||
        "atual";
  return `${bairro}::${previsao.nivelChuva}::${carimbo}`;
}
