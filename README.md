# DSI

Aplicativo React Native criado com Expo Router e executado em modo de
desenvolvimento dentro do Docker.

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

## Verificar o TypeScript

Com o container em execução:

```powershell
docker compose exec expo npx tsc --noEmit
```
