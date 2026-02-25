const lightColors = {
  primary: '#135bec',
  primary_100: '#e8f0fd',
  primary_200: '#a3c4f7',
  primary_300: '#5b94f1',
  primary_400: '#0d4abf',
  primary_gradient: 'linear-gradient(135deg, #5b94f1 0%, #135bec 100%)',

  secondary: '#8C65E2',
  secondary_100: '#f3eefb',
  secondary_200: '#c9b8f0',
  secondary_300: '#a07de8',
  secondary_400: '#6838D2',
  secondary_gradient: 'linear-gradient(135deg, #b689ff 0%, #612fcf 100%)',

  info: '#00B8D9',
  info_100: '#e5f8fb',
  info_200: '#92E5FF',
  info_300: '#006C9C',
  info_400: '#003768',

  success: '#36B37E',
  success_100: '#e8f7f0',
  success_200: '#9DEDBB',
  success_300: '#1B806A',
  success_400: '#0A5554',
  success_gradient: 'linear-gradient(135deg, #86e8ab 0%, #36b37e 100%)',

  warn: '#FFAB00',
  warn_100: '#fff8e5',
  warn_200: '#FFD666',
  warn_300: '#CB7220',
  warn_400: '#7A4100',

  error: '#FF5630',
  error_100: '#ffebe6',
  error_200: '#FFAC82',
  error_300: '#C21434',
  error_400: '#7A0916',

  white: '#FFFFFF',

  grey_100: '#f6f6f8',
  grey_200: '#f0f2f7',
  grey_300: '#e7ebf3',
  grey_400: '#cfd7e7',
  grey_500: '#919EAB',
  grey_600: '#4c669a',
  grey_700: '#2d3748',
  grey_800: '#0d121b',
  grey_900: '#080b10',

  purple_100: '#ad0af8',
  purple_400: '#500fd7',

  background: '#f6f6f8',
  surface: '#FFFFFF',
  surfaceAlt: '#f0f2f7',
  text: '#0d121b',
  textSecondary: '#4c669a',
  border: '#e7ebf3',
  borderLight: '#cfd7e7',
  divider: '#e7ebf3',
};

const darkColors = {
  primary: '#4d8df7',
  primary_100: '#1a1a1a',
  primary_200: '#1e2a3a',
  primary_300: '#4d8df7',
  primary_400: '#a3c4f7',
  primary_gradient: 'linear-gradient(135deg, #135bec 0%, #4d8df7 100%)',

  secondary: '#a07de8',
  secondary_100: '#1a1a1a',
  secondary_200: '#2a1d4a',
  secondary_300: '#a07de8',
  secondary_400: '#c9b8f0',
  secondary_gradient: 'linear-gradient(135deg, #612fcf 0%, #b689ff 100%)',

  info: '#92E5FF',
  info_100: '#1a1a1a',
  info_200: '#006C9C',
  info_300: '#92E5FF',
  info_400: '#CDF2FD',

  success: '#1db954',
  success_100: '#1a1a1a',
  success_200: '#1B806A',
  success_300: '#1db954',
  success_400: '#D8FBDE',
  success_gradient: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)',

  warn: '#FFD666',
  warn_100: '#1a1a1a',
  warn_200: '#CB7220',
  warn_300: '#FFD666',
  warn_400: '#FFF5CC',

  error: '#FFAC82',
  error_100: '#1a1a1a',
  error_200: '#C21434',
  error_300: '#FFAC82',
  error_400: '#FFE9D5',

  white: '#181818',

  grey_100: '#1e1e1e',
  grey_200: '#181818',
  grey_300: '#282828',
  grey_400: '#333333',
  grey_500: '#727272',
  grey_600: '#a0a0a0',
  grey_700: '#b3b3b3',
  grey_800: '#e0e0e0',
  grey_900: '#f5f5f5',

  purple_100: '#500fd7',
  purple_400: '#ad0af8',

  background: '#121212',
  surface: '#181818',
  surfaceAlt: '#282828',
  text: '#f0f0f0',
  textSecondary: '#a0a0a0',
  border: '#333333',
  borderLight: '#404040',
  divider: '#333333',
};

