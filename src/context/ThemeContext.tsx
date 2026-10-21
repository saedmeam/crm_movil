import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

export const THEME_STORAGE_KEY = 'horustech_crm_theme_mode';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSubtle: string;
  card: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  headerBg: string;
  headerText: string;
  chatBg: string;
  bubbleClient: string;
  bubbleAgent: string;
  bubbleInternal: string;
  inputBg: string;
  inputText: string;
  inputBorder: string;
  primary: string;
  primaryLight: string;
}

export const lightColors: ThemeColors = {
  isDark: false,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  headerBg: '#075E54',
  headerText: '#FFFFFF',
  chatBg: '#EFEAE2',
  bubbleClient: '#FFFFFF',
  bubbleAgent: '#D9FDD3',
  bubbleInternal: '#FEF9C3',
  inputBg: '#FFFFFF',
  inputText: '#0F172A',
  inputBorder: '#E2E8F0',
  primary: '#075E54',
  primaryLight: '#128C7E',
};

export const darkColors: ThemeColors = {
  isDark: true,
  background: '#0B141A',
  surface: '#111B21',
  surfaceSubtle: '#202C33',
  card: '#1F2C34',
  border: '#2A3942',
  borderSubtle: '#222D34',
  textPrimary: '#E9EDEF',
  textSecondary: '#AEBAC1',
  textMuted: '#8696A0',
  headerBg: '#1F2C34',
  headerText: '#E9EDEF',
  chatBg: '#0B141A',
  bubbleClient: '#202C33',
  bubbleAgent: '#005C4B',
  bubbleInternal: '#373214',
  inputBg: '#2A3942',
  inputText: '#E9EDEF',
  inputBorder: '#374248',
  primary: '#00A884',
  primaryLight: '#005C4B',
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved !== null) {
          setIsDark(saved === 'dark');
        }
      } catch (e) {
        console.warn('[ThemeContext] Error loading theme:', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const next = !isDark;
      setIsDark(next);
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch (e) {
      console.warn('[ThemeContext] Error saving theme:', e);
    }
  };

  const setDarkMode = async (enabled: boolean) => {
    try {
      setIsDark(enabled);
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
    } catch (e) {
      console.warn('[ThemeContext] Error setting theme:', e);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};
