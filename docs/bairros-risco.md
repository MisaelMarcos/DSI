# Relatório de bairros — risco de alagamento (Recife)

Gerado automaticamente por `src/backend/pipeline/gerar_relatorio.py` a partir
de `ocorrencias.csv`, `bairros_geo.csv` e `score_bairro.csv`.

## Método

- Ocorrências coletadas de Google News RSS, GDELT e Bing News (tipo `noticia`)
  e menções a INMET/Defesa Civil PE (tipo `alerta_oficial`).
- Peso por ocorrência: fonte oficial 2×, notícia 1×; recência: ≥2024 = 1,5×,
  ≥2020 = 1×, anterior = 0,5×.
- `score_freq` = frequência ponderada normalizada 0–100.
- `elevacao_m` = altitude do centróide do bairro (Open-Meteo/SRTM); mais baixo,
  maior o `score_elev`.
- `score_risco` = 0,6·score_freq + 0,4·score_elev. Faixas: ≤33 baixo,
  34–66 médio, >66 alto.

## Bairros

| Bairro | Freq. ponderada | Elevação (m) | Score freq | Score elev | Score risco | Nível | Decisão |
|---|---|---|---|---|---|---|---|
| Afogados | 92.5 | 4.0 | 100.0 | 96.1 | 98.4 | alto | ALERTA se chuva ≥ limiar |
| Boa Viagem | 83.5 | 6.0 | 90.3 | 94.1 | 91.8 | alto | ALERTA se chuva ≥ limiar |
| São José | 47.5 | 6.0 | 51.4 | 94.1 | 68.5 | alto | ALERTA se chuva ≥ limiar |
| Imbiribeira | 14.0 | 5.0 | 15.1 | 95.1 | 47.1 | medio | ATENÇÃO se chuva forte |
| Ibura | 14.5 | 7.0 | 15.7 | 93.1 | 46.7 | medio | ATENÇÃO se chuva forte |
| Santana | 13.0 | 10.0 | 14.1 | 90.2 | 44.5 | medio | ATENÇÃO se chuva forte |
| Boa Vista | 10.0 | 9.0 | 10.8 | 91.2 | 43.0 | medio | ATENÇÃO se chuva forte |
| Jardim São Paulo | 6.5 | 6.0 | 7.0 | 94.1 | 41.8 | medio | ATENÇÃO se chuva forte |
| Ipsep | 5.0 | 4.0 | 5.4 | 96.1 | 41.7 | medio | ATENÇÃO se chuva forte |
| Beberibe | 11.0 | 15.0 | 11.9 | 85.3 | 41.3 | medio | ATENÇÃO se chuva forte |
| Ilha do Retiro | 5.5 | 6.0 | 5.9 | 94.1 | 41.2 | medio | ATENÇÃO se chuva forte |
| Jiquiá | 3.5 | 3.0 | 3.8 | 97.1 | 41.1 | medio | ATENÇÃO se chuva forte |
| Campo Grande | 4.5 | 5.0 | 4.9 | 95.1 | 41.0 | medio | ATENÇÃO se chuva forte |
| Derby | 5.5 | 7.0 | 5.9 | 93.1 | 40.8 | medio | ATENÇÃO se chuva forte |
| Santo Amaro | 3.0 | 3.0 | 3.2 | 97.1 | 40.8 | medio | ATENÇÃO se chuva forte |
| San Martin | 4.5 | 6.0 | 4.9 | 94.1 | 40.6 | medio | ATENÇÃO se chuva forte |
| Iputinga | 4.5 | 7.0 | 4.9 | 93.1 | 40.2 | medio | ATENÇÃO se chuva forte |
| Coelhos | 2.5 | 4.0 | 2.7 | 96.1 | 40.1 | medio | ATENÇÃO se chuva forte |
| Estância | 2.5 | 5.0 | 2.7 | 95.1 | 39.7 | medio | ATENÇÃO se chuva forte |
| Areias | 6.0 | 11.0 | 6.5 | 89.2 | 39.6 | medio | ATENÇÃO se chuva forte |
| Peixinhos | 3.0 | 6.0 | 3.2 | 94.1 | 39.6 | medio | ATENÇÃO se chuva forte |
| Santo Antônio | 3.0 | 6.0 | 3.2 | 94.1 | 39.6 | medio | ATENÇÃO se chuva forte |
| Cordeiro | 4.0 | 8.0 | 4.3 | 92.2 | 39.5 | medio | ATENÇÃO se chuva forte |
| Ilha do Leite | 1.5 | 4.0 | 1.6 | 96.1 | 39.4 | medio | ATENÇÃO se chuva forte |
| Cabanga | 2.0 | 5.0 | 2.2 | 95.1 | 39.4 | medio | ATENÇÃO se chuva forte |
| Dois Unidos | 33.0 | 57.0 | 35.7 | 44.1 | 39.1 | medio | ATENÇÃO se chuva forte |
| Cais de Santa Rita | 1.5 | 5.0 | 1.6 | 95.1 | 39.0 | medio | ATENÇÃO se chuva forte |
| Mangueira | 1.5 | 5.0 | 1.6 | 95.1 | 39.0 | medio | ATENÇÃO se chuva forte |
| Encruzilhada | 2.0 | 6.0 | 2.2 | 94.1 | 39.0 | medio | ATENÇÃO se chuva forte |
| Torreão | 1.5 | 6.0 | 1.6 | 94.1 | 38.6 | medio | ATENÇÃO se chuva forte |
| Graças | 4.5 | 11.0 | 4.9 | 89.2 | 38.6 | medio | ATENÇÃO se chuva forte |
| Coqueiral | 5.5 | 13.0 | 5.9 | 87.3 | 38.5 | medio | ATENÇÃO se chuva forte |
| Jaqueira | 5.0 | 12.0 | 5.4 | 88.2 | 38.5 | medio | ATENÇÃO se chuva forte |
| Madalena | 1.5 | 7.0 | 1.6 | 93.1 | 38.2 | medio | ATENÇÃO se chuva forte |
| Campina do Barreto | 1.5 | 7.0 | 1.6 | 93.1 | 38.2 | medio | ATENÇÃO se chuva forte |
| Casa Forte | 2.0 | 11.0 | 2.2 | 89.2 | 37.0 | medio | ATENÇÃO se chuva forte |
| Tejipió | 6.0 | 18.0 | 6.5 | 82.4 | 36.9 | medio | ATENÇÃO se chuva forte |
| Pina | 0.5 | 9.0 | 0.5 | 91.2 | 36.8 | medio | ATENÇÃO se chuva forte |
| Cajueiro | 13.0 | 32.0 | 14.1 | 68.6 | 35.9 | medio | ATENÇÃO se chuva forte |
| Tamarineira | 1.5 | 14.0 | 1.6 | 86.3 | 35.5 | medio | ATENÇÃO se chuva forte |
| Casa Amarela | 2.0 | 16.0 | 2.2 | 84.3 | 35.0 | medio | ATENÇÃO se chuva forte |
| Curado | 4.5 | 25.0 | 4.9 | 75.5 | 33.1 | medio | ATENÇÃO se chuva forte |
| Córrego do Jenipapo | 3.0 | 23.0 | 3.2 | 77.5 | 32.9 | baixo | só info de chuva |
| Guabiraba | 48.0 | 101.0 | 51.9 | 1.0 | 31.5 | baixo | só info de chuva |
| Linha do Tiro | 1.5 | 25.0 | 1.6 | 75.5 | 31.2 | baixo | só info de chuva |
| Jordão | 5.0 | 38.0 | 5.4 | 62.7 | 28.3 | baixo | só info de chuva |
| Água Fria | 4.0 | 37.0 | 4.3 | 63.7 | 28.1 | baixo | só info de chuva |
| Passarinho | 4.5 | 43.0 | 4.9 | 57.8 | 26.1 | baixo | só info de chuva |
| Várzea | 5.5 | 47.0 | 5.9 | 53.9 | 25.1 | baixo | só info de chuva |
| Dois Irmãos | 3.0 | 50.0 | 3.2 | 51.0 | 22.3 | baixo | só info de chuva |
| Nova Descoberta | 3.0 | 57.0 | 3.2 | 44.1 | 19.6 | baixo | só info de chuva |
| Alto Santa Terezinha | 1.5 | 58.0 | 1.6 | 43.1 | 18.2 | baixo | só info de chuva |
| Tabajara | 1.5 | nan | 1.6 | 1.0 | 1.4 | baixo | só info de chuva |

