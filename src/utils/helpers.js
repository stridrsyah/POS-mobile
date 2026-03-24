/**
 * src/utils/helpers.js — Fungsi Utilitas Global v2
 */

export const formatCurrency = (amount, showSymbol = true) => {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('id-ID');
  return showSymbol ? `Rp ${formatted}` : formatted;
};

export const formatCurrencyCompact = (amount) => {
  const num = Number(amount) || 0;
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}jt`;
  if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return `Rp ${num}`;
};

export const formatDate = (dateString, showTime = true) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    if (!showTime) return dateStr;
    const timeStr = date.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit',
    });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return dateString;
  }
};

export const formatDateShort = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  } catch { return '-'; }
};

export const toApiDate = (date = new Date()) => date.toISOString().split('T')[0];

export const calcPercent = (part, total) => {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

export const truncate = (text, maxLength = 20) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const debounce = (func, delay = 500) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const isValidPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const generateLocalInvoice = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `INV-${date}-${rand}`;
};

export const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'Dini Hari';
  if (h < 11) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 18) return 'Sore';
  return 'Malam';
};

export const getGreeting = () => {
  const tod = getTimeOfDay();
  return `Selamat ${tod}`;
};

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const percentOf = (part, total) => {
  if (!total) return 0;
  return (part / total) * 100;
};
