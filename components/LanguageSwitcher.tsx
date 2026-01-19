import React from 'react';
import { LANGUAGES } from '../constants';
import { Language } from '../types';
import { Globe } from 'lucide-react';

interface Props {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const LanguageSwitcher: React.FC<Props> = ({ currentLang, onLanguageChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs text-white hover:bg-slate-700 transition-colors"
      >
        <Globe size={14} className="text-yellow-500" />
        <span>{LANGUAGES[currentLang].flag}</span>
        <span className="uppercase">{currentLang}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 overflow-hidden">
          {Object.entries(LANGUAGES).map(([code, { label, flag }]) => (
            <button
              key={code}
              onClick={() => {
                onLanguageChange(code as Language);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm flex items-center space-x-3 hover:bg-slate-700 ${
                currentLang === code ? 'bg-slate-700/50 text-yellow-400' : 'text-slate-200'
              }`}
            >
              <span className="text-lg">{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
