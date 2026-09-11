import { create } from "zustand";

type AuthState = {
  usuario: string;
  senha: string;
  setUsuarioLogin: (texto: string) => void;
  setSenhaLogin: (texto: string) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  usuario: "",
  senha: "",
  setUsuarioLogin: (texto) => set({ usuario: texto }),
  setSenhaLogin: (texto) => set({ senha: texto }),
}));
