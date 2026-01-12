import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, getToken, setToken } from "../lib/apiClient";

type AuthStatus = "loading" | "authed" | "anon";

type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus("anon");
      return;
    }

    apiFetch<{ user: AuthUser }>("/auth/me")
      .then(({ user: me }) => {
        setUser(me);
        setStatus("authed");
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        setStatus("anon");
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setToken(token);
    setUser(loggedIn);
    setStatus("authed");
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { token, user: registered } = await apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });

    setToken(token);
    setUser(registered);
    setStatus("authed");
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus("anon");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isConfigured: Boolean(import.meta.env.VITE_API_URL),
      login,
      register,
      signOut,
    }),
    [login, register, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
