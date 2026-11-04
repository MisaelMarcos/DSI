#!/usr/bin/env node
// Sincroniza a previsão de chuva atual (3h) do módulo de ML com o Firestore
// em /previsoes/atual (compatível com a regra read-only de firestore.rules).
//
// Uso:
//   node scripts/sync-previsao.mjs                  # dry-run (mostra os dados)
//   node scripts/sync-previsao.mjs --apply          # grava em /previsoes/atual
//   node scripts/sync-previsao.mjs --credentials C:\caminho\conta.json --apply

import { existsSync, readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DEFAULT_PREVISAO_JSON = join(
  ROOT,
  "src",
  "backend",
  "ml",
  "outputs",
  "previsao.json",
);

function argumento(nome) {
  const indice = process.argv.indexOf(nome);
  return indice === -1 ? null : process.argv[indice + 1];
}

const aplicar = process.argv.includes("--apply");
const arquivoPrevisao = resolve(
  argumento("--file") ?? DEFAULT_PREVISAO_JSON,
);
const credenciaisPath =
  argumento("--credentials") ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!existsSync(arquivoPrevisao)) {
  console.error(
    `Arquivo de previsão não encontrado: ${arquivoPrevisao}\n` +
      "Gere antes com:\n" +
      "  src\\backend\\ml\\.venv\\Scripts\\python.exe src\\backend\\ml\\collect_inmet.py\n" +
      "  src\\backend\\ml\\.venv\\Scripts\\python.exe src\\backend\\ml\\predict.py --saida src\\backend\\ml\\outputs\\previsao.json",
  );
  process.exit(1);
}

const firebaseTs = readFileSync(
  join(ROOT, "src", "lib", "firebase.ts"),
  "utf8",
);
const PROJECT = firebaseTs.match(/projectId\s*:\s*"([^"]+)"/)?.[1];
if (!PROJECT) {
  console.error("Não encontrei projectId em src/lib/firebase.ts");
  process.exit(1);
}

const bruto = JSON.parse(readFileSync(arquivoPrevisao, "utf8"));
const principal =
  bruto.previsao_principal ?? bruto.previsoes?.["3h_acum_10mm"] ?? {};
const intensidade =
  bruto.previsao_intensidade ?? bruto.previsoes?.["3h_10mm"] ?? {};
const moderada3h = bruto.previsoes?.["3h_5mm"] ?? {};
const obs = bruto.observacao ?? {};

const alertaForte = Boolean(principal.alerta || intensidade.alerta);
const monitoramento = Boolean(
  alertaForte ||
    principal.monitoramento ||
    intensidade.monitoramento ||
    moderada3h.monitoramento,
);
const nivelChuva = alertaForte
  ? "alerta"
  : monitoramento
    ? "monitoramento"
    : "sem_alerta";

const atualizadoEm = new Date().toISOString();
const geradoEm = bruto.gerado_em
  ? new Date(bruto.gerado_em).toISOString()
  : atualizadoEm;

const resumo = {
  gerado_em: geradoEm,
  atualizado_em: atualizadoEm,
  modelo_versao: String(bruto.modelo_versao ?? "1.0.0"),
  nivel_chuva: nivelChuva,
  alerta: alertaForte,
  monitoramento,
  recomendacao: String(
    bruto.recomendacao ??
      "Sem indicativo de chuva significativa nas próximas horas.",
  ),
  probabilidade_3h_acum_10mm: Number(principal.probabilidade ?? 0),
  limiar_atencao_3h_acum_10mm: Number(principal.limiar_probabilidade ?? 0.011),
  limiar_forte_3h_acum_10mm: Number(principal.limiar_forte ?? 0.128),
  probabilidade_3h_10mm: Number(intensidade.probabilidade ?? 0),
  probabilidade_3h_5mm: Number(moderada3h.probabilidade ?? 0),
  chuva_1h_mm: Number(obs.chuva_1h_mm ?? 0),
  chuva_3h_mm: Number(obs.chuva_3h_mm ?? 0),
  observacao_utc: String(obs.datetime_utc ?? ""),
  observacao_local: String(obs.datetime_local ?? ""),
  fonte_observacao: String(obs.fonte ?? "INMET A301"),
};

