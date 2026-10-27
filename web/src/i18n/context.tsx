import React, { createContext, useContext, useEffect, useState } from 'react';
import { id, TranslationKey } from './id';
import { en } from './en';

type Language = 'id' | 'en';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  /** Teks dua bahasa di tempat: tx('Simpan', 'Save'). */
  tx: (idText: string, enText: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'id',
  setLang: () => {},
  t: (key: TranslationKey) => id[key] || key,
  tx: (idText: string) => idText,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('edgelink_lang'); } catch { /* storage diblokir */ }
    if (saved === 'id' || saved === 'en') return saved;
    const navLang = navigator.language.toLowerCase();
    return navLang.startsWith('id') ? 'id' : 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try { localStorage.setItem('edgelink_lang', newLang); } catch { /* storage diblokir */ }
  };

  const t = (key: TranslationKey): string => {
    const dict = lang === 'en' ? en : id;
    return dict[key] || id[key] || key;
  };

  const tx = (idText: string, enText: string) => (lang === 'en' ? enText : idText);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'en'
        ? 'Free Link in Bio & URL Shortener – EdgeLink by 1stnear.com'
        : 'Link Bio & Link Pendek Gratis – EdgeLink by 1stnear.com';
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tx }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
