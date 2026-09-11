import { useAuthStore } from "@/contexts/authContext";

const { usuario, senha } = useAuthStore.getState();
