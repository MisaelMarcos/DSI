# Backend — pronto para Firebase (sem integração)

Pasta deixada pronta para os outros desenvolvedores. Nada aqui é chamado
pelas telas e nenhum SDK foi instalado.

## Arquivos

- `types.ts` — `UserCredentials`, `RegisterInput`, `AuthResult`, `UserRecord`
- `auth.repository.ts` — interface `AuthRepository` a implementar com Firebase
- `auth.service.ts` — validação local atual; pontos `TODO(firebase)` marcam a troca
- `firebase.config.template.ts` — lê `EXPO_PUBLIC_FIREBASE_*` do `.env`, sem inicializar nada

## Schema sugerido (Firestore, coleção `users`)

```text
users/{id}
  username: string (único, trim, min 3)
  passwordHash: string (nunca senha pura)
  createdAt: timestamp
```

## Passo a passo para o time de backend

1. `npm i firebase` (ou `@react-native-firebase/*`, decidir um só)
2. Criar projeto Firebase, ativar Auth + Firestore
3. Copiar `.env.example` para `.env` e preencher `EXPO_PUBLIC_FIREBASE_*`
4. Implementar `AuthRepository` com Auth + Firestore
5. Trocar nas telas a validação local por `loginService` / `registerService`
6. Regras Firestore: só ler/escrever o próprio `users/{uid}`

## O que NÃO fazer ainda

- Não commitar `.env` com chaves reais
- Não salvar senha em texto puro
- Não mudar o fluxo `/ -> /login -> /signup -> /home`
