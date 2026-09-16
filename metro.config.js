// Config customizada do Metro — ver https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Docker Desktop no Windows: pastas montadas (bind mounts) nem sempre emitem
// eventos de filesystem para dentro do container. Sem esses eventos, o watcher
// do Metro não percebe arquivos salvos e o celular continua recebendo o bundle
// antigo (CHOKIDAR_USEPOLLING não cobre o watcher do Metro).
// O health check escreve um arquivo temporário de tempos em tempos e, se o
// watcher não observar a mudança dentro do timeout, o Metro refaz o crawl e
// se cura sozinho (~25s no pior caso). Não commitar os temporários (gitignore).
config.watcher = {
  ...(config.watcher || {}),
  healthCheck: {
    enabled: true,
    interval: 15000,
    timeout: 10000,
    filePrefix: ".metro-health-check",
  },
};

module.exports = config;
