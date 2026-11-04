import Constants from "expo-constants";
import { doc, getDoc } from "firebase/firestore";
import { Platform } from "react-native";

import { db } from "@/lib/firebase";
import { nivelChuva, type NivelChuva } from "@/lib/risco";

export type PrevisaoChuva = {
  nivelChuva: NivelChuva;
  alerta: boolean;
  monitoramento: boolean;
  recomendacao: string;
  probabilidade3hAcum10mm: number;
  limiarAtencao3hAcum10mm: number;
  limiarForte3hAcum10mm: number;
  probabilidade3h10mm: number;
  probabilidade3h5mm: number;
  chuva1hMm: number;
  chuva3hMm: number;
  observacaoLocal: string;
  fonteObservacao: string;
  modeloVersao: string;
  geradoEm: Date | null;
  atualizadoEm: Date | null;
  origem: "firestore" | "api";
};

function parseDataFirestore(valor: unknown): Date | null {
  if (
    valor &&
    typeof valor === "object" &&
    "toDate" in valor &&
    typeof (valor as { toDate: () => Date }).toDate === "function"
  ) {
    return (valor as { toDate: () => Date }).toDate();
  }
  if (typeof valor === "string" && valor.trim()) {
    const dt = new Date(valor);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

let cenarioSimuladoMemoria: CenarioSimulacao = "real";

function obterBaseUrlApiLocal(): string {
  const envUrl = process.env.EXPO_PUBLIC_ML_API_URL?.trim();
  const hostLan = Constants.expoConfig?.hostUri?.split(":")[0];
  return (
    envUrl ||
    (Platform.OS === "web"
      ? "http://localhost:8000"
      : hostLan
        ? `http://${hostLan}:8000`
        : "")
  ).replace(/\/$/, "");
}

function construirPrevisaoSimuladaLocal(
  cenario: Exclude<CenarioSimulacao, "real">,
): PrevisaoChuva {
  const agora = new Date();
  const horaLocal = agora.toISOString().replace("T", " ").slice(0, 19);

  if (cenario === "monitoramento") {
    return {
      nivelChuva: "monitoramento",
      alerta: false,
      monitoramento: true,
      recomendacao:
        "ATENÇÃO: há chance de chuva significativa nas próximas 3 horas (simulação de monitoramento ativa).",
      probabilidade3hAcum10mm: 0.085,
      limiarAtencao3hAcum10mm: 0.011,
      limiarForte3hAcum10mm: 0.128,
      probabilidade3h10mm: 0.062,
      probabilidade3h5mm: 0.42,
      chuva1hMm: 2.8,
      chuva3hMm: 5.4,
      observacaoLocal: horaLocal,
      fonteObservacao: "SIMULACAO (MONITORAMENTO)",
      modeloVersao: "1.0.0",
      geradoEm: agora,
      atualizadoEm: agora,
      origem: "api",
    };
  }

  return {
    nivelChuva: "alerta",
    alerta: true,
    monitoramento: true,
    recomendacao:
      "ALERTA: alta probabilidade de chuva forte nas próximas 3 horas. Monitore áreas de risco de alagamento.",
    probabilidade3hAcum10mm: 0.78,
    limiarAtencao3hAcum10mm: 0.011,
    limiarForte3hAcum10mm: 0.128,
    probabilidade3h10mm: 0.64,
    probabilidade3h5mm: 0.89,
    chuva1hMm: 12.4,
    chuva3hMm: 24.6,
    observacaoLocal: horaLocal,
    fonteObservacao: "SIMULACAO (CHUVA_FORTE)",
    modeloVersao: "1.0.0",
    geradoEm: agora,
    atualizadoEm: agora,
    origem: "api",
  };
}

function mapearRespostaApi(dados: Record<string, any>): PrevisaoChuva {
  const principal =
    dados.previsao_principal ?? dados.previsoes?.["3h_acum_10mm"] ?? {};
  const intensidade =
    dados.previsao_intensidade ?? dados.previsoes?.["3h_10mm"] ?? {};
  const moderada3h = dados.previsoes?.["3h_5mm"] ?? {};
  const obs = dados.observacao ?? {};

  const alerta = Boolean(principal.alerta || intensidade.alerta);
  const monitoramento = Boolean(
    alerta ||
      principal.monitoramento ||
      intensidade.monitoramento ||
      moderada3h.monitoramento,
  );
  const nivel: NivelChuva = alerta
    ? "alerta"
    : monitoramento
      ? "monitoramento"
      : "sem_alerta";
  const geradoEm = parseDataFirestore(dados.gerado_em);

  return {
    nivelChuva: nivel,
    alerta,
    monitoramento,
    recomendacao:
      typeof dados.recomendacao === "string"
        ? dados.recomendacao
        : "Sem indicativo de chuva significativa nas próximas horas.",
    probabilidade3hAcum10mm: Number(principal.probabilidade ?? 0),
    limiarAtencao3hAcum10mm: Number(principal.limiar_probabilidade ?? 0.011),
    limiarForte3hAcum10mm: Number(principal.limiar_forte ?? 0.128),
    probabilidade3h10mm: Number(intensidade.probabilidade ?? 0),
    probabilidade3h5mm: Number(moderada3h.probabilidade ?? 0),
    chuva1hMm: Number(obs.chuva_1h_mm ?? 0),
    chuva3hMm: Number(obs.chuva_3h_mm ?? 0),
    observacaoLocal: String(obs.datetime_local ?? ""),
    fonteObservacao: String(obs.fonte ?? "INMET A301"),
    modeloVersao: String(dados.modelo_versao ?? "1.0.0"),
    geradoEm,
    atualizadoEm: geradoEm,
    origem: "api",
  };
}

async function tentarApiLocal(): Promise<PrevisaoChuva | null> {
  const baseUrl = obterBaseUrlApiLocal();
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const resp = await fetch(`${baseUrl}/prever/atual`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;

    const dados = await resp.json();
    return mapearRespostaApi(dados);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type CenarioSimulacao = "real" | "monitoramento" | "chuva_forte";

export async function simularCenarioPrevisao(
  cenario: CenarioSimulacao,
): Promise<PrevisaoChuva | null> {
  cenarioSimuladoMemoria = cenario;
  const baseUrl = obterBaseUrlApiLocal();

  if (baseUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    try {
      const resp = await fetch(`${baseUrl}/prever/simular`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cenario }),
      });
      if (resp.ok) {
        const dados = await resp.json();
        return mapearRespostaApi(dados);
      }
    } catch {
      // Fallback imediato para simulação em memória caso a API não esteja acessível na rede
    } finally {
      clearTimeout(timer);
    }
  }

  if (cenario === "real") {
    return buscarPrevisaoAtual();
  }

  return construirPrevisaoSimuladaLocal(cenario);
}

/**
 * Lê /previsoes/atual no Firestore (somente leitura autenticada).
 * Se ainda não houver documento publicado, tenta fallback na API FastAPI local
 * quando EXPO_PUBLIC_ML_API_URL está definida (ou web localhost).
 */
export async function buscarPrevisaoAtual(): Promise<PrevisaoChuva | null> {
  if (cenarioSimuladoMemoria !== "real") {
    return construirPrevisaoSimuladaLocal(cenarioSimuladoMemoria);
  }
  try {
    const snap = await getDoc(doc(db, "previsoes", "atual"));
    if (snap.exists()) {
      const d = snap.data();
      return {
        nivelChuva: nivelChuva(d.nivel_chuva),
        alerta: Boolean(d.alerta),
        monitoramento: Boolean(d.monitoramento),
        recomendacao:
          typeof d.recomendacao === "string"
            ? d.recomendacao
            : "Sem indicativo de chuva significativa nas próximas horas.",
        probabilidade3hAcum10mm: Number(d.probabilidade_3h_acum_10mm ?? 0),
        limiarAtencao3hAcum10mm: Number(
          d.limiar_atencao_3h_acum_10mm ?? 0.011,
        ),
        limiarForte3hAcum10mm: Number(d.limiar_forte_3h_acum_10mm ?? 0.128),
        probabilidade3h10mm: Number(d.probabilidade_3h_10mm ?? 0),
        probabilidade3h5mm: Number(d.probabilidade_3h_5mm ?? 0),
        chuva1hMm: Number(d.chuva_1h_mm ?? 0),
        chuva3hMm: Number(d.chuva_3h_mm ?? 0),
        observacaoLocal:
          typeof d.observacao_local === "string" ? d.observacao_local : "",
        fonteObservacao:
          typeof d.fonte_observacao === "string"
            ? d.fonte_observacao
            : "INMET A301",
        modeloVersao:
          typeof d.modelo_versao === "string" ? d.modelo_versao : "1.0.0",
        geradoEm: parseDataFirestore(d.gerado_em),
        atualizadoEm: parseDataFirestore(d.atualizado_em),
        origem: "firestore",
      };
    }
  } catch (erro) {
    console.warn("Aviso ao ler /previsoes/atual no Firestore:", erro);
  }

  return tentarApiLocal();
}
