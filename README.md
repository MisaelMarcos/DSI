# DSI

Aplicativo React Native criado com Expo Router e executado em modo de
desenvolvimento dentro do Docker.

## Tecnologias utilizadas

- **React Native**: criação das telas e dos elementos nativos do aplicativo.
- **Expo**: execução e desenvolvimento do aplicativo sem precisar gerar os
  projetos nativos manualmente.
- **Expo Router**: navegação baseada na estrutura de arquivos dentro de
  `src/app`.
- **TypeScript**: tipagem dos componentes, propriedades e estado.
- **Zustand**: armazenamento global dos dados de usuário e senha.
- **expo-linear-gradient**: fundo em gradiente da landing page.
- **Firebase (preparado, sem SDK)**: contratos em `src/backend/` para o time
  de backend conectar Auth + Firestore depois. Nenhum pacote instalado.
- **Docker**: ambiente padronizado para executar o servidor do Expo.

## Estrutura do projeto

```text
.
├── src/
│   ├── app/
│   │   ├── _layout.tsx       # Configuração geral das rotas
│   │   ├── index.tsx         # Landing, rota /
│   │   ├── login.tsx         # Tela de login, rota /login
│   │   ├── signup.tsx        # Tela de cadastro, rota /signup
│   │   └── home.tsx          # Home provisória, rota /home
│   ├── components/
│   │   ├── button.tsx        # Botão reutilizável (variantes primary/white)
│   │   ├── input.tsx         # Campo de texto reutilizável (prop error)
│   │   └── logo-placeholder.tsx # Logo oficial (src/assets/logo.png)
│   ├── contexts/
│   │   └── authContext.tsx   # Store global do Zustand
│   ├── backend/
│   │   ├── types.ts          # Contratos de auth (sem integração)
│   │   ├── auth.repository.ts # Interface p/ o Firebase implementar
│   │   ├── auth.service.ts   # Validação + usuário provisório admin/admin
│   │   ├── firebase.config.template.ts # Template de config (vazio)
│   │   └── README.md         # Guia para o time de backend
│   ├── theme.ts              # Tokens de cor/raio/espaçamento
│   └── assets/               # img1, img2 e logo.png usadas nas telas
├── docs/
│   └── design-referencias.md # Guia de design travado com o time
├── database/
│   └── conexão.ts            # Ponto inicial para integração com banco
├── scripts/
│   └── start-docker.ps1     # Detecta o IP e inicia o Docker (-Fresh, -HostIp)
├── metro.config.js           # Metro + watcher.healthCheck p/ Docker Windows
├── Dockerfile                # Imagem de desenvolvimento
├── docker-compose.yml        # Serviço do Expo
├── app.json                  # Configuração do Expo
├── package.json              # Dependências e scripts npm
└── tsconfig.json             # Configuração do TypeScript
```

## Como o código funciona

### `src/app/_layout.tsx`

Esse arquivo é o layout raiz do Expo Router. O componente `Stack` registra as
telas encontradas em `src/app` em uma pilha de navegação.

```tsx
<Stack screenOptions={{ headerShown: false }} />
```

`headerShown: false` remove o cabeçalho padrão do Expo Router. As telas ficam
responsáveis pelo próprio conteúdo visual.

### `src/app/index.tsx`: landing page

Esse arquivo representa a rota `/`, que é a primeira tela do aplicativo.

O fundo é um gradiente azul-claro (`LinearGradient` de `#2F6BFF` para
`#CFE4FA`, pacote `expo-linear-gradient`). Sobre ele ficam:

- `LogoPlaceholder`: exibe a logo oficial (`src/assets/logo.png`) dentro de
  um card branco com sombra, para a logo azul não misturar com o fundo.
- Título `AlertaChuva` junto: `Alerta` em branco e `Chuva` em azul.
- Tagline `Informação para você se proteger da chuva` e cidade `Recife`.
- Botão branco `Começar` (`<Button label="Começar" variant="white" />`),
  que navega com `router.push("/login")`.

### `src/app/login.tsx`: tela de login

Esse arquivo representa a rota `/login`.

