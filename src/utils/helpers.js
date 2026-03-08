/**
 * src/utils/helpers.js — Fungsi Utilitas Global
 * ============================================================
 * Kumpulan helper yang dipakai di seluruh aplikasi.
 * Import sesuai kebutuhan: import { formatCurrency } from '../utils/helpers';
 * ============================================================
 */

/**
 * Format angka menjadi format Rupiah Indonesia
 * Contoh: 25000 → "Rp 25.000"
 *
 * @param {number} amount - Jumlah uang
 * @param {boolean} showSymbol - Tampilkan "Rp" atau tidak (default: true)
 * @returns {string}
 */
export const formatCurrency = (amount, showSymbol = true) => {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('id-ID');
  return showSymbol ? `Rp ${formatted}` : formatted;
};

/**
 * Format tanggal ke format Indonesia
 * Contoh: "2025-03-05 14:30:00" → "05 Mar 2025, 14:30"
 *
 * @param {string|Date} dateString - Tanggal dalam string ISO atau object Date
 * @param {boolean} showTime - Tampilkan jam atau tidak (default: true)
 * @returns {string}
 */
export const formatDate = (dateString, showTime = true) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (!showTime) return dateStr;
    const timeStr = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return dateString;
  }
};

/**
 * Format tanggal ke format YYYY-MM-DD (untuk query API)
 * Contoh: new Date() → "2025-03-05"
 *
 * @param {Date} date - Object Date (default: hari ini)
 * @returns {string}
 */
export const toApiDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

/**
 * Hitung persentase
 * Contoh: calcPercent(500, 2500) → "20%"
 *
 * @param {number} part - Bagian
 * @param {number} total - Total
 * @returns {string}
 */
export const calcPercent = (part, total) => {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

/**
 * Truncate (potong) teks panjang dengan "..."
 * Contoh: truncate("Nasi Goreng Spesial Super", 15) → "Nasi Goreng Spe..."
 *
 * @param {string} text
 * @param {number} maxLength - Panjang maksimal (default: 20)
 * @returns {string}
 */
export const truncate = (text, maxLength = 20) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Debounce — tunda eksekusi fungsi sampai tidak dipanggil lagi dalam delay ms
 * Berguna untuk search input agar tidak hit API tiap ketikan
 *
 * @param {Function} func - Fungsi yang di-debounce
 * @param {number} delay - Delay dalam ms (default: 500)
 * @returns {Function}
 */
export const debounce = (func, delay = 500) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Validasi nomor telepon Indonesia
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Validasi email sederhana
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Konversi uang ke teks (untuk keperluan struk)
 * Contoh: 25000 → "Dua Puluh Lima Ribu Rupiah"
 *
 * @param {number} amount
 * @returns {string}
 */
export const toWords = (amount) => {
  // Implementasi sederhana untuk nilai umum kasir
  const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
    'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
  if (amount === 0) return 'Nol Rupiah';
  if (amount < 20) return units[amount] + ' Rupiah';
  // Fallback ke format angka untuk nilai besar
  return `${formatCurrency(amount)} Rupiah`;
};

/**
 * Generate nomor invoice lokal (backup jika API offline)
 * Format: INV-YYYYMMDD-XXXXX
 * @returns {string}
 */
export const generateLocalInvoice = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `INV-${date}-${rand}`;
};