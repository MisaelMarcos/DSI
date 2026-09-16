# Guia de Design — AlertaChuvaRecife (travado)

> Decisões travadas com o time. Não alterar sem alinhar.
> Linha escolhida: **Climatempo / Tempo iOS** — clara, minimalista, cards azuis.
> Assets atuais `src/assets/img1.png` e `img2.png` mantidos, só reposicionados.

## 1. Referências renomadas analisadas

| App | O que aproveitar | O que evitar |
| --- | --- | --- |
| **Climatempo (BR)** | Fundo claro, header cidade + temp grande, lista 15 dias, abas Previsão/Mapas/Alertas, alertas em cards amarelo/laranja, onboarding com ilustração + CTA único | Menu sanduíche poluído |
| **Tempo iOS nativo** | Gradiente azul-claro, tipografia gigante, lista horária horizontal, cards raio 16-20, minimalismo | Falta de alertas fortes |
| **AccuWeather / The Weather Channel** | RealFeel, MinuteCast, radar 24h, seção de vídeos/notícias | Tema escuro pesado, excesso de info — deixar para home futura |
| **Windy.com / RainViewer / Clima&Radar** | Mapa interativo, previsão hora-a-hora | Curva de aprendizado alta — só inspiração futura |
| **Behance / Dribbble `weather app UI`** | Onboarding 3 passos, inputs 48-56h raio 12-16, botão primário cheio, link secundário abaixo | Glassmorphism excessivo |

## 2. Tokens (fonte: `src/theme.ts`)

- Fundo: `#FFFFFF` (branco puro para fundir com `img1/img2`, que têm fundo branco chapado)
- Home `/home` mantém `#F2F6FF` de fundo com cards `#FFFFFF` para contraste (sem imagens, sem box).
- Card: `#FFFFFF`
- Primário: `#3366FF` (mantido do `Button` atual)
- Texto: `#111827` / Secundário `#6B7280` / Borda `#DCE3F0`
- Alerta: `#F59E0B` (reservado para cards de chuva forte)
- Título: 28-32 extrabold / Subtítulo: 16 regular / Botão: 16 semibold
- Espaçamento: padding 24-32, gap 12-16, ilustração h 260-300 `contain`
- Inputs: h 52, raio 12, borda `#DCE3F0`

## 3. Mapa de telas

```
/ (index.tsx)  -> Landing: gradiente #2F6BFF->#CFE4FA + logo em card branco + "AlertaChuva" (Alerta branco) + tagline + Button branco "Começar" -> /login
/login.tsx     -> img1.png + Usuário + Senha + Button Entrar + link "Cadastre-se" -> /signup
/signup.tsx    -> img2.png + Usuário + Senha + Confirmar + Button Cadastrar + link "Entre aqui" -> /login
/home.tsx      -> Home provisória template estilo Climatempo + Button Sair -> /
```

## 4. Uso dos assets existentes

- Landing `/` sem ilustração (só logo + título).
- `img1.png` (pessoa com megafone) = **login**.
- `img2.png` (pessoa com celular) = **cadastro**.
- Nada é deletado. Logo oficial em `src/assets/logo.png` (origem: `assets/images/Gemini_*.png`), usada via `LogoPlaceholder`.

## 5. Regras para não quebrar Docker/scripts

- Não alterar `package.json` (sem Firebase SDK), `Dockerfile`, `docker-compose.yml`, `scripts/start-docker.ps1`.
- Arquivos novos são só `.tsx/.ts/.md` — copiados pelo `COPY . .` sem afetar `npm ci`.
- `.env.example` mantém `REACT_NATIVE_PACKAGER_HOSTNAME` na primeira linha; bloco Firebase é só comentário.
- `database/conexão.ts` mantido; novo contrato fica em `src/backend/`.

## 6. Backend (sem integração)

Ver `src/backend/README.md`. Contrato pronto:

- Coleção sugerida `users`: `{ username: string unique, passwordHash: string, createdAt: timestamp }`
- Nunca salvar senha plain. Login futuro busca por `username`.
- Pontos `TODO(firebase)` marcam onde o outro time conecta Auth + Firestore.