```tsx
const [inputUsuarioLogin, setUsuarioLogin] = useState("");
const [inputSenhaLogin, setSenhaLogin] = useState("");
const [hasError, setHasError] = useState(false);
```

Os valores são locais ao React. Ao tocar em **Entrar**, `handleSignIn`
chama `loginService` de `@/backend/auth.service`:

1. Com algum campo vazio, o service retorna `ok: false` e a tela exibe o
   alerta de erro.
2. Com usuário/senha diferentes do provisório, retorna
   `Usuário ou senha inválidos.`
3. Com `admin` / `admin` (provisório em código, ver `src/backend`),
   exibe o alerta de sucesso e `router.replace("/home")`.

Em qualquer falha, `hasError` vira `true` e os campos recebem
`error={hasError}`, mostrando a borda vermelha. Ao digitar, o erro limpa.

O link `Cadastre-se` navega para `/signup`.

### Acesso provisório

Enquanto o Firebase não é conectado, o login aceita:

```text
usuário: admin
senha:   admin
```

Definido em `PROVISIONAL_USERS` dentro de `src/backend/auth.service.ts`,
marcado com `TODO(firebase)` para remoção.

### `src/app/signup.tsx`: tela de cadastro

Esse arquivo representa a rota `/signup`.

#### Estado do cadastro

Os valores de usuário e senha são obtidos da store global:

```tsx
const { usuario, senha, setUsuarioLogin, setSenhaLogin } = useAuthStore();
```

Isso permite que esses valores sejam acessados por outros arquivos que também
utilizem `useAuthStore`. O campo de confirmação permanece como estado local,
pois ele serve apenas para validar o cadastro atual:

```tsx
const [inputConfirmarSenhaLogin, setConfirmarSenhaLogin] = useState("");
```

#### Campo de usuário

```tsx
<Input
  placeholder="Usuário"
  autoCapitalize="none"
  error={hasError}
  onChangeText={(text: string) => {
    setUsuarioLogin(text);
    setHasError(false);
  }}
/>
```

Cada texto digitado chama o setter da store e atualiza `usuario` globalmente.

#### Campo de senha

```tsx
<Input
  placeholder="Senha"
  secureTextEntry
  onChangeText={setSenhaLogin}
/>
```

O campo oculta a senha e salva o valor global em `senha`.

#### Campo `Confirmar senha`

```tsx
<Input
  placeholder="Confirmar senha"
  secureTextEntry
  onChangeText={setConfirmarSenhaLogin}
/>
```

Esse valor não é salvo na store. Ele é comparado com `senha` somente quando o
botão de cadastro é pressionado.

#### Botão `Cadastrar`

```tsx
<Button label="Cadastrar" onPress={handleSignUp} />
```

A função `handleSignUp` verifica:

1. Se o usuário não está vazio.
2. Se a senha não está vazia.
3. Se a confirmação de senha não está vazia.
4. Se `senha` e `inputConfirmarSenhaLogin` são iguais.

Se qualquer validação falhar, `hasError` vira `true` (bordas vermelhas nos
campos via `error={hasError}`) e um alerta de erro é exibido. Quando tudo
está correto, o aplicativo mostra o alerta de sucesso e, após o toque em
`OK`, executa `router.replace("/home")`.

#### Link `Entre aqui`

```tsx
<Link href="/login" style={styles.footerLink}>
  Entre aqui
</Link>
```

Esse link retorna para a tela de login.

### `src/app/home.tsx`: home provisória

Essa é a rota `/home`, acessada após login ou cadastro válido. É um template
no estilo Climatempo: cabeçalho `Recife • agora`, card de temperatura,
cards `Hoje / Amanhã / Alertas` (valores `--` mockados) e botão `Sair`,
que volta para `/` com `router.replace("/")`.

```tsx
// TODO(home): trocar cards mock por dados de previsão + alertas do Firebase/API.
```

### `src/components/input.tsx`: componente `Input`

Esse componente encapsula o `TextInput` do React Native para que os campos
tenham o mesmo estilo em todas as telas.

