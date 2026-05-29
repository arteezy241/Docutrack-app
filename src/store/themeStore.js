import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'docutrack_theme';

const darkTheme = {
  isDark: true,
  bgPage:        '#1b2838',
  bgCard:        '#171a21',
  bgDeep:        '#0e1621',
  bgInput:       'rgba(255,255,255,0.05)',
  bgHover:       'rgba(255,255,255,0.03)',
  border:        'rgba(255,255,255,0.07)',
  borderInput:   'rgba(255,255,255,0.1)',
  textPrimary:   '#e8edf2',
  textSecondary: '#c6d4df',
  textMuted:     '#8f98a0',
  textAccent:    '#47bfff',
  modalBg:       '#13161f',
  divider:       'rgba(255,255,255,0.07)',
  accent:        '#4F46E5',
};

const lightTheme = {
  isDark: false,
  bgPage:        '#f0f4f8',
  bgCard:        '#ffffff',
  bgDeep:        '#f5f7fa',
  bgInput:       'rgba(0,0,0,0.04)',
  bgHover:       'rgba(0,0,0,0.025)',
  border:        'rgba(0,0,0,0.08)',
  borderInput:   'rgba(0,0,0,0.12)',
  textPrimary:   '#1a2332',
  textSecondary: '#2d3748',
  textMuted:     '#718096',
  textAccent:    '#2b6cb0',
  modalBg:       '#ffffff',
  divider:       'rgba(0,0,0,0.07)',
  accent:        '#4F46E5',
};

const useThemeStore = create((set) => ({
  ...darkTheme,

  toggleTheme: async () => {
    set((state) => {
      const next = state.isDark ? lightTheme : darkTheme;
      SecureStore.setItemAsync(THEME_KEY, state.isDark ? 'light' : 'dark');
      return next;
    });
  },

  loadTheme: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved === 'light') set(lightTheme);
      else set(darkTheme);
    } catch {
      set(darkTheme);
    }
  },
}));

export default useThemeStore;