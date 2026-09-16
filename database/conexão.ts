// Ponto inicial planejado para integração com banco.
// Mantido intacto para não quebrar o app atual.
// Novo contrato pronto em src/backend/ (types, auth.repository, auth.service).
// TODO(firebase): o time de backend implementa a conexão aqui ou em src/backend/.
import { useAuthStore } from "@/contexts/authContext";

const { usuario, senha } = useAuthStore.getState();

export { usuario, senha };
