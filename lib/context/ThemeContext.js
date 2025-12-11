'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark';
    setIsDarkMode(isDark);
    
    // Force update HTML element
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    }
    
    console.log('Theme init:', { saved, isDark, hasDarkClass: html.classList.contains('dark') });
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      console.log('Toggle - new mode:', newMode);
      return newMode;
    });
  };

  // Watch for isDarkMode changes and update DOM
  useEffect(() => {
    const html = document.documentElement;
    console.log('isDarkMode effect triggered:', isDarkMode);
    
    // Force a repaint by removing and re-adding the class
    if (isDarkMode) {
      html.classList.remove('dark');
      // Force browser repaint
      void html.offsetHeight;
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
      console.log('Added dark class, classList:', html.classList.toString());
    } else {
      html.classList.remove('dark');
      // Force browser repaint
      void html.offsetHeight;
      html.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
      console.log('Removed dark class, classList:', html.classList.toString());
    }
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};