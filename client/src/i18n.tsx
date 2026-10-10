import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
export type Language = "en" | "ar";
interface Preferences {
  language: Language;
  isArabic: boolean;
  toggleLanguage: () => void;
}
const PreferencesContext = createContext<Preferences | null>(null);
function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "ar";
  try {
    return localStorage.getItem("najmuni_language") === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  useEffect(() => {
    try {
      localStorage.setItem("najmuni_language", language);
    } catch {
      /* Storage is optional. */
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  const value = useMemo(
    () => ({
      language,
      isArabic: language === "ar",
      toggleLanguage: () =>
        setLanguage((prev) => (prev === "ar" ? "en" : "ar")),
    }),
    [language],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context)
    throw new Error("usePreferences must be used within PreferencesProvider");
  return context;
}
