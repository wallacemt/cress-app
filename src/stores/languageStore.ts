import { create } from "zustand";
import type { LanguageCode } from "../lib/i18n";
import { makeSettingsRepo } from "../infrastructure/repositories/settingsRepo";
import type { SqlDb } from "../infrastructure/db/sqlDb";

interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode, db: SqlDb) => Promise<void>;
  loadLanguage: (db: SqlDb) => Promise<void>;
}

const DEFAULT_LANGUAGE: LanguageCode = "pt-BR";

export const useLanguageStore = create<LanguageState>((set) => ({
  language: DEFAULT_LANGUAGE,
  setLanguage: async (code, db) => {
    const settings = makeSettingsRepo(db);
    await settings.set("app.language", JSON.stringify(code));
    set({ language: code });
  },
  loadLanguage: async (db) => {
    const settings = makeSettingsRepo(db);
    const saved = await settings.get("app.language");
    const code = (saved === '"pt-BR"' || saved === '"en-US"') ? JSON.parse(saved) : DEFAULT_LANGUAGE;
    set({ language: code });
  },
}));
