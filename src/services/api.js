import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── KONFIGURASI SERVER ──────────────────────────────────────
// URL dibaca dari AsyncStorage (bisa diubah via ServerSettingsScreen)
// Default: URL ngrok terakhir
const DEFAULT_BASE_URL  = 'https://maxie-sylphic-externally.ngrok-free.dev';
const API_PATH          = '/pos-app/mobile_api.php';
const UPLOADS_PATH      = '/pos-app/public/uploads/products/';
export const SERVER_URL_KEY = 'server_base_url';

// Helper: ambil base URL dari storage (dengan fallback)
const getBaseUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    return (saved || DEFAULT_BASE_URL).replace(/\/$/, '');
  } catch {
    return DEFAULT_BASE_URL;
  }
};

export const getApiUrl     = async () => (await getBaseUrl()) + API_PATH;
export const getUploadsUrl = async () => (await getBaseUrl()) + UPLOADS_PATH;

// Cache URL — diisi saat app start via initImageCache()
let _cachedBase = DEFAULT_BASE_URL;
export const initImageCache = async () => {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (saved) _cachedBase = saved.replace(/\/$/, '');
  } catch {}
};

export const SERVER_IP   = 'maxie-sylphic-externally.ngrok-free.dev';
export const BASE_URL    = DEFAULT_BASE_URL + API_PATH;
export const UPLOADS_URL = DEFAULT_BASE_URL + UPLOADS_PATH;

const TIMEOUT_MS = 15000;

// ─── HELPER: Resolve URL Foto Produk ─────────────────────────
export const getImageUrl = (product) => {
  if (!product) return null;

  // Prioritas 1: photo_url dari server (sudah lengkap, fix http→https)
  if (product.photo_url && product.photo_url.trim() !== '') {
    // Paksa https agar APK Android tidak reject cleartext HTTP
    return product.photo_url.replace(/^http:\/\//, 'https://');
  }

  // Prioritas 2: bangun URL dari nama file + cached base
  if (product.photo && product.photo.trim() !== '') {
    return _cachedBase + UPLOADS_PATH + product.photo;
  }

  return null;
};

// Async version — baca URL dari AsyncStorage (akurat)
export const getImageUrlAsync = async (product) => {
  if (!product) return null;
  if (product.photo_url && product.photo_url.startsWith('http')) return product.photo_url;
  if (product.photo && product.photo.trim() !== '') {
    const base = await getBaseUrl();
    return base + UPLOADS_PATH + product.photo;
  }
  return null;
};

// ─── CORE: Request dengan Timeout ────────────────────────────
const fetchWithTimeout = (url, options = {}) =>
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('⏱ Server tidak merespons. Pastikan XAMPP aktif dan ngrok berjalan.')), TIMEOUT_MS)
    ),
  ]);

