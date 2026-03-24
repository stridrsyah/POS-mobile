/**
 * src/context/ThemeContext.js
 * Dark / Light mode management — persisted via AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS } from '../utils/theme';

const THEME_KEY = 'app_theme_mode';

const ThemeContext = createContext({
  isDark: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
  setTheme: (mode) => {},
  themeMode: 'dark',
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved && ['dark', 'light', 'system'].includes(saved)) {
          setThemeMode(saved);
        }
      } catch {}
    };
    loadTheme();
  }, []);

  const resolvedMode = themeMode === 'system'
    ? (Appearance.getColorScheme() || 'dark')
    : themeMode;

  const isDark = resolvedMode === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const toggleTheme = async () => {
    const next = isDark ? 'light' : 'dark';
    setThemeMode(next);
    try { await AsyncStorage.setItem(THEME_KEY, next); } catch {}
  };

  const setTheme = async (mode) => {
    setThemeMode(mode);
    try { await AsyncStorage.setItem(THEME_KEY, mode); } catch {}
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setTheme, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
