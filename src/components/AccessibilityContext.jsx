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
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('accessibility_highContrast') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('accessibility_highContrast', highContrast.toString());
    
    // Apply high contrast to both html and body
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
      document.body.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        setHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};