import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { auth } from "@/lib/firebase";

// Gerencia a sessão do usuário logado.
// O Firebase restaura a sessão do AsyncStorage e o onAuthStateChanged
// detecta o usuário atual e mudanças de login/logout.
// `initializing` mantém a splash screen até a primeira verificação,
// evitando exibir a tela de login na hora errada.

type SessionState = {
  user: User | null;
  initializing: boolean;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        setInitializing(false);
      },
      (error) => {
        // Se a restauração falhar, trata como deslogado em vez de travar
        // o app na splash screen.
        console.error("Erro ao restaurar sessão:", error);
        setUser(null);
        setInitializing(false);
      },
    );
    return unsubscribe;
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      user,
      initializing,
      // O redirecionamento para /login acontece sozinho: ao zerar `user`,
      // as rotas protegidas em app/_layout.tsx deixam de existir.
      logout: () => signOut(auth),
    }),
    [user, initializing],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession precisa estar dentro de <SessionProvider>.");
  }
  return ctx;
}