```tsx
type InputProps = TextInputProps & {
  // Quando true, a borda fica vermelha (ex.: erro de validação).
  error?: boolean;
};

export function Input({ error, style, ...rest }: InputProps) {
  return <TextInput style={[styles.input, error && styles.error, style]} {...rest} />;
}
```

`TextInputProps` permite receber propriedades nativas como `placeholder`,
`secureTextEntry` e `onChangeText`. O operador `{...rest}` repassa essas
propriedades ao `TextInput`. A prop `error` alterna para o estilo de borda
vermelha (`#EF4444`).

O estilo aplicado define largura total, altura de `48`, borda, raio dos cantos,
tamanho da fonte e espaçamento interno.

### `src/components/button.tsx`: componente `Button`

Esse componente encapsula o `TouchableOpacity` para padronizar os botões.

```tsx
type ButtonProps = TouchableOpacityProps & {
  label: string;
  // "primary" (padrão): fundo azul, texto branco. "white": fundo branco, texto azul.
  variant?: "primary" | "white";
};
```

O botão aceita todas as propriedades de `TouchableOpacity`, exige `label`
(texto exibido) e aceita `variant` opcional. Sem `variant`, o estilo é o
azul original — por isso login, cadastro e home não mudaram.

```tsx
<TouchableOpacity style={styles.container} activeOpacity={0.7} {...rest}>
  <Text style={styles.label}>{label}</Text>
</TouchableOpacity>
```

`activeOpacity={0.7}` reduz a opacidade durante o toque para dar retorno
visual. A propriedade `onPress` recebida por `{...rest}` define o que acontece
quando o botão é pressionado.

Atualmente os botões usados são:

- **Começar** (landing, variante branca): navega para `/login`.
- **Entrar**: chama `handleSignIn` da tela de login.
- **Cadastrar**: chama `handleSignUp` da tela de cadastro.
- **Sair** (home): volta para `/`.
- **OK** nos alertas de sucesso: navega para `/home`.

### `src/contexts/authContext.tsx`: store Zustand

Esse arquivo cria a store global de autenticação:

```tsx
type AuthState = {
  usuario: string;
  senha: string;
  setUsuarioLogin: (texto: string) => void;
  setSenhaLogin: (texto: string) => void;
};
```

A store possui:

- `usuario`: nome de usuário armazenado.
- `senha`: senha armazenada.
- `setUsuarioLogin`: atualiza `usuario`.
- `setSenhaLogin`: atualiza `senha`.

Dentro de componentes React, os dados podem ser acessados assim:

```tsx
const { usuario, senha } = useAuthStore();
```

Em um arquivo que não é componente, é possível ler o estado atual assim:

```tsx
const { usuario, senha } = useAuthStore.getState();
```

Essa store mantém os valores enquanto a aplicação está aberta, mas não salva
os dados permanentemente no dispositivo.

### `database/conexão.ts`

Esse arquivo é o ponto inicial planejado para uma integração com banco de
dados. Ele lê os valores atuais da store e os exporta:

```tsx
const { usuario, senha } = useAuthStore.getState();

export { usuario, senha };
```

Ele ainda não abre conexão, cria tabela, salva usuário nem consulta senha. Além
disso, como a leitura é feita no carregamento do módulo, as constantes não são
atualizadas automaticamente quando a store muda. O contrato novo para o
Firebase está em `src/backend/` (abaixo).

### `src/backend/`: auth pronta para o Firebase (sem integração)

Pasta deixada pronta para os outros desenvolvedores. Nenhum SDK instalado.

- `types.ts`: `UserCredentials`, `RegisterInput`, `AuthResult`, `UserRecord`.
- `auth.repository.ts`: interface `AuthRepository` (`login`, `register`,
  `logout`) para o backend implementar com Firebase Auth + Firestore.
- `auth.service.ts`: usado pela tela de login. Hoje valida localmente e
  aceita o provisório `admin`/`admin` (`PROVISIONAL_USERS`, com
  `TODO(firebase)` para remoção). Pontos `TODO(firebase)` marcam a troca.
