export type LanguageCode = "pt-BR" | "en-US";

export const LANGUAGES: Record<LanguageCode, { label: string; native: string }> = {
  "pt-BR": { label: "Português", native: "Português do Brasil" },
  "en-US": { label: "English", native: "English (US)" },
};

type Locale = Record<string, string>;

export type { Locale };

const locales: Record<LanguageCode, Locale> = {
  "pt-BR": {},
  "en-US": {},
};

export function detectSystemLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "pt-BR";
  const lang = navigator.language || navigator.languages?.[0] || "";
  return lang.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
}

let current: LanguageCode = detectSystemLanguage();

export function setLanguage(code: LanguageCode) {
  if (!(code in locales)) return;
  current = code;
}

export function getLanguage(): LanguageCode {
  return current;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dictionary = locales[current];
  let text = dictionary[key] ?? key;
  if (params) {
    text = text.replace(/\{\{(\w+)\}}/g, (_match, name) =>
      String(params[name] ?? `{{${name}}}`),
    );
  }
  return text;
}

export function loadLocale(code: LanguageCode, dictionary: Locale) {
  locales[code] = { ...locales[code], ...dictionary };
}

// Carrega os dicionários padrão deste build.
import ptBR from "./locales/pt-BR";
import enUS from "./locales/en-US";
loadLocale("pt-BR", ptBR);
loadLocale("en-US", enUS);
