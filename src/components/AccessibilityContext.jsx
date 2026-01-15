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
    return localStorage.getItem('fontSize') || 'medium';
  });

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    
    // Apply font size directly to html element
    const root = document.documentElement;
    
    if (fontSize === 'small') {
      root.style.fontSize = '14px';
    } else if (fontSize === 'medium') {
      root.style.fontSize = '16px';
    } else if (fontSize === 'large') {
      root.style.fontSize = '20px';
    }
  }, [fontSize]);

  return (
    <AccessibilityContext.Provider 
      value={{ 
        fontSize, 
        setFontSize
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};