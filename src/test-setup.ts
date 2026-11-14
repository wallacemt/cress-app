import { beforeEach } from "vitest";
import { setLanguage } from "./lib/i18n";

// Testes assumem pt-BR (idioma original dos textos usados nas asserções),
// independente do locale do sistema/CI onde rodam — sem isso, detectSystemLanguage()
// usa navigator.language do ambiente (ex. "en-US" nesta máquina) e quebra qualquer
// asserção que procure texto em português.
beforeEach(() => setLanguage("pt-BR"));
