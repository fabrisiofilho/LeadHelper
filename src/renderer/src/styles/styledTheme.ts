const lightColors = {
  primary: '#2563EB',
  primary_100: '#EFF6FF',
  primary_200: '#93C5FD',
  primary_300: '#3B82F6',
  primary_400: '#1D4ED8',
  primary_gradient: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)',

  secondary: '#7C3AED',
  secondary_100: '#F5F3FF',
  secondary_200: '#C4B5FD',
  secondary_300: '#8B5CF6',
  secondary_400: '#6D28D9',
  secondary_gradient: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',

  info: '#0891B2',
  info_100: '#ECFEFF',
  info_200: '#67E8F9',
  info_300: '#0E7490',
  info_400: '#164E63',

  success: '#16A34A',
  success_100: '#F0FDF4',
  success_200: '#86EFAC',
  success_300: '#15803D',
  success_400: '#14532D',
  success_gradient: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)',

  warn: '#D97706',
  warn_100: '#FFFBEB',
  warn_200: '#FCD34D',
  warn_300: '#B45309',
  warn_400: '#78350F',

  error: '#DC2626',
  error_100: '#FEF2F2',
  error_200: '#FCA5A5',
  error_300: '#B91C1C',
  error_400: '#7F1D1D',

  white: '#FFFFFF',

  grey_100: '#F8FAFC',
  grey_200: '#F1F5F9',
  grey_300: '#E2E8F0',
  grey_400: '#CBD5E1',
  grey_500: '#94A3B8',
  grey_600: '#64748B',
  grey_700: '#334155',
  grey_800: '#1E293B',
  grey_900: '#0F172A',

  purple_100: '#A855F7',
  purple_400: '#6D28D9',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  borderLight: '#CBD5E1',
  divider: '#E2E8F0',
};

const darkColors = {
  primary: '#6B9FF8',
  primary_100: '#1a2332',
  primary_200: '#1e3050',
  primary_300: '#6B9FF8',
  primary_400: '#B0CFF9',
  primary_gradient: 'linear-gradient(135deg, #3A78E8 0%, #6B9FF8 100%)',

  secondary: '#B49AEE',
  secondary_100: '#221a33',
  secondary_200: '#352A55',
  secondary_300: '#B49AEE',
  secondary_400: '#D4C6F5',
  secondary_gradient: 'linear-gradient(135deg, #7B4FD8 0%, #B49AEE 100%)',

  info: '#7DD3E8',
  info_100: '#152A30',
  info_200: '#1A6B80',
  info_300: '#7DD3E8',
  info_400: '#B8E8F2',

  success: '#5EC98E',
  success_100: '#152B1F',
  success_200: '#2D7A5A',
  success_300: '#5EC98E',
  success_400: '#A8E6C3',
  success_gradient: 'linear-gradient(135deg, #3DAF6E 0%, #5EC98E 100%)',

  warn: '#F5C842',
  warn_100: '#2B2515',
  warn_200: '#B8862A',
  warn_300: '#F5C842',
  warn_400: '#FAEAB0',

  error: '#F09070',
  error_100: '#2E1A15',
  error_200: '#B84030',
  error_300: '#F09070',
  error_400: '#F8C4B0',

  white: '#1E1E24',

  grey_100: '#252530',
  grey_200: '#1E1E24',
  grey_300: '#2E2E38',
  grey_400: '#3D3D4A',
  grey_500: '#7A7A8A',
  grey_600: '#A8A8B8',
  grey_700: '#C5C5D0',
  grey_800: '#E2E2EA',
  grey_900: '#F2F2F5',

  purple_100: '#6020E0',
  purple_400: '#B860FF',

  background: '#141418',
  surface: '#1C1C22',
  surfaceAlt: '#252530',
  text: '#EAEAF0',
  textSecondary: '#A0A0B0',
  border: '#35354A',
  borderLight: '#45455A',
  divider: '#30303E',
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
  z_01: '0rem 0.063rem 0.25rem 0rem rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03)',
  z_04: '0rem 0.25rem 0.5rem 0rem rgba(0, 0, 0, 0.4)',
  z_08: '0rem 0.5rem 1rem 0rem rgba(0, 0, 0, 0.45)',
  z_12: '0rem 0.75rem 1.5rem -0.25rem rgba(0, 0, 0, 0.5)',
  z_16: '0rem 1rem 2rem -0.25rem rgba(0, 0, 0, 0.5)',
  z_20: '0rem 1.25rem 2.5rem -0.25rem rgba(0, 0, 0, 0.55)',
  z_24: '0rem 1.5rem 3rem 0rem rgba(0, 0, 0, 0.55)',
  cards: '0rem 0.125rem 0.5rem -0.125rem rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.04)',
  dialogs: '-2.5rem 2.5rem 5rem -0.5rem rgba(0, 0, 0, 0.6)',
  dropdown: '0rem 0.5rem 1.5rem -0.25rem rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
  circle_button: '0 0 0.15rem rgba(0, 0, 0, 0.4)',
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
