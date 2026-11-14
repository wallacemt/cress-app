import { create } from "zustand";
import { detectSystemLanguage, setLanguage as setI18nLanguage, type LanguageCode } from "../lib/i18n";
import { makeSettingsRepo } from "../infrastructure/repositories/settingsRepo";
import type { SqlDb } from "../infrastructure/db/sqlDb";

interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode, db: SqlDb) => Promise<void>;
  loadLanguage: (db: SqlDb) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: detectSystemLanguage(),
  setLanguage: async (code, db) => {
    const settings = makeSettingsRepo(db);
    await settings.set("app.language", JSON.stringify(code));
    setI18nLanguage(code);
    set({ language: code });
  },
  loadLanguage: async (db) => {
    const settings = makeSettingsRepo(db);
    const saved = await settings.get("app.language");
    let code: LanguageCode;
    if (saved === '"pt-BR"' || saved === '"en-US"') {
      code = JSON.parse(saved);
    } else {
      code = detectSystemLanguage();
    }
    setI18nLanguage(code);
    set({ language: code });
  },
}));
