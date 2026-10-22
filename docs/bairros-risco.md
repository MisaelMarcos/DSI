# Relatório de bairros — risco de alagamento (Recife)

Gerado automaticamente por `src/backend/pipeline/gerar_relatorio.py` a partir
de `ocorrencias.csv`, `bairros_geo.csv` e `score_bairro.csv`.

## Método

- Ocorrências coletadas de Google News RSS, GDELT e Bing News (tipo `noticia`)
  e menções a INMET/Defesa Civil PE (tipo `alerta_oficial`).
- Lista canônica: 94 bairros oficiais (Lei Municipal 16.293/1997).
- Peso por ocorrência: fonte oficial 2×, notícia 1×; recência: ≥2024 = 1,5×,
  ≥2020 = 1×, anterior = 0,5×.
- `score_freq` = frequência ponderada normalizada 0–100 entre os bairros com
  ocorrências.
- `elevacao_m` = altitude do centróide do bairro (Open-Meteo/SRTM); mais baixo,
  maior o `score_elev`.
- `score_risco` = 0,6·score_freq + 0,4·score_elev. Faixas: ≤33 baixo,
  34–66 médio, >66 alto.
- Bairros sem ocorrências ficam com `nivel = sem_historico`; neles o score usa
  apenas a elevação e não é apresentado como risco no app.

## Bairros

