/**
 * src/services/offlineService.js
 * Offline-first caching & sync untuk POS Mobile
 * 
 * Strategy:
 * - Products: cache setelah fetch, serve dari cache saat offline
 * - Transactions: queue lokal, sync saat online
 * - Dashboard: cache stats terakhir
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ── Keys ─────────────────────────────────────────────────────
const KEYS = {
  PRODUCTS:         'offline_products',
  CATEGORIES:       'offline_categories',
  SUPPLIERS:        'offline_suppliers',
  CUSTOMERS:        'offline_customers',
  DASHBOARD:        'offline_dashboard',
  TRANSACTIONS:     'offline_transactions',        // riwayat dari server
  PENDING_TRX:      'offline_pending_transactions', // antrian belum sync
  RECEIPT_SETTINGS: 'offline_receipt_settings',
  PROMOS:           'offline_promos',
  LAST_SYNC:        'offline_last_sync',
  IS_ONLINE:        'offline_is_online',
};

const CACHE_TTL = {
  PRODUCTS:   60 * 60 * 1000,   // 1 jam
  CATEGORIES: 24 * 60 * 60 * 1000, // 24 jam
  DASHBOARD:  5 * 60 * 1000,    // 5 menit
  PROMOS:     30 * 60 * 1000,   // 30 menit
};

// ── Network State ─────────────────────────────────────────────
let _isOnline = true;
let _listeners = [];

export const initNetworkListener = () => {
  // Fallback jika NetInfo tidak tersedia
  try {
    const NetInfoModule = require('@react-native-community/netinfo').default;
    return NetInfoModule.addEventListener(state => {
      _isOnline = state.isConnected && state.isInternetReachable !== false;
      _listeners.forEach(fn => fn(_isOnline));
    });
  } catch {
    // NetInfo tidak ada, assume online
    _isOnline = true;
    return () => {};
  }
};

export const isOnline = () => _isOnline;

export const onNetworkChange = (fn) => {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
};

export const checkOnline = async () => {
  try {
    const NetInfoModule = require('@react-native-community/netinfo').default;
    const state = await NetInfoModule.fetch();
    _isOnline = state.isConnected && state.isInternetReachable !== false;
    return _isOnline;
  } catch {
    return _isOnline;
  }
};

// ── Cache Helpers ─────────────────────────────────────────────
const saveCache = async (key, data) => {
  try {
    const payload = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('[Offline] saveCache error:', e.message);
  }
};

const loadCache = async (key, ttl = null) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (ttl && Date.now() - timestamp > ttl) return null; // expired
    return data;
  } catch {
    return null;
  }
};

const clearCache = async (key) => {
  try { await AsyncStorage.removeItem(key); } catch {}
};

// ── Products Cache ────────────────────────────────────────────
export const offlineProducts = {
  save: (products) => saveCache(KEYS.PRODUCTS, products),
  load: () => loadCache(KEYS.PRODUCTS, CACHE_TTL.PRODUCTS),
  loadForce: () => loadCache(KEYS.PRODUCTS), // abaikan TTL
};

export const offlineCategories = {
  save: (data) => saveCache(KEYS.CATEGORIES, data),
  load: () => loadCache(KEYS.CATEGORIES, CACHE_TTL.CATEGORIES),
};

export const offlineSuppliers = {
  save: (data) => saveCache(KEYS.SUPPLIERS, data),
  load: () => loadCache(KEYS.SUPPLIERS),
};

export const offlineCustomers = {
  save: (data) => saveCache(KEYS.CUSTOMERS, data),
  load: () => loadCache(KEYS.CUSTOMERS),
};

export const offlineDashboard = {
  save: (data) => saveCache(KEYS.DASHBOARD, data),
  load: () => loadCache(KEYS.DASHBOARD, CACHE_TTL.DASHBOARD),
  loadForce: () => loadCache(KEYS.DASHBOARD),
};

export const offlineReceiptSettings = {
  save: (data) => saveCache(KEYS.RECEIPT_SETTINGS, data),
  load: () => loadCache(KEYS.RECEIPT_SETTINGS),
};

export const offlinePromos = {
  save: (data) => saveCache(KEYS.PROMOS, data),
  load: () => loadCache(KEYS.PROMOS, CACHE_TTL.PROMOS),
};

export const offlineTransactions = {
  save: (data) => saveCache(KEYS.TRANSACTIONS, data),
  load: () => loadCache(KEYS.TRANSACTIONS),
};

// ── Pending Transactions (offline queue) ──────────────────────
export const pendingTransactions = {
  /**
   * Tambah transaksi ke antrian offline
   */
  add: async (txData) => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.PENDING_TRX);
      const queue = raw ? JSON.parse(raw) : [];
      const pending = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        data: txData,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      queue.push(pending);
      await AsyncStorage.setItem(KEYS.PENDING_TRX, JSON.stringify(queue));
      return pending;
    } catch (e) {
      console.error('[Offline] pendingTransactions.add error:', e);
      throw e;
    }
  },

  /**
   * Ambil semua pending transactions
   */
  getAll: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.PENDING_TRX);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Hapus pending transaction setelah berhasil sync
   */
  remove: async (localId) => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.PENDING_TRX);
      const queue = raw ? JSON.parse(raw) : [];
      const updated = queue.filter(t => t.id !== localId);
      await AsyncStorage.setItem(KEYS.PENDING_TRX, JSON.stringify(updated));
    } catch {}
  },

  /**
   * Hitung jumlah pending
   */
  count: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.PENDING_TRX);
      const queue = raw ? JSON.parse(raw) : [];
      return queue.length;
    } catch {
      return 0;
    }
  },

  /**
   * Sync semua pending ke server
   * @param {Function} apiCreate - fungsi API create transaction
   * @returns {{ success: number, failed: number }}
   */
  sync: async (apiCreate) => {
    const queue = await pendingTransactions.getAll();
    let success = 0, failed = 0;

    for (const pending of queue) {
      try {
        const result = await apiCreate(pending.data);
        if (result.success) {
          await pendingTransactions.remove(pending.id);
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { success, failed };
  },
};

// ── Last Sync Info ────────────────────────────────────────────
export const syncInfo = {
  update: async () => {
    try {
      await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
    } catch {}
  },
  get: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.LAST_SYNC);
      return raw ? new Date(raw) : null;
    } catch {
      return null;
    }
  },
  getLabel: async () => {
    const date = await syncInfo.get();
    if (!date) return 'Belum pernah sync';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
  },
};

// ── Clear All Cache ───────────────────────────────────────────
export const clearAllCache = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch {}
};

export const getCacheSize = async () => {
  try {
    const keys = Object.values(KEYS);
    let totalChars = 0;
    for (const key of keys) {
      const val = await AsyncStorage.getItem(key);
      if (val) totalChars += val.length;
    }
    // ~2 bytes per char average
    const bytes = totalChars * 2;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  } catch {
    return '0 KB';
  }
};

export default {
  isOnline,
  checkOnline,
  onNetworkChange,
  initNetworkListener,
  offlineProducts,
  offlineCategories,
  offlineSuppliers,
  offlineCustomers,
  offlineDashboard,
  offlineReceiptSettings,
  offlinePromos,
  offlineTransactions,
  pendingTransactions,
  syncInfo,
  clearAllCache,
  getCacheSize,
};
