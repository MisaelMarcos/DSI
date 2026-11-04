export type NivelRisco = "baixo" | "medio" | "alto" | "sem_historico";
export type NivelChuva = "alerta" | "monitoramento" | "sem_alerta" | "sem_previsao";
export type CodigoDecisao =
  | "alerta_alagamento"
  | "atencao"
  | "aviso_chuva"
  | "monitorar"
  | "sem_alerta"
  | "sem_previsao";

export const RISCO_INFO: Record<
  NivelRisco,
  {
    rotulo: string;
    titulo: string;
    descricao: string;
    cor: string;
    fundo: string;
    borda: string;
  }
> = {
  alto: {
    rotulo: "Risco alto",
    titulo: "Risco alto de alagamento",
    descricao:
      "O bairro tem histórico frequente de alagamentos. Em dias de chuva, evite áreas baixas e ruas alagadas.",
    cor: "#B91C1C",
    fundo: "#FEF2F2",
    borda: "#FECACA",
  },
  medio: {
    rotulo: "Risco médio",
    titulo: "Atenção moderada",
    descricao:
      "Há ocorrências de alagamento registradas no bairro. Fique atento durante chuvas fortes.",
    cor: "#B45309",
    fundo: "#FFF7ED",
    borda: "#FED7AA",
  },
  baixo: {
    rotulo: "Risco baixo",
    titulo: "Risco baixo no histórico",
    descricao:
      "Poucas ocorrências de alagamento foram registradas. Ainda assim, acompanhe as condições da chuva.",
    cor: "#15803D",
    fundo: "#F0FDF4",
    borda: "#BBF7D0",
  },
  sem_historico: {
    rotulo: "Sem histórico",
    titulo: "Sem histórico de alagamento",
    descricao:
      "Ainda não há ocorrências registradas para este bairro nas fontes coletadas. Isso não descarta risco em chuvas intensas.",
    cor: "#475569",
    fundo: "#F8FAFC",
    borda: "#E2E8F0",
  },
};

export function nivelRisco(valor: string | null | undefined): NivelRisco {
  if (valor === "alto" || valor === "medio" || valor === "baixo") {
    return valor;
  }
  return "sem_historico";
}

export function nivelChuva(valor: string | null | undefined): NivelChuva {
  if (
    valor === "alerta" ||
    valor === "monitoramento" ||
    valor === "sem_alerta"
  ) {
    return valor;
  }
  return "sem_previsao";
}

export type DecisaoCombinada = {
  codigo: CodigoDecisao;
  rotulo: string;
  titulo: string;
  descricao: string;
  cor: string;
  fundo: string;
  borda: string;
};

/**
 * Cruza o nível de chuva previsto pelo ML (3h) com o risco histórico do bairro,
 * seguindo a tabela de decisão de docs/plano-integracao-ml.md.
 */
