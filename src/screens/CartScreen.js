/**
 * src/screens/CartScreen.js — Keranjang Belanja
 * Revisi:
 *  - Qty bisa diketik langsung (tap angka → input muncul)
 *  - Input voucher promo (validasi kode + terapkan diskon otomatis)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, ScrollView, Modal, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { promosAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// ── Komponen Item Keranjang ─────────────────────────────────
const CartItem = ({ item, onRemove, onAdd, onDelete, onQtyEdit }) => {
  const [qtyInput, setQtyInput] = useState(String(item.quantity));

  // Sync input jika qty berubah dari luar (tombol +/-)
  useCallback(() => {
    setQtyInput(String(item.quantity));
  }, [item.quantity]);

  // Update realtime saat mengetik
  const handleChangeText = (text) => {
    // Hanya angka
    const cleaned = text.replace(/[^0-9]/g, '');
    setQtyInput(cleaned);
    const val = parseInt(cleaned, 10);
    if (!isNaN(val) && val > 0) {
      onQtyEdit(item.id, val); // langsung update ke CartContext
    }
  };

  const handleBlur = () => {
    const val = parseInt(qtyInput, 10);
    if (isNaN(val) || val <= 0) {
      setQtyInput('1');
      onQtyEdit(item.id, 1);
    }
  };

  // Sync lokal saat tombol +/- ditekan
  const handleRemove = () => {
    const newQty = item.quantity - 1;
    setQtyInput(newQty > 0 ? String(newQty) : '1');
    onRemove(item.id);
  };

  const handleAdd = () => {
    setQtyInput(String(item.quantity + 1));
    onAdd(item.id, item.quantity + 1);
  };

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>{formatCurrency(item.price)} / {item.unit || 'pcs'}</Text>
        {item.category ? <Text style={styles.itemCat}>{item.category}</Text> : null}
      </View>

      <View style={styles.qtyRow}>
        <TouchableOpacity style={styles.qtyBtn} onPress={handleRemove}>
          <Ionicons name="remove" size={14} color={COLORS.textWhite} />
        </TouchableOpacity>

        {/* TextInput selalu tampil — ketik langsung update realtime */}
        <TextInput
          style={styles.qtyInput}
          value={qtyInput}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />

        <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={handleAdd}>
          <Ionicons name="add" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.itemRight}>
        <Text style={styles.itemSubtotal}>{formatCurrency(item.price * item.quantity)}</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Hapus', `Hapus "${item.name}"?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => onDelete(item.id) },
          ])}
        >
          <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Screen Utama ────────────────────────────────────────────