console.log(`Projeto: ${PROJECT}`);
console.log(`Destino: /previsoes/atual`);
console.log(`Nível de chuva (3h): ${resumo.nivel_chuva}`);
console.log(
  `Probabilidade 3h_acum_10mm: ${(resumo.probabilidade_3h_acum_10mm * 100).toFixed(1)}% (atenção >= ${(resumo.limiar_atencao_3h_acum_10mm * 100).toFixed(1)}%, forte >= ${(resumo.limiar_forte_3h_acum_10mm * 100).toFixed(1)}%)`,
);
console.log(
  `Probabilidade 3h_10mm: ${(resumo.probabilidade_3h_10mm * 100).toFixed(1)}%`,
);
console.log(
  `Observação (${resumo.fonte_observacao}): 1h=${resumo.chuva_1h_mm} mm | 3h=${resumo.chuva_3h_mm} mm | ${resumo.observacao_local}`,
);
console.log(`Recomendação: ${resumo.recomendacao}`);

if (!aplicar) {
  console.log("\nDry-run: nada foi gravado. Use --apply para sincronizar.");
  process.exit(0);
}

if (!credenciaisPath) {
  console.error(
    "Defina GOOGLE_APPLICATION_CREDENTIALS ou passe --credentials <arquivo> para usar --apply.",
  );
  process.exit(1);
}

const credenciais = JSON.parse(readFileSync(resolve(credenciaisPath), "utf8"));
if (credenciais.type !== "service_account") {
  console.error("A credencial não é uma service account.");
  process.exit(1);
}
if (credenciais.project_id !== PROJECT) {
  console.error(
    `Credencial do projeto "${credenciais.project_id}" não confere com o app ("${PROJECT}").`,
  );
  process.exit(1);
}

async function obterAccessToken() {
  const agora = Math.floor(Date.now() / 1000);
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned =
    b64({ alg: "RS256", typ: "JWT" }) +
    "." +
    b64({
      iss: credenciais.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: credenciais.token_uri,
      iat: agora,
      exp: agora + 3600,
    });

  const assinatura = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(credenciais.private_key)
    .toString("base64url");

  const resposta = await fetch(credenciais.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=" +
      encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") +
      "&assertion=" +
      encodeURIComponent(`${unsigned}.${assinatura}`),
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !corpo.access_token) {
    throw new Error(
      `Falha ao obter token (HTTP ${resposta.status}): ${
        corpo.error_description ?? corpo.error ?? "?"
      }`,
    );
  }
  return corpo.access_token;
}

const fields = {
  gerado_em: { timestampValue: resumo.gerado_em },
  atualizado_em: { timestampValue: resumo.atualizado_em },
  modelo_versao: { stringValue: resumo.modelo_versao },
  nivel_chuva: { stringValue: resumo.nivel_chuva },
  alerta: { booleanValue: resumo.alerta },
  monitoramento: { booleanValue: resumo.monitoramento },
  recomendacao: { stringValue: resumo.recomendacao },
  probabilidade_3h_acum_10mm: {
    doubleValue: resumo.probabilidade_3h_acum_10mm,
  },
  limiar_atencao_3h_acum_10mm: {
    doubleValue: resumo.limiar_atencao_3h_acum_10mm,
  },
  limiar_forte_3h_acum_10mm: {
    doubleValue: resumo.limiar_forte_3h_acum_10mm,
  },
  probabilidade_3h_10mm: { doubleValue: resumo.probabilidade_3h_10mm },
  probabilidade_3h_5mm: { doubleValue: resumo.probabilidade_3h_5mm },
  chuva_1h_mm: { doubleValue: resumo.chuva_1h_mm },
  chuva_3h_mm: { doubleValue: resumo.chuva_3h_mm },
  observacao_utc: { stringValue: resumo.observacao_utc },
  observacao_local: { stringValue: resumo.observacao_local },
  fonte_observacao: { stringValue: resumo.fonte_observacao },
};

const token = await obterAccessToken();
const FS_DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const resposta = await fetch(`${FS_DOCS}:commit`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    writes: [
      {
        update: {
          name: `projects/${PROJECT}/databases/(default)/documents/previsoes/atual`,
          fields,
        },
        updateMask: { fieldPaths: Object.keys(fields) },
      },
    ],
  }),
});

const corpo = await resposta.json().catch(() => ({}));
if (!resposta.ok) {
  throw new Error(
    `Commit falhou (HTTP ${resposta.status}): ${
      corpo.error?.message ?? corpo.error?.status ?? "?"
    }`,
  );
}

console.log(`\nGravado com sucesso em /previsoes/atual (${atualizadoEm}).`);
