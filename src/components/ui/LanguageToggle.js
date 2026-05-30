import { useLanguage } from '../../context/LanguageContext';

export function LanguageToggle({ className = '' }) {
  const { lang, toggleLanguage } = useLanguage();
  if (!toggleLanguage) return null;
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`icon-box bg-surface text-text-2 hover:text-accent border border-border text-lg ${className}`}
      title={lang === 'en' ? 'Switch to Somali' : 'Switch to English'}
      aria-label="Toggle language"
    >
      {lang === 'en' ? '🇸🇴' : '🇬🇧'}
    </button>
  );
}
