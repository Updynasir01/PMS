import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { translations } from '../lib/translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'propsync-lang';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'so' || saved === 'en') setLang(saved);
  }, []);

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === 'en' ? 'so' : 'en';
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const value = useMemo(() => ({
    lang,
    setLang: (l) => {
      if (l === 'en' || l === 'so') {
        setLang(l);
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
      }
    },
    toggleLanguage,
    t: translations[lang] || translations.en,
  }), [lang]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  return ctx?.t || translations.en;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
