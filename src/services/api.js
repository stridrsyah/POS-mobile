import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── KONFIGURASI SERVER ──────────────────────────────────────
// ⚠️ GANTI IP ini dengan IP laptop/server kamu!
export const SERVER_IP = ' 192.168.43.197';
export const BASE_URL = `http://192.168.43.197/pos-app/mobile_api.php`;
export const UPLOADS_URL = `http://192.168.43.197/pos-app/public/uploads/products/`;

const TIMEOUT_MS = 15000;

// ─── HELPER: Resolve URL Foto Produk ─────────────────────────
export const getImageUrl = (product) => {
  if (!product) return null;
  if (product.photo_url && product.photo_url.startsWith('http')) return product.photo_url;
  if (product.photo && product.photo.trim() !== '') {
    const base = UPLOADS_URL.endsWith('/') ? UPLOADS_URL : UPLOADS_URL + '/';
    return base + product.photo;
  }
  return null;
};

// ─── CORE: Request dengan Timeout ────────────────────────────
const fetchWithTimeout = (url, options = {}) =>
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('⏱ Server tidak merespons. Pastikan XAMPP aktif dan IP benar.')), TIMEOUT_MS)
    ),
  ]);

const request = async (endpoint, method = 'GET', body = null, requireAuth = true) => {
  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (requireAuth) {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method, headers };
    if (body && method !== 'GET') config.body = JSON.stringify(body);
    const url = `${BASE_URL}${endpoint}`;
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
    const token = await AsyncStorage.getItem('auth_token');
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `${BASE_URL}${endpoint}`;
    console.log(`[API] UPLOAD ${url}`);
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
    request('/auth/login', 'POST', { username: usernameOrEmail, email: usernameOrEmail, password }, false),
  logout: () => request('/auth/logout', 'POST'),
};

// ─── DASHBOARD ────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => request('/dashboard', 'GET'),
};

// ─── PRODUCTS ─────────────────────────────────────────────────
// ─── PRODUCTS ─────────────────────────────────────────────────
export const productsAPI = {
  getAll: async () => {
    const result = await request('/products', 'GET');
    if (result.success && result.data) {
      // Konversi purchase_price ke buying_price untuk konsistensi di frontend
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
    // Kirim sebagai purchase_price ke server
    const serverData = {
      name: data.name,
      barcode: data.barcode || '',
      category_id: data.category_id || null,
      supplier_id: data.supplier_id || null,
      purchase_price: data.purchase_price || data.buying_price || 0,
      selling_price: data.selling_price,
      stock: data.stock || 0,
      min_stock: data.min_stock || 5,
      unit: data.unit || 'pcs',
      description: data.description || ''
    };
    return request('/products', 'POST', serverData);
  },

  update: (id, data) => {
    const serverData = {
      name: data.name,
      barcode: data.barcode,
      category_id: data.category_id,
      supplier_id: data.supplier_id,
      purchase_price: data.purchase_price || data.buying_price,
      selling_price: data.selling_price,
      stock: data.stock,
      min_stock: data.min_stock,
      unit: data.unit,
      description: data.description,
      is_active: data.is_active
    };
    // Hapus undefined values
    Object.keys(serverData).forEach(key =>
      serverData[key] === undefined && delete serverData[key]
    );
    return request(`/products/${id}`, 'PUT', serverData);
  },

  delete: (id) => request(`/products/${id}`, 'DELETE'),

  uploadPhoto: async (productId, photoUri) => {
    const formData = new FormData();
    const ext = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
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
    const e = endDate || new Date().toISOString().split('T')[0];
    return request(`/transactions?start_date=${s}&end_date=${e}`, 'GET');
  },
  getById: (id) => request(`/transactions/${id}`, 'GET'),
  create: (data) => {
    const normalized = {
      customer_id: data.customer_id || null,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      total: data.total || 0,
      payment_amount: data.payment_amount || 0,
      change_amount: data.change_amount || 0,
      payment_method: data.payment_method || 'cash',
      notes: data.notes || '',
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
  sales: (startDate, endDate) => request(`/reports/sales?start_date=${startDate}&end_date=${endDate}`, 'GET'),
  profit: (startDate, endDate) => request(`/reports/profit?start_date=${startDate}&end_date=${endDate}`, 'GET'),
  topProducts: (startDate, endDate, limit = 10) => request(`/reports/top_products?start_date=${startDate}&end_date=${endDate}&limit=${limit}`, 'GET'),
  salesBySupplier: (startDate, endDate) => request(`/reports/sales_by_supplier?start_date=${startDate}&end_date=${endDate}`, 'GET'),
};

// ─── EXPORT ───────────────────────────────────────────────────
export const analyticsAPI = {
  get: (startDate, endDate) => request(`/reports/analytics?start_date=${startDate}&end_date=${endDate}`, 'GET'),
};

export const exportAPI = {
  sales: (s, e) => request(`/export/sales/${s}/${e}/excel`, 'GET'),
  profit: (s, e) => request(`/export/profit/${s}/${e}/excel`, 'GET'),
  topProducts: (s, e) => request(`/export/top-products/${s}/${e}/excel`, 'GET'),
};

// ─── RECEIPT ─────────────────────────────────────────────────
export const receiptAPI = {
  getData: (transactionId) => request(`/receipt/${transactionId}`, 'GET'),
};

// ─── RECEIPT SETTINGS (FIX: endpoint baru di mobile_api.php) ──
export const receiptSettingsAPI = {
  /**
   * Ambil pengaturan struk dari server
   * Endpoint: GET /receipt-settings
   */
  get: () => request('/receipt-settings', 'GET'),

  /**
   * Simpan pengaturan struk ke server
   * Endpoint: POST /receipt-settings
   */
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
  getAll: () => request('/promos', 'GET'),        // semua promo (admin)
  getActive: () => request('/promos', 'GET'),        // alias (aktif saja dari server)
  create: (data) => request('/promos', 'POST', data),
  update: (id, data) => request(`/promos/${id}`, 'PUT', data),
  delete: (id) => request(`/promos/${id}`, 'DELETE'),
};