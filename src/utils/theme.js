/**
 * src/utils/theme.js — Design System dengan Dark/Light Mode
 * AprilTech POS Mobile v2.0
 */

export const DARK_COLORS = {
  // Brand
  primary:      '#6C63FF',
  primaryDark:  '#5A52D5',
  primaryLight: '#8B85FF',
  accent:       '#FF6584',
  accentGold:   '#FFB547',

  // Status
  success:  '#00C896',
  warning:  '#FFB547',
  danger:   '#FF4757',
  info:     '#2196F3',

  // Backgrounds - deep navy dark
  bgDark:   '#0A0A14',
  bgMedium: '#12121F',
  bgCard:   '#1A1A2E',
  bgCardHover: '#1E1E36',
  bgInput:  '#151525',
  bgModal:  '#12121F',
  bgElevated: '#1E1E35',
  bgSurface: '#252540',

  // Text
  textWhite: '#FFFFFF',
  textLight: '#E2E2F0',
  textMuted: '#8888A8',
  textDark:  '#4A4A6A',
  textHint:  '#333355',

  // Borders
  border:       '#252545',
  borderLight:  '#303058',
  divider:      '#1A1A30',
  borderFocus:  '#6C63FF',

  // Special
  shimmer1: '#1A1A2E',
  shimmer2: '#252545',
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',

  // Tab bar
  tabBg: '#0F0F1E',
  tabActive: '#6C63FF',
  tabInactive: '#4A4A6A',
};

export const LIGHT_COLORS = {
  // Brand (same)
  primary:      '#6C63FF',
  primaryDark:  '#5A52D5',
  primaryLight: '#8B85FF',
  accent:       '#FF6584',
  accentGold:   '#F59E0B',

  // Status
  success:  '#059669',
  warning:  '#D97706',
  danger:   '#DC2626',
  info:     '#2563EB',

  // Backgrounds - clean white/gray
  bgDark:   '#F0F0F8',
  bgMedium: '#FFFFFF',
  bgCard:   '#FFFFFF',
  bgCardHover: '#F8F8FF',
  bgInput:  '#F5F5FC',
  bgModal:  '#FFFFFF',
  bgElevated: '#FAFAFA',
  bgSurface: '#F0F0F8',

  // Text
  textWhite: '#1A1A2E',
  textLight: '#2D2D4A',
  textMuted: '#6B6B8A',
  textDark:  '#9999B8',
  textHint:  '#BBBBCC',

  // Borders
  border:       '#E8E8F0',
  borderLight:  '#D0D0E8',
  divider:      '#F0F0F8',
  borderFocus:  '#6C63FF',

  // Special
  shimmer1: '#F0F0F8',
  shimmer2: '#E8E8F8',
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.25)',

  // Tab bar
  tabBg: '#FFFFFF',
  tabActive: '#6C63FF',
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
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
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
    elevation: 4,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  md: {
    elevation: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  lg: {
    elevation: 16,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  colored: (color = '#6C63FF') => ({
    elevation: 8,
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  }),
};
