# Dados de clima — Recife

Esta pasta guarda as bases usadas pelo modelo de previsão de chuva. O alvo
(chuva observada) vem do INMET; o Open-Meteo entra apenas como fonte de
features atmosféricas.

## Arquivos versionados

### `recife_inmet_2019_2020.csv`

- **Fonte**: INMET — estação automática **A301 (Recife/PE)**, dados horários
  de 2019 e 2020.
- **Formato original**: CSV em `latin1`, separado por vírgula, decimal com
  vírgula e coluna `datetime` em UTC.
- **Conteúdo**: 17.544 linhas horárias, de `2019-01-01 00:00 UTC` a
  `2020-12-31 23:00 UTC`, 20 colunas (precipitação, pressão, temperaturas,
  umidade, vento e horário).
- **Uso no projeto**: chuva observada, alvos de 2h/3h e features de
  persistência (lags, acumulados, tendência de pressão/umidade).
- **Observações**: vento tem cerca de 66% de nulos no período e não entra
  nas features do INMET; a precipitação ausente é tratada como 0 na série
  limpa, preservando o valor bruto para auditoria.
- **Download**: os ZIPs anuais ficam em
  `https://portal.inmet.gov.br/uploads/dadoshistoricos/{ano}.zip`.
  O CSV foi consolidado a partir dos arquivos de 2019 e 2020.

### `open_meteo_recife_2019_2020.csv`

- **Fonte**: Open-Meteo Historical Weather API
  (`https://archive-api.open-meteo.com/v1/archive`), coordenadas
  aproximadas de Recife (`-8.0476`, `-34.877`).
- **Conteúdo**: 17.544 linhas horárias, 15 colunas: temperatura, umidade,
  ponto de orvalho, pressão, precipitação, vento/rajada/direção, cobertura
  de nuvens (total/baixa/média/alta), radiação de onda curta e altura da
  camada limite.
- **Uso no projeto**: features de contexto atmosférico para o classificador.
  A chuva observada e os alvos continuam vindo do INMET.
- **Geração**: `python baixar_open_meteo.py` (a partir de
  `src/backend/ml`). O arquivo versionado evita depender da rede no treino.
- **Licença**: dados Open-Meteo sob **CC BY 4.0**; atribuição obrigatória.
  O plano gratuito é para uso não comercial (ver termos do Open-Meteo).
- **Limitação**: CAPE, CIN e lifted index não estão disponíveis para
  Recife/2019–2020 nessa API; por isso não foram usados.

## Arquivo gerado em runtime (não versionado)

### `observacoes_inmet_a301.csv`

- Gerado por `src/backend/ml/collect_inmet.py`.
- Guarda a observação horária mais recente do INMET A301 e as features
  atuais do Open-Meteo, além de `fonte` e `om_disponivel`.
- É ignorado pelo Git (`dados/clima/observacoes_*.csv`) porque é um buffer
  local que cresce com o coletor.
- O `predict.py` exige pelo menos 24 observações horárias para montar lags
  e acumulados com estabilidade.

## Cuidados

- Não colocar credenciais, service account ou chaves nesta pasta.
- O repositório é público; os CSVs acima não contêm dados pessoais.
- Se atualizar as bases, mantenha o mesmo esquema de colunas e registre a
  data da coleta no log do treino.