const shadows = {
  z_01: '0rem 0.063rem 0.125rem 0rem rgba(0, 0, 0, 0.1)',
  z_04: '0rem 0.25rem 0.5rem 0rem rgba(0, 0, 0, 0.1)',
  z_08: '0rem 0.5rem 1rem 0rem rgba(0, 0, 0, 0.1)',
  z_12: '0rem 0.75rem 1.5rem -0.25rem rgba(0, 0, 0, 0.15)',
  z_16: '0rem 1rem 2rem -0.25rem rgba(0, 0, 0, 0.15)',
  z_20: '0rem 1.25rem 2.5rem -0.25rem rgba(0, 0, 0, 0.15)',
  z_24: '0rem 1.5rem 3rem 0rem rgba(0, 0, 0, 0.15)',
  cards: '0rem 0.25rem 1rem -0.25rem rgba(0, 0, 0, 0.08)',
  dialogs: '-2.5rem 2.5rem 5rem -0.5rem rgba(0, 0, 0, 0.2)',
  dropdown: '0rem 0.5rem 1.5rem -0.25rem rgba(0, 0, 0, 0.15)',
  circle_button: '0 0 0.15rem rgba(0, 0, 0, 0.2)',
};

const darkShadows = {
  z_01: '0rem 0.063rem 0.25rem 0rem rgba(0, 0, 0, 0.5)',
  z_04: '0rem 0.25rem 0.5rem 0rem rgba(0, 0, 0, 0.5)',
  z_08: '0rem 0.5rem 1rem 0rem rgba(0, 0, 0, 0.5)',
  z_12: '0rem 0.75rem 1.5rem -0.25rem rgba(0, 0, 0, 0.6)',
  z_16: '0rem 1rem 2rem -0.25rem rgba(0, 0, 0, 0.6)',
  z_20: '0rem 1.25rem 2.5rem -0.25rem rgba(0, 0, 0, 0.6)',
  z_24: '0rem 1.5rem 3rem 0rem rgba(0, 0, 0, 0.6)',
  cards: '0rem 0.25rem 1rem -0.25rem rgba(0, 0, 0, 0.4)',
  dialogs: '-2.5rem 2.5rem 5rem -0.5rem rgba(0, 0, 0, 0.7)',
  dropdown: '0rem 0.5rem 1.5rem -0.25rem rgba(0, 0, 0, 0.6)',
  circle_button: '0 0 0.15rem rgba(0, 0, 0, 0.5)',
};

export const styledTheme = {
  COLORS: lightColors,
  SHADOWS: shadows,
  BORDERS: {
    b_01: `0.063rem solid ${lightColors.border}`,
  },
  FONTS: {
    montserrat: 'Montserrat',
    manrope: 'Manrope',
    sansSerif: 'sans-serif',
  },
  SIZES: {
    xs: '(max-width: 600px)',
    sm: '(max-width: 900px)',
    md: '(max-width: 1200px)',
    lg: '(max-width: 1536px)',
    xl: '(min-width: 1536px)',
  },
};

export const styledThemeDark = {
  COLORS: darkColors,
  SHADOWS: darkShadows,
  BORDERS: {
    b_01: `0.063rem solid ${darkColors.border}`,
  },
  FONTS: {
    montserrat: 'Montserrat',
    manrope: 'Manrope',
    sansSerif: 'sans-serif',
  },
  SIZES: {
    xs: '(max-width: 600px)',
    sm: '(max-width: 900px)',
    md: '(max-width: 1200px)',
    lg: '(max-width: 1536px)',
    xl: '(min-width: 1536px)',
  },
};

export enum ColorsEnum {
  primary = 'primary',
  primary_100 = 'primary_100',
  primary_200 = 'primary_200',
  primary_300 = 'primary_300',
  primary_400 = 'primary_400',
  secondary = 'secondary',
  secondary_100 = 'secondary_100',
  secondary_200 = 'secondary_200',
  secondary_300 = 'secondary_300',
  secondary_400 = 'secondary_400',
  info = 'info',
  info_100 = 'info_100',
  info_200 = 'info_200',
  info_300 = 'info_300',
  info_400 = 'info_400',
  success = 'success',
  success_100 = 'success_100',
  success_200 = 'success_200',
  success_300 = 'success_300',
  success_400 = 'success_400',
  warn = 'warn',
  warn_100 = 'warn_100',
  warn_200 = 'warn_200',
  warn_300 = 'warn_300',
  warn_400 = 'warn_400',
  error = 'error',
  error_100 = 'error_100',
  error_200 = 'error_200',
  error_300 = 'error_300',
  error_400 = 'error_400',
  white = 'white',
  grey_100 = 'grey_100',
  grey_200 = 'grey_200',
  grey_300 = 'grey_300',
  grey_400 = 'grey_400',
  grey_500 = 'grey_500',
  grey_600 = 'grey_600',
  grey_700 = 'grey_700',
  grey_800 = 'grey_800',
  grey_900 = 'grey_900',
}

export type ColorsType = `${ColorsEnum}`;

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ThemeMode = 'light' | 'dark';

export function getStyledTheme(mode: ThemeMode) {
  return mode === 'dark' ? styledThemeDark : styledTheme;
}