- `firebase.config.template.ts`: objeto de config vazio (sem ler `.env`
  ainda, para o `tsc` passar sem `@types/node`).
- `README.md`: schema sugerido da coleção `users`
  (`username` único, `passwordHash` nunca em texto puro, `createdAt`) e passo
  a passo para o time de backend.

### `src/theme.ts`, logo e `metro.config.js`

- `src/theme.ts`: tokens travados (`background`, `primary #3366FF`, raios,
  espaçamentos). Ver `docs/design-referencias.md`.
- `src/components/logo-placeholder.tsx`: exibe `src/assets/logo.png`
  (copiada de `assets/images/`), aceitando `size?`.
- `metro.config.js`: estende a config do Expo e ativa
  `watcher.healthCheck` como rede de segurança do watcher no Docker Windows.
- `docs/design-referencias.md`: guia de design travado com o time
  (referências Climatempo/Tempo iOS, tokens, mapa de telas e de assets).

### Imagens em `src/assets`

- `logo.png`: logo oficial, usada na landing via `LogoPlaceholder`.
- `img1.png`: ilustração usada na tela de login.
- `img2.png`: ilustração usada na tela de cadastro.

As imagens são carregadas com `require` e exibidas pelo componente `Image`.
`img1/img2` têm fundo branco chapado, por isso login/cadastro usam fundo
`#FFFFFF`; a home (sem imagens) usa `#F2F6FF` para contraste dos cards.

### Layout e teclado

As telas de login e cadastro usam três containers principais:

- `KeyboardAvoidingView`: ajusta a tela quando o teclado aparece. Usa
  `padding` no iOS e `height` no Android.
- `ScrollView`: permite rolagem em telas pequenas e mantém os toques nos
  campos com `keyboardShouldPersistTaps="handled"`.
- `View`: organiza o conteúdo visual da tela.

Os estilos são definidos com `StyleSheet.create`, mantendo cores, tamanhos,
espaçamentos e alinhamentos separados da estrutura JSX.

## Fluxo completo de interação

1. O aplicativo inicia na landing `/`, com logo, nome e botão **Começar**.
2. Ao tocar em **Começar**, o usuário vai para `/login`.
3. No login, preenche usuário e senha e toca em **Entrar**.
4. Com `admin` / `admin`, aparece o alerta de sucesso; em **OK**, vai para
   `/home`. Com erro, os campos ficam com borda vermelha.
5. Se não tem conta, toca em **Cadastre-se** e vai para `/signup`.
6. No cadastro, usuário e senha vão para o Zustand; a confirmação é local.
7. Com dados válidos, alerta de sucesso e **OK** leva para `/home`.

## Limitações atuais

- O login aceita só o provisório `admin` / `admin` em código (sem banco).
- O cadastro não salva dados em um banco.
- A senha fica apenas em memória enquanto o aplicativo está aberto.
- A home é um template com valores mockados (`--`).
- `database/conexão.ts` ainda não possui uma conexão real com banco de dados.
- Firebase não instalado: só contratos em `src/backend/` + `TODO(firebase)`.

## Arquivos de configuração

### `package.json`

Esse arquivo identifica o projeto, lista as dependências e define os comandos
disponíveis:

- `npm start`: inicia o Expo diretamente no computador.
- `npm run android`: inicia o Expo com a opção de Android.
- `npm run ios`: inicia o Expo com a opção de iOS.
- `npm run web`: inicia a versão web do projeto.
- `npm run docker`: executa o script que detecta o IP e inicia o Docker Compose.
- `npm run docker:fresh`: limpa os caches do Metro, recria os containers e
  sobe tudo (fluxo oficial quando o celular mostra bundle antigo).

As dependências principais são `expo`, `expo-router`, `react-native`,
`expo-linear-gradient` e `zustand`. O `package-lock.json` registra as versões
exatas instaladas pelo `npm ci` durante o build da imagem Docker.

### `app.json`

Esse arquivo contém as configurações do Expo:

