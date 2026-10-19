#!/usr/bin/env node
// Smoke test do Firebase: Auth (REST) + Firestore (REST) no projeto real.
// Lê apiKey/projectId de src/lib/firebase.ts — nada fica hardcoded aqui.
//
// Uso: node scripts/firebase-smoke.mjs
//
// O que ele faz:
//   1. Testa o provider Email/senha (login com credencial inexistente)
//   2. Cria um usuário anônimo temporário (se o provider Anonymous estiver ativo)
//   3. Consulta as coleções do Firestore SEM token (deve negar, se as regras
//      novas estiverem publicadas) e COM token (deve permitir leitura)
//   4. Apaga o usuário anônimo temporário no final (cleanup)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(__dirname, "..", "src", "lib", "firebase.ts"),
  "utf8",
);
const pick = (key) => src.match(new RegExp(`${key}\\s*:\\s*"([^"]+)"`))?.[1];
const API_KEY = pick("apiKey");
const PROJECT = pick("projectId");

if (!API_KEY || !PROJECT) {
  console.error("Não encontrei apiKey/projectId em src/lib/firebase.ts");
  process.exit(1);
}
console.log(`Projeto: ${PROJECT}\n`);

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const IDENTITY = "https://identitytoolkit.googleapis.com/v1/accounts";

async function authPost(method, payload) {
  const res = await fetch(`${IDENTITY}:${method}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function firestoreGet(path, idToken) {
  const url = `${FS_BASE}${path}?pageSize=3&key=${API_KEY}`;
  const res = await fetch(url, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function firestoreWrite(method, path, idToken, fields) {
  const url = `${FS_BASE}${path}?key=${API_KEY}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: fields ? JSON.stringify({ fields }) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const summarize = (body) => {
  if (body?.documents) return `${body.documents.length} doc(s)`;
  return body?.error?.status || body?.error?.message || "vazio";
};

// 1) Provider Email/senha está ativo?
const badLogin = await authPost("signInWithPassword", {
  email: "smoke-test-nao-existe@example.invalid",
  password: "senha-invalida-123",
  returnSecureToken: true,
});
console.log(
  `[1] Email/senha: HTTP ${badLogin.status} → ${
    badLogin.body?.error?.message ?? "ok (inesperado!)"
  }`,
);

// 2) Anonymous ativo? (token para testar as regras autenticadas)
let idToken = null;
let anonUid = null;
const anon = await authPost("signUp", { returnSecureToken: true });
if (anon.status === 200 && anon.body.idToken) {
  idToken = anon.body.idToken;
  anonUid = anon.body.localId;
  console.log(`[2] Anonymous: ativo (uid temporário ${anonUid.slice(0, 6)}...)`);
} else {
  console.log(
    `[2] Anonymous: indisponível (HTTP ${anon.status} → ${
      anon.body?.error?.message ?? "?"
    })`,
  );
  // Fallback: cria um usuário de email temporário só para testar as regras
  // autenticadas. É apagado no final (seção de cleanup).
  const email = `smoke-teste-${Date.now()}@example.com`;
  const temp = await authPost("signUp", {
    email,
    password: "Smoke-Teste-123!",
    returnSecureToken: true,
  });
  if (temp.status === 200 && temp.body.idToken) {
    idToken = temp.body.idToken;
    anonUid = temp.body.localId;
    console.log(`[2b] Usuário temporário criado: ${email} (será apagado)`);
  } else {
    console.log(
      `[2b] Não deu para criar usuário temporário (HTTP ${temp.status} → ${
        temp.body?.error?.message ?? "?"
      })`,
    );
  }
}

// 3) Firestore sem token — a regra nova (nega não autenticado) deve barrar
console.log("\nFirestore SEM token:");
for (const col of ["users", "bairros", "scores", "alertas", "ocorrencias"]) {
  const r = await firestoreGet(`/${col}`, null);
  console.log(`  [${r.status}] /${col} — ${summarize(r.body)}`);
}

// 4) Firestore com token anônimo — leitura autenticada deve funcionar
if (idToken) {
  console.log("\nFirestore COM token (anônimo temporário):");
  for (const col of ["users", "bairros", "scores", "alertas", "ocorrencias"]) {
    const r = await firestoreGet(`/${col}`, idToken);
    console.log(`  [${r.status}] /${col} — ${summarize(r.body)}`);
  }
  const own = await firestoreGet(`/users/${anonUid}`, idToken);
  console.log(
    `  [${own.status}] /users/<uid próprio> — ${
      own.body?.error?.status ?? "documento existe"
    }`,
  );

  // 5) Testes negativos de escrita: cliente não deve conseguir escrever
  console.log("\nEscrita COM token (deve ser NEGADA pelas regras):");
  const w1 = await firestoreWrite("PATCH", "/bairros/teste-smoke", idToken, {
    nome: { stringValue: "x" },
  });
  console.log(`  [${w1.status}] PATCH /bairros/teste-smoke — ${w1.body?.error?.status ?? "escreveu! (RUIM)"}`);
  const w2 = await firestoreWrite("PATCH", "/smoke_teste/abc", idToken, {
    campo: { stringValue: "x" },
  });
  console.log(`  [${w2.status}] PATCH /smoke_teste/abc (catch-all) — ${w2.body?.error?.status ?? "escreveu! (RUIM)"}`);
  const w3 = await firestoreWrite("PATCH", "/users/outro-uid-qualquer", idToken, {
    email: { stringValue: "x" },
  });
  console.log(`  [${w3.status}] PATCH /users/<uid de outro> — ${w3.body?.error?.status ?? "escreveu! (RUIM)"}`);

  // cleanup
  const del = await authPost("delete", { idToken });
  console.log(
    `\nCleanup: usuário temporário apagado (HTTP ${del.status}${
      del.body?.error ? " → " + del.body.error.message : ""
    })`,
  );
}
