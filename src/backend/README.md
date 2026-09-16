# Backend — contratos (auth Firebase já integrada nas telas)

As telas hoje chamam o Firebase direto via `src/lib/firebase.ts`
(`signInWithEmailAndPassword` / `createUserWithEmailAndPassword`). Esta pasta
guarda os contratos originais para evoluções (ex.: persistência no Firestore).

## Arquivos

- `types.ts` — `UserCredentials`, `RegisterInput`, `AuthResult`, `UserRecord`
- `auth.repository.ts` — interface `AuthRepository` para camadas futuras
- `auth.service.ts` — service legado de validação local (não usado pelas telas)
- `firebase.config.template.ts` — objeto de config vazio (referência)

## Schema sugerido (Firestore, coleção `users`)

```text
users/{id}
  username: string (único, trim, min 3)
  passwordHash: string (nunca senha pura)
  createdAt: timestamp
```

## Passo a passo para o time de backend

1. Projeto Firebase `dsi-ufrpe-58db3` com Auth (Email/senha) + Firestore ativos
2. Migrar a config hardcoded de `src/lib/firebase.ts` para `.env`
   (`EXPO_PUBLIC_FIREBASE_*`, template em `.env.example`)
3. Implementar persistência no Firestore a partir de `AuthRepository`
4. Regras Firestore: só ler/escrever o próprio `users/{uid}`

## O que NÃO fazer ainda

- Não commitar `.env` com chaves reais
- Não salvar senha em texto puro
- Não mudar o fluxo `/ -> /login -> /signup -> /home`
