'use client';

import { useTheme } from '@/lib/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleClick = () => {
    console.log('Button clicked, current isDarkMode:', isDarkMode);
    console.log('HTML classList before:', document.documentElement.classList.toString());
    toggleTheme();
    setTimeout(() => {
      console.log('HTML classList after:', document.documentElement.classList.toString());
    }, 100);
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}