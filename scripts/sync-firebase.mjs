#!/usr/bin/env node
// Sincroniza a lista canônica de bairros e o score de risco com o Firestore.
//
// Usa a API REST do Firestore + a service account (Admin), sem dependências
// novas — mesmo padrão de scripts/firebase-smoke.mjs.
//
// Uso:
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\caminho\service-account.json"
//   node scripts/sync-firebase.mjs            # dry-run (só mostra o plano)
//   node scripts/sync-firebase.mjs --apply    # grava no Firestore
//
// Ou: node scripts/sync-firebase.mjs --credentials C:\caminho\conta.json --apply

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCORE_CSV = join(
  ROOT,
  "src",
  "backend",
  "pipeline",
  "data",
  "score_bairro.csv",
);

function argumento(nome) {
  const indice = process.argv.indexOf(nome);
  return indice === -1 ? null : process.argv[indice + 1];
}

const aplicar = process.argv.includes("--apply");
const credenciaisPath =
  argumento("--credentials") ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credenciaisPath) {
  console.error(
    "Defina GOOGLE_APPLICATION_CREDENTIALS ou passe --credentials <arquivo>.",
  );
  process.exit(1);
}

// Projeto configurado no app (não hardcodar outro).
const firebaseTs = readFileSync(
  join(ROOT, "src", "lib", "firebase.ts"),
  "utf8",
);
const PROJECT = firebaseTs.match(/projectId\s*:\s*"([^"]+)"/)?.[1];
if (!PROJECT) {
  console.error("Não encontrei projectId em src/lib/firebase.ts");
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

function parseCsvLine(linha) {
  const campos = [];
  let atual = "";
  let entreAspas = false;

  for (let i = 0; i < linha.length; i += 1) {
    const char = linha[i];

    if (char === '"') {
      if (entreAspas && linha[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (char === "," && !entreAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += char;
    }
  }

  campos.push(atual);
  return campos.map((campo) => campo.trim());
}

function lerScore() {
  const linhas = readFileSync(SCORE_CSV, "utf8")
    .split(/\r?\n/)
    .filter((linha) => linha.trim());

  const cabecalho = parseCsvLine(linhas.shift());
  const obrigatorios = [
    "bairro",
    "frequencia",
    "ocorrencias",
    "score_freq",
    "lat",
    "lon",
    "elevacao_m",
    "score_elev",
    "score_risco",
    "nivel",
    "tem_historico",
  ];

  for (const campo of obrigatorios) {
    if (!cabecalho.includes(campo)) {
      throw new Error(`Coluna ausente em score_bairro.csv: ${campo}`);
    }
  }

  return linhas.map((linha) => {
    const valores = parseCsvLine(linha);
    const row = Object.fromEntries(
      cabecalho.map((campo, indice) => [campo, valores[indice] ?? ""]),
    );

    return {
      bairro: row.bairro,
      slug: row.bairro
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      frequencia: Number(row.frequencia),
      ocorrencias: Number.parseInt(row.ocorrencias, 10) || 0,
      score_freq: Number(row.score_freq),
      lat: row.lat ? Number(row.lat) : null,
      lon: row.lon ? Number(row.lon) : null,
      elevacao_m: row.elevacao_m ? Number(row.elevacao_m) : null,
      score_elev: Number(row.score_elev),
      score_risco: Number(row.score_risco),
      nivel: row.nivel,
      tem_historico: row.tem_historico === "True" || row.tem_historico === "true",
    };
  });
}

function doubleValue(valor) {
  return valor === null ? { nullValue: null } : { doubleValue: valor };
}

function fieldsScore(item, atualizadoEm) {
  return {
    bairro: { stringValue: item.bairro },
    slug: { stringValue: item.slug },
    frequencia: { doubleValue: item.frequencia },
    ocorrencias: { integerValue: String(item.ocorrencias) },
    score_freq: { doubleValue: item.score_freq },
    lat: doubleValue(item.lat),
    lon: doubleValue(item.lon),
    elevacao_m: doubleValue(item.elevacao_m),
    score_elev: { doubleValue: item.score_elev },
    score_risco: { doubleValue: item.score_risco },
    nivel: { stringValue: item.nivel },
    tem_historico: { booleanValue: item.tem_historico },
    atualizado_em: { timestampValue: atualizadoEm },
  };
}

function fieldsBairro(item, atualizadoEm) {
  return {
    nome: { stringValue: item.bairro },
    slug: { stringValue: item.slug },
    atualizado_em: { timestampValue: atualizadoEm },
  };
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

const FS_DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function commit(writes, token) {
  const resposta = await fetch(`${FS_DOCS}:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(
      `Commit falhou (HTTP ${resposta.status}): ${
        corpo.error?.message ?? corpo.error?.status ?? "?"
      }`,
    );
  }

  return corpo;
}

async function contar(colecao, token) {
  const resposta = await fetch(`${FS_DOCS}/${colecao}?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      `Leitura de /${colecao} falhou (HTTP ${resposta.status}): ${
        corpo.error?.message ?? "?"
      }`,
    );
  }

  return corpo.documents?.length ?? 0;
}

const itens = lerScore();
const atualizadoEm = new Date().toISOString();
const invalidos = itens.filter(
  (item) =>
    !item.bairro ||
    !Number.isFinite(item.score_risco) ||
    !Number.isFinite(item.score_elev) ||
    !Number.isFinite(item.score_freq),
);

if (invalidos.length) {
  console.error(
    "Linhas inválidas no score:",
    invalidos.map((item) => item.bairro || "<sem bairro>").join(", "),
  );
  process.exit(1);
}

const slugs = new Set(itens.map((item) => item.slug));
if (slugs.size !== itens.length) {
  console.error("Há bairros com slug duplicado; abortando.");
  process.exit(1);
}

console.log(`Projeto: ${PROJECT}`);
console.log(`Bairros no score: ${itens.length}`);
console.log(
  `Com histórico: ${itens.filter((item) => item.tem_historico).length} | sem histórico: ${
    itens.filter((item) => !item.tem_historico).length
  }`,
);
console.log(`Credencial: ${credenciais.client_email}`);
console.log(
  `\nDestino: /scores/{slug} (${itens.length} docs) e /bairros/{slug} (${itens.length} docs)`,
);
console.log(
  `Exemplos: ${itens
    .slice(0, 3)
    .map((item) => item.slug)
    .join(", ")}`,
);

if (!aplicar) {
  console.log("\nDry-run: nada foi gravado. Use --apply para sincronizar.");
  process.exit(0);
}

const token = await obterAccessToken();
const writes = [];

for (const item of itens) {
  const scoreFields = fieldsScore(item, atualizadoEm);
  writes.push({
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/scores/${item.slug}`,
      fields: scoreFields,
    },
    updateMask: { fieldPaths: Object.keys(scoreFields) },
  });

  const bairroFields = fieldsBairro(item, atualizadoEm);
  writes.push({
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/bairros/${item.slug}`,
      fields: bairroFields,
    },
    updateMask: { fieldPaths: Object.keys(bairroFields) },
  });
}

console.log(`\nGravando ${writes.length} documentos...`);
const resultado = await commit(writes, token);
console.log(`Commit OK: ${resultado.writeResults?.length ?? 0} writes.`);

const [totalScores, totalBairros] = await Promise.all([
  contar("scores", token),
  contar("bairros", token),
]);
console.log(`Verificação: /scores = ${totalScores} docs | /bairros = ${totalBairros} docs`);
console.log(`Sincronizado em ${atualizadoEm}`);