| Bairro | Ocorrências | Freq. ponderada | Elevação (m) | Score freq | Score elev | Score risco | Nível | Decisão |
|---|---|---|---|---|---|---|---|---|
| Afogados | 46 | 92.5 | 4.0 | 100.0 | 96.2 | 98.5 | alto | ALERTA se chuva ≥ limiar |
| Boa Viagem | 39 | 78.5 | 6.0 | 84.9 | 94.3 | 88.7 | alto | ALERTA se chuva ≥ limiar |
| São José | 23 | 46.0 | 6.0 | 49.7 | 94.3 | 67.5 | alto | ALERTA se chuva ≥ limiar |
| Caxangá | 15 | 21.0 | 10.0 | 22.7 | 90.5 | 49.8 | medio | ATENÇÃO se chuva forte |
| Imbiribeira | 9 | 13.5 | 5.0 | 14.6 | 95.2 | 46.8 | medio | ATENÇÃO se chuva forte |
| Beberibe | 13 | 18.5 | 15.0 | 20.0 | 85.7 | 46.3 | medio | ATENÇÃO se chuva forte |
| Arruda | 7 | 10.5 | 7.0 | 11.4 | 93.3 | 44.2 | medio | ATENÇÃO se chuva forte |
| Santana | 4 | 12.0 | 10.0 | 13.0 | 90.5 | 44.0 | medio | ATENÇÃO se chuva forte |
| Ibura | 6 | 10.0 | 7.0 | 10.8 | 93.3 | 43.8 | medio | ATENÇÃO se chuva forte |
| Boa Vista | 8 | 10.0 | 9.0 | 10.8 | 91.4 | 43.0 | medio | ATENÇÃO se chuva forte |
| Jardim São Paulo | 5 | 6.5 | 6.0 | 7.0 | 94.3 | 41.9 | medio | ATENÇÃO se chuva forte |
| Ipsep | 2 | 5.0 | 4.0 | 5.4 | 96.2 | 41.7 | medio | ATENÇÃO se chuva forte |
| Barro | 5 | 6.0 | 6.0 | 6.5 | 94.3 | 41.6 | medio | ATENÇÃO se chuva forte |
| Jiquiá | 3 | 3.5 | 3.0 | 3.8 | 97.1 | 41.1 | medio | ATENÇÃO se chuva forte |
| Campo Grande | 2 | 4.5 | 5.0 | 4.9 | 95.2 | 41.0 | medio | ATENÇÃO se chuva forte |
| Santo Amaro | 1 | 3.0 | 3.0 | 3.2 | 97.1 | 40.8 | medio | ATENÇÃO se chuva forte |
| Derby | 2 | 4.5 | 7.0 | 4.9 | 93.3 | 40.3 | medio | ATENÇÃO se chuva forte |
| Areias | 5 | 6.0 | 11.0 | 6.5 | 89.5 | 39.7 | medio | ATENÇÃO se chuva forte |
| Estância | 2 | 2.5 | 5.0 | 2.7 | 95.2 | 39.7 | medio | ATENÇÃO se chuva forte |
| Santo Antônio | 1 | 3.0 | 6.0 | 3.2 | 94.3 | 39.6 | medio | ATENÇÃO se chuva forte |
| Cabanga | 2 | 2.0 | 5.0 | 2.2 | 95.2 | 39.4 | medio | ATENÇÃO se chuva forte |
| Ilha do Leite | 1 | 1.5 | 4.0 | 1.6 | 96.2 | 39.4 | medio | ATENÇÃO se chuva forte |
| Ilha do Retiro | 2 | 2.5 | 6.0 | 2.7 | 94.3 | 39.3 | medio | ATENÇÃO se chuva forte |
| Iputinga | 2 | 3.0 | 7.0 | 3.2 | 93.3 | 39.2 | medio | ATENÇÃO se chuva forte |
| Coelhos | 1 | 1.0 | 4.0 | 1.1 | 96.2 | 39.1 | medio | ATENÇÃO se chuva forte |
| Mangueira | 1 | 1.5 | 5.0 | 1.6 | 95.2 | 39.0 | medio | ATENÇÃO se chuva forte |
| Graças | 2 | 4.5 | 11.0 | 4.9 | 89.5 | 38.7 | medio | ATENÇÃO se chuva forte |
| Jaqueira | 3 | 5.0 | 12.0 | 5.4 | 88.6 | 38.7 | medio | ATENÇÃO se chuva forte |
| Peixinhos | 1 | 1.5 | 6.0 | 1.6 | 94.3 | 38.7 | medio | ATENÇÃO se chuva forte |
| San Martin | 1 | 1.5 | 6.0 | 1.6 | 94.3 | 38.7 | medio | ATENÇÃO se chuva forte |
| Coqueiral | 3 | 5.5 | 13.0 | 5.9 | 87.6 | 38.6 | medio | ATENÇÃO se chuva forte |
| Encruzilhada | 1 | 1.0 | 6.0 | 1.1 | 94.3 | 38.4 | medio | ATENÇÃO se chuva forte |
| Campina do Barreto | 1 | 1.5 | 7.0 | 1.6 | 93.3 | 38.3 | medio | ATENÇÃO se chuva forte |
| Madalena | 1 | 1.5 | 7.0 | 1.6 | 93.3 | 38.3 | medio | ATENÇÃO se chuva forte |
| Dois Unidos | 20 | 30.0 | 57.0 | 32.4 | 45.7 | 37.7 | medio | ATENÇÃO se chuva forte |
| Cordeiro | 1 | 1.0 | 8.0 | 1.1 | 92.4 | 37.6 | medio | ATENÇÃO se chuva forte |
| Aflitos | 1 | 1.0 | 9.0 | 1.1 | 91.4 | 37.2 | medio | ATENÇÃO se chuva forte |
| Casa Forte | 2 | 2.0 | 11.0 | 2.2 | 89.5 | 37.1 | medio | ATENÇÃO se chuva forte |
| Pina | 1 | 0.5 | 9.0 | 0.5 | 91.4 | 36.9 | medio | ATENÇÃO se chuva forte |
| Cajueiro | 8 | 13.0 | 32.0 | 14.1 | 69.5 | 36.3 | medio | ATENÇÃO se chuva forte |
| Tejipió | 2 | 4.5 | 18.0 | 4.9 | 82.9 | 36.1 | medio | ATENÇÃO se chuva forte |
| Tamarineira | 1 | 1.5 | 14.0 | 1.6 | 86.7 | 35.6 | medio | ATENÇÃO se chuva forte |
| Curado | 6 | 7.5 | 25.0 | 8.1 | 76.2 | 35.3 | medio | ATENÇÃO se chuva forte |
| Casa Amarela | 2 | 2.0 | 16.0 | 2.2 | 84.8 | 35.2 | medio | ATENÇÃO se chuva forte |
| Córrego do Jenipapo | 2 | 3.0 | 23.0 | 3.2 | 78.1 | 33.2 | medio | ATENÇÃO se chuva forte |
| Linha do Tiro | 1 | 1.5 | 25.0 | 1.6 | 76.2 | 31.4 | baixo | apenas informação de chuva |
| Guabiraba | 18 | 46.0 | 101.0 | 49.7 | 3.8 | 31.3 | baixo | apenas informação de chuva |
| Alto do Mandu | 1 | 1.0 | 29.0 | 1.1 | 72.4 | 29.6 | baixo | apenas informação de chuva |
| Jordão | 3 | 5.0 | 38.0 | 5.4 | 63.8 | 28.8 | baixo | apenas informação de chuva |
| Água Fria | 3 | 4.0 | 37.0 | 4.3 | 64.8 | 28.5 | baixo | apenas informação de chuva |
| Passarinho | 3 | 4.0 | 43.0 | 4.3 | 59.0 | 26.2 | baixo | apenas informação de chuva |
| Várzea | 4 | 5.5 | 47.0 | 5.9 | 55.2 | 25.6 | baixo | apenas informação de chuva |
| Dois Irmãos | 1 | 3.0 | 50.0 | 3.2 | 52.4 | 22.9 | baixo | apenas informação de chuva |
| Nova Descoberta | 2 | 3.0 | 57.0 | 3.2 | 45.7 | 20.2 | baixo | apenas informação de chuva |
| Alto Santa Terezinha | 1 | 1.5 | 58.0 | 1.6 | 44.8 | 18.9 | baixo | apenas informação de chuva |
| Prado | 0 | 0.0 | 3.0 | 0.0 | 97.1 | 38.8 | sem_historico | sem histórico de alagamento |
| Ilha Joana Bezerra | 0 | 0.0 | 4.0 | 0.0 | 96.2 | 38.5 | sem_historico | sem histórico de alagamento |
| Brasília Teimosa | 0 | 0.0 | 5.0 | 0.0 | 95.2 | 38.1 | sem_historico | sem histórico de alagamento |
| Ponto de Parada | 0 | 0.0 | 5.0 | 0.0 | 95.2 | 38.1 | sem_historico | sem histórico de alagamento |
| Caçote | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Mustardinha | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Paissandu | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Porto da Madeira | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Recife | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Rosarinho | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Torreão | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Torrões | 0 | 0.0 | 6.0 | 0.0 | 94.3 | 37.7 | sem_historico | sem histórico de alagamento |
| Hipódromo | 0 | 0.0 | 7.0 | 0.0 | 93.3 | 37.3 | sem_historico | sem histórico de alagamento |
| Soledade | 0 | 0.0 | 7.0 | 0.0 | 93.3 | 37.3 | sem_historico | sem histórico de alagamento |
| Engenho do Meio | 0 | 0.0 | 8.0 | 0.0 | 92.4 | 37.0 | sem_historico | sem histórico de alagamento |
| Parnamirim | 0 | 0.0 | 8.0 | 0.0 | 92.4 | 37.0 | sem_historico | sem histórico de alagamento |
| Zumbi | 0 | 0.0 | 8.0 | 0.0 | 92.4 | 37.0 | sem_historico | sem histórico de alagamento |
| Bongi | 0 | 0.0 | 9.0 | 0.0 | 91.4 | 36.6 | sem_historico | sem histórico de alagamento |
| Bomba do Hemetério | 0 | 0.0 | 10.0 | 0.0 | 90.5 | 36.2 | sem_historico | sem histórico de alagamento |
| Espinheiro | 0 | 0.0 | 11.0 | 0.0 | 89.5 | 35.8 | sem_historico | sem histórico de alagamento |
| Cidade Universitária | 0 | 0.0 | 12.0 | 0.0 | 88.6 | 35.4 | sem_historico | sem histórico de alagamento |
| Sítio dos Pintos | 0 | 0.0 | 13.0 | 0.0 | 87.6 | 35.0 | sem_historico | sem histórico de alagamento |
| Poço da Panela | 0 | 0.0 | 14.0 | 0.0 | 86.7 | 34.7 | sem_historico | sem histórico de alagamento |
| Torre | 0 | 0.0 | 16.0 | 0.0 | 84.8 | 33.9 | sem_historico | sem histórico de alagamento |
| Monteiro | 0 | 0.0 | 20.0 | 0.0 | 81.0 | 32.4 | sem_historico | sem histórico de alagamento |
| Macaxeira | 0 | 0.0 | 21.0 | 0.0 | 80.0 | 32.0 | sem_historico | sem histórico de alagamento |
| Sancho | 0 | 0.0 | 21.0 | 0.0 | 80.0 | 32.0 | sem_historico | sem histórico de alagamento |
| Totó | 0 | 0.0 | 23.0 | 0.0 | 78.1 | 31.2 | sem_historico | sem histórico de alagamento |
| Brejo de Beberibe | 0 | 0.0 | 27.0 | 0.0 | 74.3 | 29.7 | sem_historico | sem histórico de alagamento |
| Cohab | 0 | 0.0 | 29.0 | 0.0 | 72.4 | 29.0 | sem_historico | sem histórico de alagamento |
| Alto José do Pinho | 0 | 0.0 | 30.0 | 0.0 | 71.4 | 28.6 | sem_historico | sem histórico de alagamento |
| Fundão | 0 | 0.0 | 31.0 | 0.0 | 70.5 | 28.2 | sem_historico | sem histórico de alagamento |
| Mangabeira | 0 | 0.0 | 33.0 | 0.0 | 68.6 | 27.4 | sem_historico | sem histórico de alagamento |
| Vasco da Gama | 0 | 0.0 | 43.0 | 0.0 | 59.0 | 23.6 | sem_historico | sem histórico de alagamento |
| Apipucos | 0 | 0.0 | 52.0 | 0.0 | 50.5 | 20.2 | sem_historico | sem histórico de alagamento |
| Morro da Conceição | 0 | 0.0 | 57.0 | 0.0 | 45.7 | 18.3 | sem_historico | sem histórico de alagamento |
| Brejo da Guabiraba | 0 | 0.0 | 59.0 | 0.0 | 43.8 | 17.5 | sem_historico | sem histórico de alagamento |
| Alto José Bonifácio | 0 | 0.0 | 70.0 | 0.0 | 33.3 | 13.3 | sem_historico | sem histórico de alagamento |
| Pau Ferro | 0 | 0.0 | 104.0 | 0.0 | 1.0 | 0.4 | sem_historico | sem histórico de alagamento |

