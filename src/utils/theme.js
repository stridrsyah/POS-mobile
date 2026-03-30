/**
 * src/utils/theme.js — Design System Dark/Light Mode v2.1
 * AprilTech POS Mobile — Full konsistensi tema terang & gelap
 */

export const DARK_COLORS = {
  primary:      '#6C63FF',
  primaryDark:  '#5A52D5',
  primaryLight: '#8B85FF',
  accent:       '#FF6584',
  accentGold:   '#FFB547',

  success:  '#00C896',
  warning:  '#FFB547',
  danger:   '#FF4757',
  info:     '#2196F3',

  bgDark:      '#0A0A14',
  bgMedium:    '#12121F',
  bgCard:      '#1A1A2E',
  bgCardHover: '#1E1E36',
  bgInput:     '#151525',
  bgModal:     '#12121F',
  bgElevated:  '#1E1E35',
  bgSurface:   '#252540',

  textWhite: '#FFFFFF',
  textLight: '#E2E2F0',
  textMuted: '#8888A8',
  textDark:  '#4A4A6A',
  textHint:  '#333355',

  border:      '#252545',
  borderLight: '#303058',
  divider:     '#1A1A30',
  borderFocus: '#6C63FF',

  shimmer1: '#1A1A2E',
  shimmer2: '#252545',
  overlay:      'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',

  tabBg:      '#0F0F1E',
  tabActive:  '#6C63FF',
  tabInactive:'#4A4A6A',
};

export const LIGHT_COLORS = {
  primary:      '#6C63FF',
  primaryDark:  '#5A52D5',
  primaryLight: '#8B85FF',
  accent:       '#FF6584',
  accentGold:   '#F59E0B',

  success:  '#059669',
  warning:  '#D97706',
  danger:   '#DC2626',
  info:     '#2563EB',

  // ---- BACKGROUNDS: semua putih bersih ----
  bgDark:      '#F5F5FA',   // background layar utama
  bgMedium:    '#FFFFFF',   // header, tab bar
  bgCard:      '#FFFFFF',   // kartu/section
  bgCardHover: '#F8F8FF',
  bgInput:     '#F5F5FC',
  bgModal:     '#FFFFFF',
  bgElevated:  '#FAFAFA',
  bgSurface:   '#F0F0F8',

  // ---- TEXT ----
  textWhite: '#1A1A2E',   // teks utama di light mode
  textLight: '#2D2D4A',
  textMuted: '#6B6B8A',
  textDark:  '#9999B8',
  textHint:  '#BBBBCC',

  // ---- BORDERS: sangat tipis & subtle ----
  border:      '#EBEBF5',   // border tipis — tidak terlihat sebagai garis tebal
  borderLight: '#E0E0EE',
  divider:     '#F2F2F8',   // divider antar item — hampir tidak terlihat
  borderFocus: '#6C63FF',

  shimmer1: '#F0F0F8',
  shimmer2: '#E8E8F8',
  overlay:      'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(0,0,0,0.2)',

  // ---- TAB BAR ----
  tabBg:       '#FFFFFF',
  tabActive:   '#6C63FF',
  tabInactive: '#9999B8',
};

// Default export untuk backward compat
export const COLORS = DARK_COLORS;

export const FONTS = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,

  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  black:    '900',
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  xxxl: 40,
};

export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  full: 999,
};

export const SHADOW = {
  sm: {
    elevation: 3,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  md: {
    elevation: 6,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  lg: {
    elevation: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  colored: (color = '#6C63FF') => ({
    elevation: 8,
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  }),
};
