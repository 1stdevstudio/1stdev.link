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

function detectLang(): Language {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'id' || q === 'en') return q;
  } catch { /* abaikan */ }
  // Bahasa pertama yang kita dukung dari daftar preferensi perangkat; selain itu Inggris.
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const l of prefs) {
    const code = l.toLowerCase();
    if (code.startsWith('id') || code.startsWith('in') || code.startsWith('ms')) return 'id';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Bahasa mengikuti perangkat (tanpa tombol pilihan). `?lang=en|id` hanya untuk uji/berbagi, tidak disimpan.
  const [lang, setLangState] = useState<Language>(detectLang);

  useEffect(() => {
    const onChange = () => setLangState(detectLang());
    window.addEventListener('languagechange', onChange);
    // Bersihkan pilihan lama dari versi yang masih punya tombol ID/EN.
    try { localStorage.removeItem('edgelink_lang'); } catch { /* storage diblokir */ }
    return () => window.removeEventListener('languagechange', onChange);
  }, []);

  const setLang = (newLang: Language) => setLangState(newLang);

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