## Fontes por bairro

- **Aflitos**: notícia: 1, alerta oficial: 0
- **Afogados**: notícia: 26, alerta oficial: 20
- **Alto Santa Terezinha**: notícia: 1, alerta oficial: 0
- **Alto do Mandu**: notícia: 1, alerta oficial: 0
- **Areias**: notícia: 5, alerta oficial: 0
- **Arruda**: notícia: 7, alerta oficial: 0
- **Barro**: notícia: 4, alerta oficial: 1
- **Beberibe**: notícia: 13, alerta oficial: 0
- **Boa Viagem**: notícia: 24, alerta oficial: 15
- **Boa Vista**: notícia: 7, alerta oficial: 1
- **Cabanga**: notícia: 2, alerta oficial: 0
- **Cajueiro**: notícia: 7, alerta oficial: 1
- **Campina do Barreto**: notícia: 1, alerta oficial: 0
- **Campo Grande**: notícia: 1, alerta oficial: 1
- **Casa Amarela**: notícia: 2, alerta oficial: 0
- **Casa Forte**: notícia: 2, alerta oficial: 0
- **Caxangá**: notícia: 15, alerta oficial: 0
- **Coelhos**: notícia: 0, alerta oficial: 1
- **Coqueiral**: notícia: 2, alerta oficial: 1
- **Cordeiro**: notícia: 0, alerta oficial: 1
- **Curado**: notícia: 5, alerta oficial: 1
- **Córrego do Jenipapo**: notícia: 1, alerta oficial: 1
- **Derby**: notícia: 1, alerta oficial: 1
- **Dois Irmãos**: notícia: 0, alerta oficial: 1
- **Dois Unidos**: notícia: 19, alerta oficial: 1
- **Encruzilhada**: notícia: 1, alerta oficial: 0
- **Estância**: notícia: 2, alerta oficial: 0
- **Graças**: notícia: 1, alerta oficial: 1
- **Guabiraba**: notícia: 4, alerta oficial: 14
- **Ibura**: notícia: 4, alerta oficial: 2
- **Ilha do Leite**: notícia: 1, alerta oficial: 0
- **Ilha do Retiro**: notícia: 2, alerta oficial: 0
- **Imbiribeira**: notícia: 9, alerta oficial: 0
- **Ipsep**: notícia: 0, alerta oficial: 2
- **Iputinga**: notícia: 2, alerta oficial: 0
- **Jaqueira**: notícia: 2, alerta oficial: 1
- **Jardim São Paulo**: notícia: 4, alerta oficial: 1
- **Jiquiá**: notícia: 3, alerta oficial: 0
- **Jordão**: notícia: 2, alerta oficial: 1
- **Linha do Tiro**: notícia: 1, alerta oficial: 0
- **Madalena**: notícia: 1, alerta oficial: 0
- **Mangueira**: notícia: 1, alerta oficial: 0
- **Nova Descoberta**: notícia: 2, alerta oficial: 0
- **Passarinho**: notícia: 2, alerta oficial: 1
- **Peixinhos**: notícia: 1, alerta oficial: 0
- **Pina**: notícia: 1, alerta oficial: 0
- **San Martin**: notícia: 1, alerta oficial: 0
- **Santana**: notícia: 0, alerta oficial: 4
- **Santo Amaro**: notícia: 0, alerta oficial: 1
- **Santo Antônio**: notícia: 0, alerta oficial: 1
- **São José**: notícia: 15, alerta oficial: 8
- **Tamarineira**: notícia: 1, alerta oficial: 0
- **Tejipió**: notícia: 1, alerta oficial: 1
- **Várzea**: notícia: 3, alerta oficial: 1
- **Água Fria**: notícia: 3, alerta oficial: 0

## Regra de alerta no app

1. Usuário cadastra endereço → bairro pelo centróide mais próximo.
2. ML prevê chuva para o bairro.
3. Nível alto E chuva ≥ limiar → alerta de alagamento; médio E chuva forte →
   atenção; baixo → apenas informação de chuva.
