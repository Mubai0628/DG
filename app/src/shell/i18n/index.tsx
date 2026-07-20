import { createContext, useContext, type ReactNode } from "react";

import { zhDictionary } from "./zh.js";

export type Language = "zh" | "en";

/**
 * English-as-key i18n: the English source text is the lookup key, the
 * Chinese dictionary maps it to zh. Untranslated text falls back to the
 * key itself, so English is never "missing" by construction; the zh
 * coverage test in app/test/i18n.test.tsx guarantees zh mode is 100%
 * Chinese.
 */
export function translate(language: Language, text: string): string {
  return language === "zh" ? (zhDictionary[text] ?? text) : text;
}

const LanguageContext = createContext<Language>("zh");

export function LanguageProvider({
  language,
  children
}: {
  language: Language;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): Language {
  return useContext(LanguageContext);
}

/** Translation hook: returns a t() bound to the current language. */
export function useT(): (text: string) => string {
  const language = useContext(LanguageContext);
  return (text: string) => translate(language, text);
}
