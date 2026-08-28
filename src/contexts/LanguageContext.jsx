import React, { createContext, useState, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES } from '../i18n';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [langCode, setLangCode] = useState('en');

  // Load from local storage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('Citizen Vox_lang');
    if (savedLang && SUPPORTED_LANGUAGES[savedLang]) {
      setLangCode(savedLang);
    }
  }, []);

  const setLanguage = (code) => {
    if (SUPPORTED_LANGUAGES[code]) {
      setLangCode(code);
      localStorage.setItem('Citizen Vox_lang', code);
    }
  };

  const t = useCallback((key) => {
    const dict = SUPPORTED_LANGUAGES[langCode]?.translations;
    // Fallback to English if translation is missing
    const fallbackDict = SUPPORTED_LANGUAGES['en']?.translations;
    
    return dict?.[key] || fallbackDict?.[key] || key;
  }, [langCode]);

  return (
    <LanguageContext.Provider value={{ langCode, languageConfig: SUPPORTED_LANGUAGES[langCode], setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