const request = async (endpoint, method = 'GET', body = null, requireAuth = true) => {
  try {
    const baseUrl = await getApiUrl();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
    if (requireAuth) {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method, headers };
    if (body && method !== 'GET') config.body = JSON.stringify(body);
    const url = `${baseUrl}${endpoint}`;
    console.log(`[API] ${method} ${url}`);
    const response = await fetchWithTimeout(url, config);
    let data;
    try { data = await response.json(); } catch {
      throw new Error(`Server tidak mengirim JSON valid. Status: ${response.status}`);
    }
    if (!response.ok) throw new Error(data.message || `Error HTTP ${response.status}`);
    return { success: true, data: data.data ?? data };
  } catch (error) {
    console.error(`[API ERROR] ${method} ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── UPLOAD (multipart/form-data) ────────────────────────────
const uploadRequest = async (endpoint, formData) => {
  try {
    const baseUrl = await getApiUrl();
    const token   = await AsyncStorage.getItem('auth_token');
    const headers = {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `${baseUrl}${endpoint}`;
    const response = await fetchWithTimeout(url, { method: 'POST', headers, body: formData });
    let data;
    try { data = await response.json(); } catch {
      throw new Error(`Server tidak mengirim JSON valid. Status: ${response.status}`);
    }
    if (!response.ok) throw new Error(data.message || `Error HTTP ${response.status}`);
    return { success: true, data: data.data ?? data };
  } catch (error) {
    console.error(`[UPLOAD ERROR] ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── AUTH ─────────────────────────────────────────────────────
export const authAPI = {
  login: (usernameOrEmail, password) =>
    request('/auth/login', 'POST',
      { username: usernameOrEmail, email: usernameOrEmail, password },
      false
    ),
 
  logout: () => request('/auth/logout', 'POST'),
 
  // Register owner baru — tidak butuh token, auto-login
  register: (data) =>
    request('/auth/register', 'POST', {
      name:                  data.name,
      business_name:         data.business_name,
      email:                 data.email,
      password:              data.password,
      password_confirmation: data.password_confirmation,
      phone:                 data.phone,
    }, false),
};

// ─── DASHBOARD ────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => request('/dashboard', 'GET'),
};

// ─── PRODUCTS ─────────────────────────────────────────────────
export const productsAPI = {
  getAll: async () => {
    const result = await request('/products', 'GET');
    if (result.success && result.data) {
      result.data = result.data.map(product => ({
        ...product,
        buying_price: product.buying_price || product.purchase_price || 0
      }));
    }
    return result;
  },
  getById: async (id) => {
    const result = await request(`/products/${id}`, 'GET');
    if (result.success && result.data) {
      result.data.buying_price = result.data.buying_price || result.data.purchase_price || 0;
    }
    return result;
  },
  search: async (keyword) => {
    const result = await request(`/products?q=${encodeURIComponent(keyword)}`, 'GET');
    if (result.success && result.data) {
      result.data = result.data.map(product => ({
        ...product,
        buying_price: product.buying_price || product.purchase_price || 0
      }));
    }
    return result;
  },
  getByBarcode: async (barcode) => {
    const result = await request(`/products?code=${encodeURIComponent(barcode)}`, 'GET');
    if (result.success && result.data) {
      result.data.buying_price = result.data.buying_price || result.data.purchase_price || 0;
    }
    return result;
  },
  getLowStock: () => request('/stock/low', 'GET'),
  create: (data) => {
    const serverData = {
      name: data.name, barcode: data.barcode || '',
      category_id: data.category_id || null, supplier_id: data.supplier_id || null,
      purchase_price: data.purchase_price || data.buying_price || 0,
      selling_price: data.selling_price, stock: data.stock || 0,
      min_stock: data.min_stock || 5, unit: data.unit || 'pcs', description: data.description || ''
    };
    return request('/products', 'POST', serverData);
  },
  update: (id, data) => {
    const serverData = {
      name: data.name, barcode: data.barcode, category_id: data.category_id,
      supplier_id: data.supplier_id, purchase_price: data.purchase_price || data.buying_price,
      selling_price: data.selling_price, stock: data.stock, min_stock: data.min_stock,
      unit: data.unit, description: data.description, is_active: data.is_active
    };
    Object.keys(serverData).forEach(key => serverData[key] === undefined && delete serverData[key]);
    return request(`/products/${id}`, 'PUT', serverData);
  },
  delete: (id) => request(`/products/${id}`, 'DELETE'),
  uploadPhoto: async (productId, photoUri) => {
    const formData = new FormData();
    const ext  = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    formData.append('photo', { uri: photoUri, name: `product_${productId}.${ext}`, type: mime });
    return uploadRequest(`/products/${productId}/photo`, formData);
  },
};

// ─── CATEGORIES ───────────────────────────────────────────────
export const categoriesAPI = {
  getAll: () => request('/categories', 'GET'),
  create: (data) => request('/categories', 'POST', data),
  update: (id, data) => request(`/categories/${id}`, 'PUT', data),
  delete: (id) => request(`/categories/${id}`, 'DELETE'),
};

// ─── TRANSACTIONS ─────────────────────────────────────────────
export const transactionsAPI = {
  getAll: (startDate, endDate) => {
    const s = startDate || new Date().toISOString().split('T')[0];
    const e = endDate   || new Date().toISOString().split('T')[0];
    return request(`/transactions?start_date=${s}&end_date=${e}`, 'GET');
  },
  getById: (id) => request(`/transactions/${id}`, 'GET'),
  create: (data) => {
    const normalized = {
      customer_id: data.customer_id || null, items: data.items || [],
      subtotal: data.subtotal || 0, discount: data.discount || 0,
      total: data.total || 0, payment_amount: data.payment_amount || 0,
      change_amount: data.change_amount || 0,
      payment_method: data.payment_method || 'cash', notes: data.notes || '',
    };
    return request('/transactions', 'POST', normalized);
  },
};

// ─── CUSTOMERS ────────────────────────────────────────────────
export const customersAPI = {
  getAll: () => request('/customers', 'GET'),
  getById: (id) => request(`/customers/${id}`, 'GET'),
  create: (data) => request('/customers', 'POST', data),
  update: (id, data) => request(`/customers/${id}`, 'PUT', data),
  remove: (id) => request(`/customers/${id}`, 'DELETE'),
};

// ─── SUPPLIERS ────────────────────────────────────────────────
export const suppliersAPI = {
  getAll: () => request('/suppliers', 'GET'),
  create: (data) => request('/suppliers', 'POST', data),
  update: (id, data) => request(`/suppliers/${id}`, 'PUT', data),
  delete: (id) => request(`/suppliers/${id}`, 'DELETE'),
};

// ─── STOCK ────────────────────────────────────────────────────
export const stockAPI = {
  low: () => request('/stock/low', 'GET'),
  addIn: (data) => request('/stock/in', 'POST', data),
};

// ─── REPORTS ──────────────────────────────────────────────────
export const reportsAPI = {
  daily: (date) => request(`/reports/summary?start_date=${date}&end_date=${date}`, 'GET'),
  sales: (s, e) => request(`/reports/sales?start_date=${s}&end_date=${e}`, 'GET'),
  profit: (s, e) => request(`/reports/profit?start_date=${s}&end_date=${e}`, 'GET'),
  topProducts: (s, e, limit = 10) => request(`/reports/top_products?start_date=${s}&end_date=${e}&limit=${limit}`, 'GET'),
  salesBySupplier: (s, e) => request(`/reports/sales_by_supplier?start_date=${s}&end_date=${e}`, 'GET'),
};

// ─── ANALYTICS & EXPORT ───────────────────────────────────────
export const analyticsAPI = {
  get: (s, e) => request(`/reports/analytics?start_date=${s}&end_date=${e}`, 'GET'),
};
export const exportAPI = {
  sales: (s, e) => request(`/export/sales/${s}/${e}/excel`, 'GET'),
  profit: (s, e) => request(`/export/profit/${s}/${e}/excel`, 'GET'),
  topProducts: (s, e) => request(`/export/top-products/${s}/${e}/excel`, 'GET'),
};

// ─── RECEIPT ──────────────────────────────────────────────────
export const receiptAPI = {
  getData: (transactionId) => request(`/receipt/${transactionId}`, 'GET'),
};

// ─── RECEIPT SETTINGS ─────────────────────────────────────────
export const receiptSettingsAPI = {
  get: () => request('/receipt-settings', 'GET'),
  save: (data) => request('/receipt-settings', 'POST', data),
};

// ─── USERS ────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => request('/users', 'GET'),
  create: (data) => request('/users', 'POST', data),
  update: (id, data) => request(`/users/${id}`, 'PUT', data),
  delete: (id) => request(`/users/${id}`, 'DELETE'),
};

// ─── PROMOS ───────────────────────────────────────────────────
export const promosAPI = {
  getAll: () => request('/promos', 'GET'),
  getActive: () => request('/promos', 'GET'),
  create: (data) => request('/promos', 'POST', data),
  update: (id, data) => request(`/promos/${id}`, 'PUT', data),
  delete: (id) => request(`/promos/${id}`, 'DELETE'),
};

// ─── STAFF — kelola karyawan (owner only) ──────────────────────────────
export const staffAPI = {
  getAll:  ()          => request('/staff',       'GET'),
  create:  (data)      => request('/staff',       'POST',   data),
  update:  (id, data)  => request(`/staff/${id}`, 'PUT',    data),
  remove:  (id)        => request(`/staff/${id}`, 'DELETE'),
};