export function combinarPrevisaoERisco(
  chuva: NivelChuva,
  riscoBairro: NivelRisco,
): DecisaoCombinada {
  if (chuva === "sem_previsao") {
    return {
      codigo: "sem_previsao",
      rotulo: "Sem previsão ativa",
      titulo: "Previsão de 3h ainda não sincronizada",
      descricao:
        "Exibindo apenas o risco histórico do bairro. Sincronize a previsão do modelo (sync-previsao.mjs) ou inicie a API local.",
      cor: "#1E40AF",
      fundo: "#EAF2FF",
      borda: "#BFDBFE",
    };
  }

  if (chuva === "alerta") {
    if (riscoBairro === "alto") {
      return {
        codigo: "alerta_alagamento",
        rotulo: "ALERTA DE ALAGAMENTO",
        titulo: "Chuva forte prevista (3h) em área de risco alto",
        descricao:
          "O modelo indica chuva forte nas próximas 3 horas e seu bairro tem histórico alto de alagamentos. Evite áreas baixas e acompanhe a Defesa Civil.",
        cor: "#B91C1C",
        fundo: "#FEF2F2",
        borda: "#FECACA",
      };
    }
    if (riscoBairro === "medio") {
      return {
        codigo: "atencao",
        rotulo: "ATENÇÃO NAS PRÓXIMAS 3H",
        titulo: "Chuva forte prevista (3h) em área de risco médio",
        descricao:
          "O modelo aponta chuva forte nas próximas 3 horas e seu bairro possui ocorrências registradas. Redobre a atenção ao se deslocar.",
        cor: "#B45309",
        fundo: "#FFF7ED",
        borda: "#FED7AA",
      };
    }
    return {
      codigo: "aviso_chuva",
      rotulo: "AVISO DE CHUVA FORTE",
      titulo: "Chuva forte prevista nas próximas 3h",
      descricao:
        riscoBairro === "sem_historico"
          ? "Há previsão de chuva forte no Recife nas próximas 3 horas. Seu bairro não possui histórico na base, mas fique atento."
          : "Há previsão de chuva forte no Recife nas próximas 3 horas. Seu bairro tem risco baixo, mas evite vias críticas da cidade.",
      cor: "#B45309",
      fundo: "#FFF7ED",
      borda: "#FED7AA",
    };
  }

  if (chuva === "monitoramento") {
    if (riscoBairro === "alto") {
      return {
        codigo: "atencao",
        rotulo: "ATENÇÃO NAS PRÓXIMAS 3H",
        titulo: "Chance de chuva significativa em área de risco alto",
        descricao:
          "O modelo entrou em nível de atenção para as próximas 3 horas (≥10 mm) e seu bairro tem risco alto de alagamento.",
        cor: "#B45309",
        fundo: "#FFF7ED",
        borda: "#FED7AA",
      };
    }
    return {
      codigo: "monitorar",
      rotulo: "MONITORAMENTO (3H)",
      titulo: "Chance de chuva nas próximas 3 horas",
      descricao:
        "O modelo aponta nível de atenção para chuva nas próximas 3 horas. Acompanhe a evolução das condições meteorológicas.",
      cor: "#1D4ED8",
      fundo: "#EFF6FF",
      borda: "#BFDBFE",
    };
  }

  return {
    codigo: "sem_alerta",
    rotulo: "ESTÁVEL NAS PRÓXIMAS 3H",
    titulo: "Sem indicativo de chuva significativa (3h)",
    descricao:
      "O modelo de machine learning não indica chuva forte ou acumulado crítico (≥10 mm) para as próximas 3 horas no Recife.",
    cor: "#15803D",
    fundo: "#F0FDF4",
    borda: "#BBF7D0",
  };
}

export function formatarScore(valor: number): string {
  return valor.toFixed(1).replace(".", ",");
}

export function formatarProbabilidade(valor: number): string {
  return `${(valor * 100).toFixed(1).replace(".", ",")}%`;
}

export function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}

