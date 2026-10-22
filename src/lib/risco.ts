export type NivelRisco = "baixo" | "medio" | "alto" | "sem_historico";

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

export function formatarScore(valor: number): string {
  return valor.toFixed(1).replace(".", ",");
}

export function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}
