import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { crmApi, setCsrf, write } from "./api";
import type { Staff } from "./types";

type Context = {
  user: Staff | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  ar: boolean;
  toggleLanguage: () => void;
};
const Context = createContext<Context>(null!);
export const useCRM = () => useContext(Context);
export function CRMProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Staff | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [ar, setAr] = useState(
    () => localStorage.getItem("crm-language") === "ar",
  );
  useEffect(() => {
    let live = true;
    crmApi<{ user: Staff; csrf_token: string }>("/auth/me")
      .then((r) => {
        if (live) {
          setUser(r.user);
          setCsrf(r.csrf_token);
        }
      })
      .catch((e) => {
        if (live && e.status !== 401) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    const expired = () => {
      setUser(null);
      setCsrf("");
    };
    window.addEventListener("crm:unauthorized", expired);
    return () => {
      live = false;
      window.removeEventListener("crm:unauthorized", expired);
    };
  }, []);
  async function login(email: string, password: string) {
    const r = await write<{ user: Staff; csrf_token: string }>("/auth/login", {
      email,
      password,
    });
    setUser(r.user);
    setCsrf(r.csrf_token);
    setError("");
  }
  async function logout() {
    await write("/auth/logout", {});
    setUser(null);
    setCsrf("");
  }
  const toggleLanguage = () =>
    setAr((v) => {
      localStorage.setItem("crm-language", v ? "en" : "ar");
      return !v;
    });
  return (
    <Context.Provider
      value={{ user, loading, error, login, logout, ar, toggleLanguage }}
    >
      {children}
    </Context.Provider>
  );
}