export default function CartScreen({ navigation }) {
  const {
    items, customer, discount, discountPercent,
    subtotal, totalAmount, totalItems,
    removeItem, setItemQuantity, deleteItem, clearCart,
    applyDiscount, applyDiscountPercent, setCustomer, isEmpty,
  } = useCart();

  // Diskon manual
  const [discountInput, setDiscountInput] = useState('');
  const [discountMode,  setDiscountMode]  = useState('nominal');

  // Voucher promo
  const [voucherCode,    setVoucherCode]    = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Handler diskon manual ──
  const handleApplyDiscount = useCallback(() => {
    const raw = discountInput.replace(/[^0-9.]/g, '');
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) { Alert.alert('Input Salah', 'Masukkan nilai diskon yang valid'); return; }
    if (discountMode === 'percent') {
      if (val > 100) { Alert.alert('Input Salah', 'Persen diskon maksimal 100%'); return; }
      applyDiscountPercent(val);
    } else {
      applyDiscount(val);
    }
    setDiscountInput('');
    setAppliedVoucher(null); // reset voucher jika pakai diskon manual
  }, [discountInput, discountMode, applyDiscount, applyDiscountPercent]);

  // ── Handler voucher promo ──
  const handleApplyVoucher = useCallback(async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) { Alert.alert('Kosong', 'Masukkan kode voucher terlebih dahulu'); return; }

    setVoucherLoading(true);
    const result = await promosAPI.getAll();
    setVoucherLoading(false);

    if (!result.success) { Alert.alert('Gagal', 'Tidak bisa memuat data promo. Cek koneksi.'); return; }

    // Cari promo yang cocok
    let promoList = [];
    if (Array.isArray(result.data)) promoList = result.data;
    else if (result.data && typeof result.data === 'object') promoList = Object.values(result.data);

    const promo = promoList.find(p =>
      p.code && p.code.toUpperCase() === code &&
      (p.is_active === 1 || p.is_active === '1' || p.is_active === true)
    );

    if (!promo) { Alert.alert('Tidak Valid', `Kode voucher "${code}" tidak ditemukan atau sudah tidak aktif.`); return; }

    // Cek min purchase
    if (promo.min_purchase && subtotal < promo.min_purchase) {
      Alert.alert('Belum Memenuhi', `Minimum pembelian ${formatCurrency(promo.min_purchase)} untuk voucher ini.`);
      return;
    }

    // Hitung nilai diskon
    let discountVal = 0;
    if (promo.type === 'percent') {
      discountVal = Math.round((subtotal * promo.value) / 100);
      if (promo.max_discount && promo.max_discount > 0) {
        discountVal = Math.min(discountVal, promo.max_discount);
      }
      applyDiscountPercent(promo.value);
    } else {
      discountVal = promo.value;
      applyDiscount(discountVal);
    }

    setAppliedVoucher({ ...promo, discountVal });
    setVoucherCode('');
    Alert.alert('Voucher Diterapkan! 🎉',
      `${promo.name}\nDiskon: ${promo.type === 'percent' ? `${promo.value}%` : formatCurrency(promo.value)}`
    );
  }, [voucherCode, subtotal, applyDiscount, applyDiscountPercent]);

  const handleRemoveDiscount = useCallback(() => {
    applyDiscount(0);
    setAppliedVoucher(null);
    setDiscountInput('');
  }, [applyDiscount]);

  // Handler qty stabil
  const handleRemove  = useCallback((id) => removeItem(id), [removeItem]);
  const handleAdd     = useCallback((id, qty) => setItemQuantity(id, qty), [setItemQuantity]);
  const handleDelete  = useCallback((id) => deleteItem(id), [deleteItem]);
  const handleQtyEdit = useCallback((id, qty) => setItemQuantity(id, qty), [setItemQuantity]);

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Keranjang</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={72} color={COLORS.textDark} />
          <Text style={styles.emptyTitle}>Keranjang Kosong</Text>
          <Text style={styles.emptyText}>Tambahkan produk dari halaman Kasir</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backBtnText}>Kembali ke Kasir</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Keranjang ({totalItems} item)</Text>
        <TouchableOpacity onPress={() => setShowClearConfirm(true)}>
          <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Daftar Item */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ITEM BELANJA</Text>
            {items.map((item) => (
              <CartItem
                key={`cart-item-${item.id}`}
                item={item}
                onRemove={handleRemove}
                onAdd={handleAdd}
                onDelete={handleDelete}
                onQtyEdit={handleQtyEdit}
              />
            ))}
          </View>

          {/* Pelanggan */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PELANGGAN</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => navigation.navigate('Customers', { selectMode: true })}
            >
              <Ionicons
                name={customer ? 'person' : 'person-add-outline'}
                size={18}
                color={customer ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.selectorText, customer && styles.selectorTextActive]}>
                {customer ? customer.name : 'Pilih pelanggan (opsional)'}
              </Text>
              {customer ? (
                <TouchableOpacity onPress={() => setCustomer(null)}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Voucher Promo */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VOUCHER PROMO</Text>
            <View style={styles.voucherRow}>
              <View style={styles.voucherInputWrap}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.textMuted} style={{ marginLeft: SPACING.sm }} />
                <TextInput
                  style={styles.voucherInput}
                  placeholder="Masukkan kode voucher"
                  placeholderTextColor={COLORS.textDark}
                  value={voucherCode}
                  onChangeText={t => setVoucherCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleApplyVoucher}
                />
              </View>
              <TouchableOpacity
                style={[styles.applyBtn, voucherLoading && { opacity: 0.6 }]}
                onPress={handleApplyVoucher}
                disabled={voucherLoading}
              >
                {voucherLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.applyBtnText}>Pakai</Text>
                }
              </TouchableOpacity>
            </View>
            {appliedVoucher && (
              <View style={styles.discountBadge}>
                <Ionicons name="pricetag" size={14} color={COLORS.primary} />
                <Text style={styles.discountBadgeText}>
                  Voucher "{appliedVoucher.code}" — {appliedVoucher.name}
                </Text>
                <TouchableOpacity onPress={handleRemoveDiscount}>
                  <Ionicons name="close" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Diskon Manual */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DISKON MANUAL</Text>
            <View style={styles.toggle}>
              {['nominal', 'percent'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.toggleBtn, discountMode === m && styles.toggleBtnActive]}
                  onPress={() => setDiscountMode(m)}
                >
                  <Text style={[styles.toggleText, discountMode === m && styles.toggleTextActive]}>
                    {m === 'nominal' ? 'Nominal (Rp)' : 'Persen (%)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.discountRow}>
              <TextInput
                style={styles.discountInput}
                placeholder={discountMode === 'nominal' ? 'Contoh: 5000' : 'Contoh: 10'}
                placeholderTextColor={COLORS.textDark}
                value={discountInput}
                onChangeText={setDiscountInput}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleApplyDiscount}
              />
              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyDiscount}>
                <Text style={styles.applyBtnText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
            {discount > 0 && !appliedVoucher && (
              <View style={styles.discountBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.discountBadgeText}>
                  Diskon {discountPercent > 0 ? `${discountPercent}% ` : ''}= -{formatCurrency(discount)}
                </Text>
                <TouchableOpacity onPress={handleRemoveDiscount}>
                  <Ionicons name="close" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Ringkasan */}
          <View style={[styles.section, { marginBottom: SPACING.lg }]}>
            <Text style={styles.sectionLabel}>RINGKASAN</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({totalItems} item)</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: COLORS.success }]}>
                  Diskon {appliedVoucher ? `(${appliedVoucher.code})` : ''}
                </Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>-{formatCurrency(discount)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bar Checkout */}
      <View style={styles.checkoutBar}>
        <View style={styles.checkoutInfo}>
          <Text style={styles.checkoutLabel}>Total Bayar</Text>
          <Text style={styles.checkoutTotal}>{formatCurrency(totalAmount)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout')}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Lanjut ke Pembayaran</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal Hapus Semua */}
      <Modal visible={showClearConfirm} transparent animationType="fade" onRequestClose={() => setShowClearConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name="warning-outline" size={40} color={COLORS.warning} />
            <Text style={styles.modalTitle}>Kosongkan Keranjang?</Text>
            <Text style={styles.modalText}>Semua {totalItems} item akan dihapus.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowClearConfirm(false)}>
                <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => { setShowClearConfirm(false); clearCart(); }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Ya, Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  emptyText: { fontSize: FONTS.md, color: COLORS.textMuted, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.md },
  backBtnText: { color: '#fff', fontSize: FONTS.md, fontWeight: '600' },

  section: { margin: SPACING.lg, marginBottom: 0, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  sectionLabel: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.md },

  // Item
  itemCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider || COLORS.border, gap: SPACING.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: '500' },
  itemPrice: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  itemCat: { fontSize: FONTS.xs, color: COLORS.textDark },

  // Qty
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 7, backgroundColor: COLORS.bgMedium, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  qtyBtnAdd: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  qtyTextWrap: { minWidth: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  qtyText: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.bold, minWidth: 22, textAlign: 'center' },
  qtyInput: { width: 44, height: 28, backgroundColor: '#2a2a4a', borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.primary, color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 2, paddingVertical: 0 },

  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemSubtotal: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },

  selector: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  selectorText: { flex: 1, fontSize: FONTS.md, color: COLORS.textMuted },
  selectorTextActive: { color: COLORS.textWhite, fontWeight: '500' },

  // Voucher
  voucherRow: { flexDirection: 'row', gap: SPACING.sm },
  voucherInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, height: 48 },
  voucherInput: { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md, paddingHorizontal: SPACING.sm, letterSpacing: 1.5, fontWeight: '600' },

  // Diskon
  toggle: { flexDirection: 'row', backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.md, padding: 3, marginBottom: SPACING.sm },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: '500' },
  toggleTextActive: { color: '#fff' },
  discountRow: { flexDirection: 'row', gap: SPACING.sm },
  discountInput: { flex: 1, backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textWhite, fontSize: FONTS.md, borderWidth: 1, borderColor: COLORS.border, height: 48 },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, justifyContent: 'center', height: 48, minWidth: 72, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: FONTS.sm, fontWeight: '600' },
  discountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success + '20', borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  discountBadgeText: { flex: 1, fontSize: FONTS.sm, color: COLORS.success },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.divider || COLORS.border },
  summaryLabel: { fontSize: FONTS.md, color: COLORS.textMuted },
  summaryValue: { fontSize: FONTS.md, color: COLORS.textLight, fontWeight: '500' },
  totalRow: { borderBottomWidth: 0, paddingTop: SPACING.sm, marginTop: SPACING.sm },
  totalLabel: { fontSize: FONTS.lg, color: COLORS.textWhite, fontWeight: FONTS.bold },
  totalValue: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: '900' },

  // Checkout bar
  checkoutBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgMedium, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 24 },
  checkoutInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  checkoutTotal: { fontSize: FONTS.xl, color: COLORS.textWhite, fontWeight: FONTS.bold },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14 },
  checkoutBtnText: { color: '#fff', fontSize: FONTS.md, fontWeight: FONTS.bold },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  modalBox: { width: '100%', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  modalText: { fontSize: FONTS.md, color: COLORS.textMuted, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: SPACING.md, width: '100%', marginTop: SPACING.sm },
  modalCancel: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bgMedium, alignItems: 'center' },
  modalConfirm: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.danger, alignItems: 'center' },
});