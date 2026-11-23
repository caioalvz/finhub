import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F5F2',
  card: '#FFFFFF',
  text: '#1B1F1D',
  muted: '#6B726E',
  line: '#E3E6E1',
  accent: '#1F7A63',
  accentText: '#FFFFFF',
  danger: '#C8382B',
  warnBg: '#FDECEA',
  okBg: '#E4F3EE',
  track: '#E8EBE6',
};

const dark: typeof light = {
  bg: '#101412',
  card: '#1A201D',
  text: '#ECEFEC',
  muted: '#98A09B',
  line: '#2A322E',
  accent: '#3FB68F',
  accentText: '#06150F',
  danger: '#FF7A6B',
  warnBg: '#3A1F1C',
  okBg: '#17342B',
  track: '#2A322E',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
