import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('accessibility_fontSize') || 'medium';
  });

  const [colorMode, setColorMode] = useState(() => {
    return localStorage.getItem('accessibility_colorMode') || 'normal';
  });

  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('accessibility_highContrast') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('accessibility_fontSize', fontSize);
    
    // Apply font size to root
    document.documentElement.classList.remove('text-small', 'text-medium', 'text-large');
    document.documentElement.classList.add(`text-${fontSize}`);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('accessibility_colorMode', colorMode);
    
    // Apply color filter
    document.documentElement.setAttribute('data-color-mode', colorMode);
  }, [colorMode]);

  useEffect(() => {
    localStorage.setItem('accessibility_highContrast', highContrast.toString());
    
    // Apply high contrast
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        colorMode,
        setColorMode,
        highContrast,
        setHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};