import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  bairroMaisProximo,
  DISTANCIA_MAXIMA_KM,
  type BairroProximo,
} from "@/lib/bairros";

const TEMPO_LIMITE_MS = 15000;

class ErroLocalizacao extends Error {}

function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ErroLocalizacao("Tempo esgotado ao obter o GPS.")),
      ms,
    );
    promessa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (erro) => {
        clearTimeout(timer);
        reject(erro);
      },
    );
  });
}

async function obterPosicao(): Promise<Location.LocationObject> {
  try {
    return await comTempoLimite(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      TEMPO_LIMITE_MS,
    );
  } catch (erro) {
    // Sem fix novo (ex.: dentro de prédio), usa a última posição conhecida.
    const ultima = await Location.getLastKnownPositionAsync().catch(() => null);
    if (ultima) return ultima;
    throw erro;
  }
}

/**
 * Descobre o bairro do Recife onde o usuário está, usando o GPS do aparelho
 * (ou a geolocalização do navegador, na web).
 */
export function useLocalizacaoBairro() {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState("");
  const ativo = useRef(true);

  useEffect(() => {
    ativo.current = true;
    return () => {
      ativo.current = false;
    };
  }, []);

  const limparErro = useCallback(() => setErro(""), []);

  /** Retorna o bairro detectado ou null (a mensagem fica em `erro`). */
  const detectar = useCallback(async (): Promise<BairroProximo | null> => {
    setErro("");
    setBuscando(true);

    try {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (permissao.status !== "granted") {
        if (ativo.current) {
          setErro(
            permissao.canAskAgain === false
              ? "Permissão de localização negada. Ative-a nas configurações do aparelho ou escolha o bairro na lista."
              : "Precisamos da permissão de localização para detectar seu bairro. Você também pode escolher na lista.",
          );
        }
        return null;
      }

      const servicosAtivos = await Location.hasServicesEnabledAsync().catch(
        () => true,
      );
      if (!servicosAtivos) {
        if (ativo.current) {
          setErro("O GPS está desligado. Ative a localização e tente de novo.");
        }
        return null;
      }

      const posicao = await obterPosicao();
      if (!ativo.current) return null;

      const proximo = bairroMaisProximo(
        posicao.coords.latitude,
        posicao.coords.longitude,
      );

      if (!proximo) {
        setErro("Não foi possível interpretar sua localização.");
        return null;
      }

      if (proximo.distanciaKm > DISTANCIA_MAXIMA_KM) {
        setErro(
          "Sua localização parece estar fora do Recife. Escolha o bairro na lista.",
        );
        return null;
      }

      return proximo;
    } catch (e) {
      console.warn("Falha ao obter localização:", e);
      if (ativo.current) {
        setErro(
          e instanceof ErroLocalizacao
            ? "Não conseguimos obter sua posição a tempo. Tente de novo em um local aberto."
            : "Não foi possível obter sua localização. Escolha o bairro na lista.",
        );
      }
      return null;
    } finally {
      if (ativo.current) setBuscando(false);
    }
  }, []);

  return { detectar, buscando, erro, limparErro };
}