- Nome, slug, versão e orientação do aplicativo.
- Ícone e ícones adaptativos do Android.
- Esquema `aplicativo` para links profundos.
- Configuração da splash screen.
- Expo Router como plugin de navegação.
- Metro como bundler da versão web.
- Rotas tipadas ativadas com `experiments.typedRoutes`.

### `tsconfig.json`

Estende a configuração padrão do Expo e mantém o modo estrito do TypeScript
ativado. O alias abaixo permite importar arquivos a partir de `src` sem usar
caminhos relativos longos:

```tsx
import { Button } from "@/components/button";
```

Nesse exemplo, `@/components/button` representa
`src/components/button.tsx`.

### `Dockerfile`

O `Dockerfile` cria a imagem de desenvolvimento seguindo estas etapas:

1. Usa a imagem `node:22-bookworm-slim`.
2. Define `/app` como diretório de trabalho.
3. Copia `package.json` e `package-lock.json`.
4. Executa `npm ci` para instalar as dependências de forma reproduzível.
5. Copia os arquivos do projeto para dentro da imagem.
6. Expõe a porta `8081`, usada pelo Metro/Expo.
7. Inicia `npx expo start --host lan`.

### `docker-compose.yml`

Esse arquivo define o serviço `expo`:

- Constrói a imagem usando o `Dockerfile`.
- Publica a porta `8081` do container no computador.
- Monta o código local em `/app` para permitir hot reload.
- Mantém `node_modules` em um volume Docker separado.
- Usa `REACT_NATIVE_PACKAGER_HOSTNAME` para o QR Code apontar para o IP do
  computador.
- Ativa polling para detectar alterações de arquivos em volumes do Docker
  Desktop no Windows.
- Mantém o terminal interativo para exibir o QR Code do Expo.

O Compose exige um valor para `REACT_NATIVE_PACKAGER_HOSTNAME`. Isso evita que
o projeto gere acidentalmente um QR Code com `127.0.0.1`, endereço que não pode
ser acessado pelo celular.

### `scripts/start-docker.ps1`

Esse script é o inicializador recomendado no Windows. Ele procura uma
interface de rede ativa com gateway padrão, seleciona o IPv4 dessa interface e
define a variável usada pelo Compose. Depois, executa:

```powershell
docker compose up --build
```

O parâmetro opcional `-HostIp` permite escolher manualmente o endereço quando
há VPN, Ethernet e Wi-Fi ativos ao mesmo tempo. O switch `-Fresh` executa o
fluxo `docker:fresh` (limpa caches do Metro e recria os containers):

```powershell
.\scripts\start-docker.ps1 -Fresh
```

### `.dockerignore`, `.env.example` e `.gitignore`

- `.dockerignore`: evita enviar `node_modules`, cache do Expo, arquivos nativos
  gerados e configurações locais para o contexto do Docker.
- `.env.example`: mostra o formato da variável de IP para execução manual e
  traz o bloco comentado `EXPO_PUBLIC_FIREBASE_*` (template para o backend).
- `.gitignore`: impede que dependências, caches, arquivos `.env` e credenciais
  nativas sejam versionados (inclui `.metro-health-check*`).

## Pré-requisitos

- Docker Desktop instalado e aberto.
- Docker Compose disponível no Docker Desktop.
- Android com o aplicativo Expo Go instalado.
- Computador e celular conectados à mesma rede Wi-Fi.

## Iniciar o projeto

Abra o PowerShell na raiz do projeto e execute:

```powershell
npm run docker
```

Esse comando executa `scripts/start-docker.ps1`, que:

- Detecta automaticamente o IPv4 da interface de rede ativa.
- Ignora o endereço de loopback e os endereços do Docker.
- Define `REACT_NATIVE_PACKAGER_HOSTNAME` com o IP encontrado.
- Executa `docker compose up --build`.

O Expo será iniciado no container em modo LAN e exibirá o QR Code no
terminal. O Docker reutiliza o cache do build; a imagem só será reconstruída
de fato quando houver alterações no `Dockerfile`, no `package.json` ou no
`package-lock.json`.

