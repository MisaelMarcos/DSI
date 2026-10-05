# Plano — integração com o repositório de ML

## Arquitetura

- **Repo do ML**: dados de clima (`data/`), treinamento, modelo serializado
  e API FastAPI (`POST /prever`), rodando local com `uvicorn` na porta 8000.
- **Este repo**: coleta de ocorrências de alagamento, score de risco por
  bairro (`score_bairro.csv`), pipeline que consome a API do ML e decide o
  alerta.
- **Comunicação**: HTTP/JSON, acoplamento fraco. Se a API estiver fora, o
  pipeline aqui degrada com mensagem clara.

## O que o modelo responde

`POST /prever` com features de ambiente (umidade, vento, etc.) →
`{"nivel": "forte"}`. Previsão única para Recife (sem localização).
A distinção por bairro/endereço vem do nosso `score_risco`.

## Regra de alerta

| Chuva (ML) | Risco do bairro | Decisão |
|---|---|---|
| forte/moderada | alto | ALERTA de alagamento |
| forte/moderada | médio | ATENÇÃO |
| fraca/sem chuva | qualquer | só info de chuva |

## Tarefas neste repo

1. `pipeline/consultar_previsao.py` — cliente HTTP da API (URL via `.env`)
2. `pipeline/verificar_alerta.py` — endereço → geocode → bairro mais próximo
   em `bairros_geo.csv` → `score_bairro.csv` → API do ML → regra → decisão
3. `.env.example` com `ML_API_URL=http://localhost:8000`
4. README documentando o contrato e como subir a API do ML
5. Opcional: serviço `ml-api` no `docker-compose.yml`

## Tarefas no repo do ML

1. `src/treinar.py` — treina classificador multiclasse de nível de chuva a
   partir do CSV em `data/` e salva o modelo
2. `src/api.py` — FastAPI com `POST /prever` servindo o modelo

## Execução local

```powershell
# janela 1 (repo do ML)
uvicorn api:app --port 8000

# janela 2 (este repo)
py src/backend/pipeline/verificar_alerta.py "Boa Viagem, Recife"
```
