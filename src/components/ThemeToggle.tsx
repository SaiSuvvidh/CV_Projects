import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all duration-200 bg-wood-light dark:bg-wood-dark hover:bg-wood-medium dark:hover:bg-wood-medium border border-wood-border dark:border-wood-border-dark"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-wood-text dark:text-wood-text-dark" />
      ) : (
        <Sun className="w-5 h-5 text-wood-text dark:text-wood-text-dark" />
      )}
    </button>
  );
};