export function formatarDataHora(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} às ${hora}:${min}`;
}

export type ResumoChuvaEAlagamento = {
  probChuva3h: number;
  intensidadeRotulo: string;
  intensidadeDescricao: string;
  chanceAlagarPct: number;
  chanceAlagarRotulo: string;
  chanceAlagarDescricao: string;
  cor: string;
  fundo: string;
  borda: string;
  chanceSeChuvaModerada: string;
  chanceSeChuvaForte: string;
};

/**
 * Calcula de forma enxuta para a Home:
 * 1. A probabilidade de chover nas próximas 3h e a intensidade esperada;
 * 2. A chance agregada de alagar no bairro com base na intensidade da chuva + vulnerabilidade do bairro.
 */
export function calcularResumoChuvaEAlagamento(
  previsao: {
    nivelChuva: NivelChuva;
    alerta: boolean;
    monitoramento: boolean;
    probabilidade3hAcum10mm: number;
    probabilidade3h10mm: number;
    probabilidade3h5mm: number;
    chuva1hMm: number;
    chuva3hMm: number;
  } | null,
  score: {
    scoreRisco: number;
    nivel: NivelRisco;
    temHistorico: boolean;
  } | null,
): ResumoChuvaEAlagamento {
  const prob5mm = previsao?.probabilidade3h5mm ?? 0;
  const prob10mmAcum = previsao?.probabilidade3hAcum10mm ?? 0;
  const prob10mmMax = previsao?.probabilidade3h10mm ?? 0;
  const probChuva3h = Math.max(prob5mm, prob10mmAcum, prob10mmMax);

  let intensidadeRotulo = "Tempo estável nas próximas 3h";
  let intensidadeDescricao =
    "Não há previsão de chuva forte nas próximas horas.";
  let fatorIntensidade = Math.min(probChuva3h * 2.5, 0.2);

  if (!previsao) {
    intensidadeRotulo = "Previsão indisponível";
    intensidadeDescricao =
      "Sem conexão com o serviço de previsão no momento.";
    fatorIntensidade = 0;
  } else if (previsao.alerta || prob10mmMax >= 0.11 || prob10mmAcum >= 0.13) {
    intensidadeRotulo = "Previsão de chuva forte";
    intensidadeDescricao =
      "Pancadas intensas previstas para as próximas 3 horas.";
    fatorIntensidade = Math.max(0.8, Math.min(1, 0.65 + prob10mmAcum));
  } else if (
    previsao.monitoramento ||
    prob10mmAcum >= 0.011 ||
    prob5mm >= 0.024
  ) {
    intensidadeRotulo = "Pode chover nas próximas 3h";
    intensidadeDescricao =
      "Há condição para chuva moderada nas próximas horas.";
    fatorIntensidade = Math.max(0.45, Math.min(0.75, 0.4 + prob10mmAcum * 2));
  } else if (previsao.chuva1hMm > 0 || previsao.chuva3hMm > 0) {
    intensidadeRotulo = "Chuva fraca recente";
    intensidadeDescricao = `Choveu ${previsao.chuva3hMm.toFixed(1).replace(".", ",")} mm nas últimas 3h, sem sinal de pancada forte.`;
    fatorIntensidade = 0.25;
  }

  const vulnerabilidade = score
    ? score.temHistorico
      ? score.scoreRisco / 100
      : Math.min((score.scoreRisco / 100) * 0.5, 0.35)
    : 0;

  const chanceAlagarPct = Math.round(
    Math.min(99, Math.max(0, vulnerabilidade * fatorIntensidade * 100)),
  );

  // Sensibilidade do bairro conforme intensidade da chuva
  const baseModerada = Math.round(vulnerabilidade * 55);
  const baseForte = Math.round(vulnerabilidade * 95);
  const chanceSeChuvaModerada = !score
    ? "—"
    : !score.temHistorico
      ? "Sem registros"
      : `${baseModerada}%`;
  const chanceSeChuvaForte = !score
    ? "—"
    : !score.temHistorico
      ? "Atenção em áreas baixas"
      : `${baseForte}%`;

  if (!score) {
    return {
      probChuva3h,
      intensidadeRotulo,
      intensidadeDescricao,
      chanceAlagarPct: 0,
      chanceAlagarRotulo: "Escolha seu bairro",
      chanceAlagarDescricao:
        "Toque no topo da tela para selecionar seu bairro e ver o risco de alagamento.",
      cor: "#2563EB",
      fundo: "#FFFFFF",
      borda: "#E2E8F0",
      chanceSeChuvaModerada,
      chanceSeChuvaForte,
    };
  }

  if (chanceAlagarPct >= 55 || (previsao?.alerta && score.nivel === "alto")) {
    return {
      probChuva3h,
      intensidadeRotulo,
      intensidadeDescricao,
      chanceAlagarPct: Math.max(chanceAlagarPct, 65),
      chanceAlagarRotulo: "Risco alto agora",
      chanceAlagarDescricao:
        "Com a chuva forte prevista e o histórico da região, ruas mais baixas podem alagar nas próximas horas.",
      cor: "#DC2626",
      fundo: "#FEF2F2",
      borda: "#FECACA",
      chanceSeChuvaModerada,
      chanceSeChuvaForte,
    };
  }

  if (
    chanceAlagarPct >= 25 ||
    (previsao?.monitoramento && score.nivel === "alto") ||
    (previsao?.alerta && score.nivel === "medio")
  ) {
    return {
      probChuva3h,
      intensidadeRotulo,
      intensidadeDescricao,
      chanceAlagarPct: Math.max(chanceAlagarPct, 30),
      chanceAlagarRotulo: "Atenção para acúmulo d'água",
      chanceAlagarDescricao:
        "Se a chuva prevista ganhar força, pontos críticos do bairro podem ter alagamento pontual.",
      cor: "#D97706",
      fundo: "#FFFBEB",
      borda: "#FDE68A",
      chanceSeChuvaModerada,
      chanceSeChuvaForte,
    };
  }

  return {
    probChuva3h,
    intensidadeRotulo,
    intensidadeDescricao,
    chanceAlagarPct,
    chanceAlagarRotulo: "Baixo no momento",
    chanceAlagarDescricao: !score.temHistorico
      ? "Sem chuva forte prevista e sem registros anteriores de alagamento neste bairro."
      : score.nivel === "alto"
        ? "Como não há previsão de chuva forte agora, o risco imediato é baixo — mas o bairro costuma alagar quando chove forte."
        : "Sem previsão de chuva forte para as próximas 3 horas.",
    cor: "#16A34A",
    fundo: "#FFFFFF",
    borda: "#E2E8F0",
    chanceSeChuvaModerada,
    chanceSeChuvaForte,
  };
}
