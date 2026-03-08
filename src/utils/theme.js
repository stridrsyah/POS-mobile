/**
 * src/utils/theme.js — Design System Aplikasi POS Mobile
 * ============================================================
 * Semua warna, ukuran font, spacing, dan shadow terpusat di sini.
 * Ubah nilai di sini untuk mengubah tampilan seluruh aplikasi.
 * ============================================================
 */

export const COLORS = {
  // ── Warna Utama (Brand) ──────────────────────────────────
  primary:      '#6C63FF',   // Ungu utama — tombol, aktif
  primaryDark:  '#5A52D5',   // Hover / pressed state
  primaryLight: '#8B85FF',   // Teks terang di atas dark
  accent:       '#FF6584',   // Warna aksen (notifikasi, highlight)

  // ── Status ───────────────────────────────────────────────
  success:  '#4CAF50',       // Hijau — berhasil, stok cukup
  warning:  '#FF9800',       // Oranye — peringatan, stok hampir habis
  danger:   '#F44336',       // Merah — error, hapus, stok habis
  info:     '#2196F3',       // Biru — informasi

  // ── Latar Belakang (Dark Theme) ──────────────────────────
  bgDark:   '#0F0F1A',       // Latar paling gelap (body utama)
  bgMedium: '#1A1A2E',       // Header, tab bar, card header
  bgCard:   '#252540',       // Kartu produk, list item
  bgInput:  '#1E1E35',       // Input form
  bgModal:  '#1A1A2E',       // Modal / bottom sheet

  // ── Teks ─────────────────────────────────────────────────
  textWhite: '#FFFFFF',      // Teks utama
  textLight: '#E0E0E0',      // Teks sekunder
  textMuted: '#9E9E9E',      // Teks placeholder, label kecil
  textDark:  '#5C5C7A',      // Teks sangat redup

  // ── Garis ────────────────────────────────────────────────
  border:       '#2D2D4A',   // Border card & input
  borderLight:  '#3D3D60',   // Border lebih terang
  divider:      '#1E1E35',   // Pemisah list item
};

export const FONTS = {
  // Ukuran font (sp/dp, responsive di semua HP)
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,

  // Font weight (gunakan sebagai nilai fontWeight)
  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  black:    '900',
};

export const SPACING = {
  // Jarak antar elemen (dp)
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
};

export const RADIUS = {
  // Border radius (dp)
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 999, // Lingkaran penuh (badge, chip)
};

export const SHADOW = {
  // Shadow preset untuk elevation
  sm: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  md: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  lg: {
    elevation: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
};