import React, { createContext, useContext, useState } from 'react';
import { id, TranslationKey } from './id';
import { en } from './en';

type Language = 'id' | 'en';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'id',
  setLang: () => {},
  t: (key: TranslationKey) => id[key] || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('edgelink_lang');
    if (saved === 'id' || saved === 'en') return saved;
    const navLang = navigator.language.toLowerCase();
    return navLang.startsWith('id') ? 'id' : 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('edgelink_lang', newLang);
  };

  const t = (key: TranslationKey): string => {
    const dict = lang === 'en' ? en : id;
    return dict[key] || id[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
