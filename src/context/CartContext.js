/**
 * src/context/CartContext.js — Manajemen State Keranjang Belanja
 * ============================================================
 * Context ini menyimpan state keranjang POS:
 *   - items: daftar produk dalam keranjang
 *   - customer: pelanggan yang dipilih
 *   - discount: diskon yang diterapkan
 *   - payment info
 *
 * Cara pakai:
 *   const { items, addItem, removeItem, totalAmount } = useCart();
 * ============================================================
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Buat context
const CartContext = createContext({});

/**
 * CartProvider — Bungkus area yang butuh akses keranjang
 * (biasanya seluruh AppNavigator)
 */
export function CartProvider({ children }) {
  // ── State Utama ────────────────────────────────────────────
  const [items, setItems]         = useState([]);           // Item di keranjang
  const [customer, setCustomer]   = useState(null);         // Pelanggan terpilih
  const [discount, setDiscount]   = useState(0);            // Diskon (nominal Rp)
  const [discountPercent, setDiscountPercent] = useState(0); // Diskon (%)
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Metode bayar
  const [notes, setNotes]         = useState('');            // Catatan transaksi

  // ── Operasi Item ───────────────────────────────────────────

  /**
   * Tambahkan produk ke keranjang.
   * Jika produk sudah ada, tambahkan qty-nya.
   *
   * @param {object} product - Data produk dari API/grid
   * @param {number} quantity - Jumlah yang ditambahkan (default: 1)
   */
  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);

      if (existing) {
        // Produk sudah ada → tambah qty
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      // Produk baru → tambah ke array
      return [...prev, {
        id:           product.id,
        name:         product.name,
        price:        Number(product.selling_price) || 0,
        quantity:     quantity,
        barcode:      product.barcode || '',
        category:     product.category_name || '',
        maxStock:     Number(product.stock) || 999, // batas stok
        photo:        product.photo_url || product.photo || null,
      }];
    });
  }, []);

  /**
   * Kurangi qty item dalam keranjang.
   * Jika qty mencapai 0, hapus item dari keranjang.
   *
   * @param {number} productId - ID produk
   */
  const removeItem = useCallback((productId) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === productId);
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        // Qty sudah 1, hapus dari keranjang
        return prev.filter(item => item.id !== productId);
      }

      // Kurangi qty
      return prev.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  }, []);

  /**
   * Set qty item secara langsung.
   * Jika qty = 0 atau kurang, hapus item.
   *
   * @param {number} productId - ID produk
   * @param {number} quantity - Qty baru
   */
  const setItemQuantity = useCallback((productId, quantity) => {
    const qty = Number(quantity);
    if (qty <= 0) {
      // Hapus item jika qty 0
      setItems(prev => prev.filter(item => item.id !== productId));
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity: qty } : item
      )
    );
  }, []);

  /**
   * Hapus item dari keranjang secara langsung (swipe delete / tap ✕)
   * @param {number} productId
   */
  const deleteItem = useCallback((productId) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  }, []);

  /**
   * Kosongkan seluruh keranjang dan reset semua state
   */
  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setDiscount(0);
    setDiscountPercent(0);
    setPaymentMethod('cash');
    setNotes('');
  }, []);

  // ── Kalkulasi (useMemo agar tidak hitung ulang terus) ──────

  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [items]
  );

  const totalItems = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  // Total setelah diskon
  const totalAmount = useMemo(() => {
    const afterDiscount = subtotal - discount;
    return Math.max(afterDiscount, 0); // tidak bisa negatif
  }, [subtotal, discount]);

  // ── Terapkan Diskon ────────────────────────────────────────

  /**
   * Set diskon dalam nominal Rupiah
   * @param {number} amount
   */
  const applyDiscount = useCallback((amount) => {
    const val = Number(amount) || 0;
    setDiscount(Math.min(val, subtotal)); // diskon tidak melebihi subtotal
    setDiscountPercent(subtotal > 0 ? Math.round((val / subtotal) * 100) : 0);
  }, [subtotal]);

  /**
   * Set diskon dalam persen
   * @param {number} percent - 0-100
   */
  const applyDiscountPercent = useCallback((percent) => {
    const pct = Math.min(Math.max(Number(percent) || 0, 0), 100);
    const val = Math.round((subtotal * pct) / 100);
    setDiscountPercent(pct);
    setDiscount(val);
  }, [subtotal]);

  // ── Paket Data untuk Transaksi ─────────────────────────────

  /**
   * Siapkan payload untuk dikirim ke API create transaction
   * @param {number} paymentAmount - Jumlah uang yang dibayarkan
   * @returns {object} Payload siap kirim ke API
   */
  const buildTransactionPayload = useCallback((paymentAmount) => {
    return {
      customer_id:    customer?.id || null,
      items:          items.map(item => ({
        product_id:   item.id,
        product_name: item.name,
        quantity:     item.quantity,
        price:        item.price,
        subtotal:     item.price * item.quantity,
      })),
      subtotal,
      discount,
      total:          totalAmount,
      payment_amount: paymentAmount,
      change_amount:  Math.max(paymentAmount - totalAmount, 0),
      payment_method: paymentMethod,
      notes,
    };
  }, [items, customer, subtotal, discount, totalAmount, paymentMethod, notes]);

  // ── Nilai Context ──────────────────────────────────────────
  const value = {
    // State
    items,
    customer,
    discount,
    discountPercent,
    paymentMethod,
    notes,

    // Kalkulasi
    subtotal,
    totalItems,
    totalAmount,

    // Operasi Item
    addItem,
    removeItem,
    setItemQuantity,
    deleteItem,
    clearCart,

    // Diskon
    applyDiscount,
    applyDiscountPercent,

    // Customer & Metode Bayar
    setCustomer,
    setPaymentMethod,
    setNotes,

    // Helper
    buildTransactionPayload,
    isEmpty: items.length === 0,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * Hook custom untuk menggunakan CartContext
 * Contoh: const { items, addItem } = useCart();
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart harus dipakai di dalam CartProvider');
  }
  return context;
};