## Fontes por bairro

- **Afogados**: notícia: 26, alerta oficial: 20
- **Alto Santa Terezinha**: notícia: 1, alerta oficial: 0
- **Areias**: notícia: 5, alerta oficial: 0
- **Beberibe**: notícia: 8, alerta oficial: 0
- **Boa Viagem**: notícia: 28, alerta oficial: 15
- **Boa Vista**: notícia: 7, alerta oficial: 1
- **Cabanga**: notícia: 2, alerta oficial: 0
- **Cais de Santa Rita**: notícia: 1, alerta oficial: 0
- **Cajueiro**: notícia: 7, alerta oficial: 1
- **Campina do Barreto**: notícia: 1, alerta oficial: 0
- **Campo Grande**: notícia: 1, alerta oficial: 1
- **Casa Amarela**: notícia: 2, alerta oficial: 0
- **Casa Forte**: notícia: 2, alerta oficial: 0
- **Coelhos**: notícia: 1, alerta oficial: 1
- **Coqueiral**: notícia: 2, alerta oficial: 1
- **Cordeiro**: notícia: 2, alerta oficial: 1
- **Curado**: notícia: 2, alerta oficial: 1
- **Córrego do Jenipapo**: notícia: 1, alerta oficial: 1
- **Derby**: notícia: 2, alerta oficial: 1
- **Dois Irmãos**: notícia: 0, alerta oficial: 1
- **Dois Unidos**: notícia: 21, alerta oficial: 1
- **Encruzilhada**: notícia: 2, alerta oficial: 0
- **Estância**: notícia: 2, alerta oficial: 0
- **Graças**: notícia: 1, alerta oficial: 1
- **Guabiraba**: notícia: 4, alerta oficial: 15
- **Ibura**: notícia: 7, alerta oficial: 2
- **Ilha do Leite**: notícia: 1, alerta oficial: 0
- **Ilha do Retiro**: notícia: 4, alerta oficial: 0
- **Imbiribeira**: notícia: 10, alerta oficial: 0
- **Ipsep**: notícia: 0, alerta oficial: 2
- **Iputinga**: notícia: 3, alerta oficial: 0
- **Jaqueira**: notícia: 2, alerta oficial: 1
- **Jardim São Paulo**: notícia: 4, alerta oficial: 1
- **Jiquiá**: notícia: 3, alerta oficial: 0
- **Jordão**: notícia: 2, alerta oficial: 1
- **Linha do Tiro**: notícia: 1, alerta oficial: 0
- **Madalena**: notícia: 1, alerta oficial: 0
- **Mangueira**: notícia: 1, alerta oficial: 0
- **Nova Descoberta**: notícia: 2, alerta oficial: 0
- **Passarinho**: notícia: 3, alerta oficial: 1
- **Peixinhos**: notícia: 2, alerta oficial: 0
- **Pina**: notícia: 1, alerta oficial: 0
- **San Martin**: notícia: 3, alerta oficial: 0
- **Santana**: notícia: 1, alerta oficial: 4
- **Santo Amaro**: notícia: 0, alerta oficial: 1
- **Santo Antônio**: notícia: 0, alerta oficial: 1
- **São José**: notícia: 16, alerta oficial: 8
- **Tabajara**: notícia: 1, alerta oficial: 0
- **Tamarineira**: notícia: 1, alerta oficial: 0
- **Tejipió**: notícia: 2, alerta oficial: 1
- **Torreão**: notícia: 1, alerta oficial: 0
- **Várzea**: notícia: 3, alerta oficial: 1
- **Água Fria**: notícia: 3, alerta oficial: 0

## Regra de alerta no app

1. Usuário cadastra endereço → bairro pelo centróide mais próximo.
2. ML prevê chuva para o bairro.
3. Nível alto E chuva ≥ limiar → alerta de alagamento; médio E chuva forte →
   atenção; baixo → apenas informação de chuva.