Se o PowerShell bloquear a execução do script, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-docker.ps1
```

Também é possível executar o script diretamente:

```powershell
.\scripts\start-docker.ps1
```

## Acessar pelo Android Expo Go

1. Deixe o comando `npm run docker` em execução.
2. Aguarde o Expo exibir o QR Code no terminal.
3. Abra o Expo Go no Android.
4. Toque em **Scan QR code**.
5. Escaneie o QR Code fornecido pelo próprio Expo.

Não é necessário digitar a URL manualmente. O QR Code usará o IPv4 detectado
do computador e a porta `8081` publicada pelo Docker.

## IP manual

Em computadores com VPN ou mais de uma rede ativa, o script pode escolher a
interface errada. Nesse caso, informe o IPv4 manualmente:

```powershell
npm run docker -- -HostIp 192.168.1.100
```

Ou execute diretamente:

```powershell
.\scripts\start-docker.ps1 -HostIp 192.168.1.100
```

Para descobrir o IPv4 no Windows, execute `ipconfig` e use o endereço do
adaptador Wi-Fi ou Ethernet em uso. Não use o endereço do adaptador Docker,
normalmente iniciado por `172.`.

## Execução manual do Compose

O Compose exige que `REACT_NATIVE_PACKAGER_HOSTNAME` esteja definido para não
gerar um QR Code apontando para `127.0.0.1`. Para configurar manualmente:

```powershell
Copy-Item .env.example .env
```

Edite o arquivo `.env` e informe o IPv4 do computador:

```env
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100
```

Depois execute:

```powershell
docker compose up --build
```

Para parar o container, pressione `Ctrl+C` ou execute em outro terminal:

```powershell
docker compose down
```

## Problemas comuns

### `required variable REACT_NATIVE_PACKAGER_HOSTNAME is missing`

O Compose foi executado diretamente sem definir o IP. Use o comando automático:

```powershell
npm run docker
```

Ou configure o arquivo `.env` conforme explicado na seção de execução manual.

### `packager is not running at 127.0.0.1:8081`

O QR Code está apontando para o loopback. Pare o container e inicie usando:

```powershell
docker compose down
npm run docker
```

### O QR Code é lido, mas o projeto não abre

- Confirme que o celular e o computador estão na mesma rede Wi-Fi.
- Permita conexões de entrada na porta TCP `8081` no Firewall do Windows.
- Desative temporariamente VPN ou redes Wi-Fi convidadas.
- Confirme que o IP usado pertence ao computador, não ao Docker.
- Verifique se o Docker Desktop está aberto e com o Linux Engine em execução.

### O Docker daemon não está em execução

Abra o Docker Desktop, aguarde o Linux Engine iniciar e execute novamente:

```powershell
npm run docker
```

### Salvou o arquivo e o celular não atualizou (hot reload no Docker)

Causa comprovada aqui: no Docker Desktop (Windows), escritas feitas no
Windows não geram eventos de filesystem dentro do container (testado com
`fs.watch` no container: zero eventos ao salvar). Sem o evento, o Metro não
sabe que o arquivo mudou e continua servindo o bundle antigo.
`CHOKIDAR_USEPOLLING` não cobre o watcher do Metro.

O que fazer:

- Fluxo oficial neste repo quando travar (bundle antigo no celular):

```powershell
npm run docker:fresh
```

Ele limpa os caches do Metro, recria os containers e sobe tudo de novo.
O primeiro bundle demora mais porque é montado do zero — é o único caminho
100% determinístico neste ambiente.
- O `npm run docker` normal continua existindo e inalterado, mas pode
  servir bundle velho após edições (limitação do watcher, acima).
- Alternativa: rodar o Expo fora do Docker (`npx expo start --host lan`).
  No Windows os eventos de arquivo são nativos e o Fast Refresh é
  instantâneo. Isso não altera nada do Docker.

Detalhe técnico: `metro.config.js` mantém `watcher.healthCheck` ativado como
rede de segurança contra watchers totalmente mortos. Ele não cobre o caso
acima, onde o watcher funciona mas não enxerga escritas vindas do Windows.

## Verificar o TypeScript

Com o container em execução:

```powershell
docker compose exec expo npx tsc --noEmit
```
