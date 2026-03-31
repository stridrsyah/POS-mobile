/**
 * src/screens/CartScreen.js — Keranjang Belanja (FIXED: Full Light Mode)
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
import { useTheme } from '../context/ThemeContext';
import { promosAPI } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// ── Komponen Item Keranjang ─────────────────────────────────
const CartItem = ({ item, onRemove, onAdd, onDelete, onQtyEdit, colors, isDark }) => {
  const [qtyInput, setQtyInput] = useState(String(item.quantity));

  const handleChangeText = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setQtyInput(cleaned);
    const val = parseInt(cleaned, 10);
    if (!isNaN(val) && val > 0) onQtyEdit(item.id, val);
  };

  const handleBlur = () => {
    const val = parseInt(qtyInput, 10);
    if (isNaN(val) || val <= 0) { setQtyInput('1'); onQtyEdit(item.id, 1); }
  };

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
    <View style={[cs.itemCard, { borderBottomColor: colors.divider }]}>
      <View style={cs.itemInfo}>
        <Text style={[cs.itemName, { color: colors.textWhite }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[cs.itemPrice, { color: colors.textMuted }]}>{formatCurrency(item.price)} / {item.unit || 'pcs'}</Text>
        {item.category ? <Text style={[cs.itemCat, { color: colors.textDark }]}>{item.category}</Text> : null}
      </View>
      <View style={cs.qtyRow}>
        <TouchableOpacity
          style={[cs.qtyBtn, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}
          onPress={handleRemove}
        >
          <Ionicons name="remove" size={14} color={colors.textWhite} />
        </TouchableOpacity>
        <TextInput
          style={[cs.qtyInput, {
            backgroundColor: isDark ? '#2a2a4a' : colors.bgSurface,
            borderColor: colors.primary,
            color: colors.textWhite,
          }]}
          value={qtyInput}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={[cs.qtyBtn, cs.qtyBtnAdd, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={handleAdd}
        >
          <Ionicons name="add" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={cs.itemRight}>
        <Text style={[cs.itemSubtotal, { color: colors.primary }]}>{formatCurrency(item.price * item.quantity)}</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Hapus', `Hapus "${item.name}"?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => onDelete(item.id) },
          ])}
        >
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function CartScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const {
    items, customer, discount, discountPercent,
    subtotal, totalAmount, totalItems,
    removeItem, setItemQuantity, deleteItem, clearCart,
    applyDiscount, applyDiscountPercent, setCustomer, isEmpty,
  } = useCart();

  const [discountInput, setDiscountInput] = useState('');
  const [discountMode,  setDiscountMode]  = useState('nominal');
  const [voucherCode,    setVoucherCode]    = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    setAppliedVoucher(null);
  }, [discountInput, discountMode, applyDiscount, applyDiscountPercent]);

  const handleApplyVoucher = useCallback(async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) { Alert.alert('Kosong', 'Masukkan kode voucher terlebih dahulu'); return; }
    setVoucherLoading(true);
    const result = await promosAPI.getAll();
    setVoucherLoading(false);
    if (!result.success) { Alert.alert('Gagal', 'Tidak bisa memuat data promo.'); return; }
    let promoList = Array.isArray(result.data) ? result.data : Object.values(result.data || {});
    const promo = promoList.find(p =>
      p.code && p.code.toUpperCase() === code &&
      (p.is_active === 1 || p.is_active === '1' || p.is_active === true)
    );
    if (!promo) { Alert.alert('Tidak Valid', `Kode voucher "${code}" tidak ditemukan.`); return; }
    if (promo.min_purchase && subtotal < promo.min_purchase) {
      Alert.alert('Belum Memenuhi', `Minimum pembelian ${formatCurrency(promo.min_purchase)}.`);
      return;
    }
    if (promo.type === 'percent') {
      let discountVal = Math.round((subtotal * promo.value) / 100);
      if (promo.max_discount && promo.max_discount > 0) discountVal = Math.min(discountVal, promo.max_discount);
      applyDiscountPercent(promo.value);
    } else {
      applyDiscount(promo.value);
    }
    setAppliedVoucher(promo);
    setVoucherCode('');
    Alert.alert('Voucher Diterapkan! 🎉', `${promo.name}`);
  }, [voucherCode, subtotal, applyDiscount, applyDiscountPercent]);

  const handleRemoveDiscount = useCallback(() => {
    applyDiscount(0);
    setAppliedVoucher(null);
    setDiscountInput('');
  }, [applyDiscount]);

  const handleRemove  = useCallback((id) => removeItem(id), [removeItem]);
  const handleAdd     = useCallback((id, qty) => setItemQuantity(id, qty), [setItemQuantity]);
  const handleDelete  = useCallback((id) => deleteItem(id), [deleteItem]);
  const handleQtyEdit = useCallback((id, qty) => setItemQuantity(id, qty), [setItemQuantity]);

  if (isEmpty) {
    return (
      <SafeAreaView style={[cs.container, { backgroundColor: colors.bgDark }]}>
        <View style={[cs.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={[cs.headerTitle, { color: colors.textWhite }]}>Keranjang</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={cs.emptyWrap}>
          <View style={[cs.emptyIcon, { backgroundColor: colors.bgSurface }]}>
            <Ionicons name="cart-outline" size={48} color={colors.textDark} />
          </View>
          <Text style={[cs.emptyTitle, { color: colors.textWhite }]}>Keranjang Kosong</Text>
          <Text style={[cs.emptyText, { color: colors.textMuted }]}>Tambahkan produk dari halaman Kasir</Text>
          <TouchableOpacity style={[cs.backBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={cs.backBtnText}>Kembali ke Kasir</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[cs.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      {/* Header */}
      <View style={[cs.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border, borderBottomWidth: isDark ? 1 : 0.5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[cs.headerTitle, { color: colors.textWhite }]}>Keranjang ({totalItems} item)</Text>
        <TouchableOpacity onPress={() => setShowClearConfirm(true)}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Daftar Item */}
          <View style={[cs.section, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0.5 }]}>
            <Text style={[cs.sectionLabel, { color: colors.textDark }]}>ITEM BELANJA</Text>
            {items.map((item) => (
              <CartItem
                key={`cart-item-${item.id}`}
                item={item}
                onRemove={handleRemove}
                onAdd={handleAdd}
                onDelete={handleDelete}
                onQtyEdit={handleQtyEdit}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </View>

          {/* Pelanggan */}
          <View style={[cs.section, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0.5 }]}>
            <Text style={[cs.sectionLabel, { color: colors.textDark }]}>PELANGGAN</Text>
            <TouchableOpacity
              style={[cs.selector, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Customers', { selectMode: true })}
            >
              <Ionicons
                name={customer ? 'person' : 'person-add-outline'}
                size={18}
                color={customer ? colors.primary : colors.textMuted}
              />
              <Text style={[cs.selectorText, { color: customer ? colors.textWhite : colors.textMuted }]}>
                {customer ? customer.name : 'Pilih pelanggan (opsional)'}
              </Text>
              {customer ? (
                <TouchableOpacity onPress={() => setCustomer(null)}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Voucher Promo */}
          <View style={[cs.section, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0.5 }]}>
            <Text style={[cs.sectionLabel, { color: colors.textDark }]}>VOUCHER PROMO</Text>
            <View style={cs.voucherRow}>
              <View style={[cs.voucherInputWrap, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
                <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} style={{ marginLeft: SPACING.sm }} />
                <TextInput
                  style={[cs.voucherInput, { color: colors.textWhite }]}
                  placeholder="Masukkan kode voucher"
                  placeholderTextColor={colors.textDark}
                  value={voucherCode}
                  onChangeText={t => setVoucherCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleApplyVoucher}
                />
              </View>
              <TouchableOpacity
                style={[cs.applyBtn, { backgroundColor: colors.primary }, voucherLoading && { opacity: 0.6 }]}
                onPress={handleApplyVoucher}
                disabled={voucherLoading}
              >
                {voucherLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={cs.applyBtnText}>Pakai</Text>
                }
              </TouchableOpacity>
            </View>
            {appliedVoucher && (
              <View style={[cs.discountBadge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="pricetag" size={14} color={colors.success} />
                <Text style={[cs.discountBadgeText, { color: colors.success }]}>
                  Voucher "{appliedVoucher.code}" — {appliedVoucher.name}
                </Text>
                <TouchableOpacity onPress={handleRemoveDiscount}>
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Diskon Manual */}
          <View style={[cs.section, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0.5 }]}>
            <Text style={[cs.sectionLabel, { color: colors.textDark }]}>DISKON MANUAL</Text>
            <View style={[cs.toggle, { backgroundColor: colors.bgSurface }]}>
              {['nominal', 'percent'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[cs.toggleBtn, discountMode === m && { backgroundColor: colors.primary }]}
                  onPress={() => setDiscountMode(m)}
                >
                  <Text style={[cs.toggleText, { color: discountMode === m ? '#fff' : colors.textMuted }]}>
                    {m === 'nominal' ? 'Nominal (Rp)' : 'Persen (%)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={cs.discountRow}>
              <TextInput
                style={[cs.discountInput, { backgroundColor: colors.bgSurface, color: colors.textWhite, borderColor: colors.border }]}
                placeholder={discountMode === 'nominal' ? 'Contoh: 5000' : 'Contoh: 10'}
                placeholderTextColor={colors.textDark}
                value={discountInput}
                onChangeText={setDiscountInput}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleApplyDiscount}
              />
              <TouchableOpacity style={[cs.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApplyDiscount}>
                <Text style={cs.applyBtnText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
            {discount > 0 && !appliedVoucher && (
              <View style={[cs.discountBadge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[cs.discountBadgeText, { color: colors.success }]}>
                  Diskon {discountPercent > 0 ? `${discountPercent}% ` : ''}= -{formatCurrency(discount)}
                </Text>
                <TouchableOpacity onPress={handleRemoveDiscount}>
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Ringkasan */}
          <View style={[cs.section, { marginBottom: SPACING.lg, backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0.5 }]}>
            <Text style={[cs.sectionLabel, { color: colors.textDark }]}>RINGKASAN</Text>
            <View style={[cs.summaryRow, { borderBottomColor: colors.divider }]}>
              <Text style={[cs.summaryLabel, { color: colors.textMuted }]}>Subtotal ({totalItems} item)</Text>
              <Text style={[cs.summaryValue, { color: colors.textLight }]}>{formatCurrency(subtotal)}</Text>
            </View>
            {discount > 0 && (
              <View style={[cs.summaryRow, { borderBottomColor: colors.divider }]}>
                <Text style={[cs.summaryLabel, { color: colors.success }]}>Diskon</Text>
                <Text style={[cs.summaryValue, { color: colors.success }]}>-{formatCurrency(discount)}</Text>
              </View>
            )}
            <View style={[cs.summaryRow, cs.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[cs.totalLabel, { color: colors.textWhite }]}>TOTAL</Text>
              <Text style={[cs.totalValue, { color: colors.primary }]}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bar Checkout */}
      <View style={[cs.checkoutBar, { backgroundColor: colors.bgMedium, borderTopColor: colors.border, borderTopWidth: isDark ? 1 : 0.5 }]}>
        <View style={cs.checkoutInfo}>
          <Text style={[cs.checkoutLabel, { color: colors.textMuted }]}>Total Bayar</Text>
          <Text style={[cs.checkoutTotal, { color: colors.textWhite }]}>{formatCurrency(totalAmount)}</Text>
        </View>
        <TouchableOpacity
          style={[cs.checkoutBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Checkout')}
          activeOpacity={0.85}
        >
          <Text style={cs.checkoutBtnText}>Lanjut ke Pembayaran</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal Hapus Semua */}
      <Modal visible={showClearConfirm} transparent animationType="fade" onRequestClose={() => setShowClearConfirm(false)}>
        <View style={[cs.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[cs.modalBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="warning-outline" size={40} color={colors.warning} />
            <Text style={[cs.modalTitle, { color: colors.textWhite }]}>Kosongkan Keranjang?</Text>
            <Text style={[cs.modalText, { color: colors.textMuted }]}>Semua {totalItems} item akan dihapus.</Text>
            <View style={cs.modalBtns}>
              <TouchableOpacity style={[cs.modalCancel, { backgroundColor: colors.bgSurface }]} onPress={() => setShowClearConfirm(false)}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cs.modalConfirm, { backgroundColor: colors.danger }]} onPress={() => { setShowClearConfirm(false); clearCart(); }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Ya, Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: '700' },
  emptyText: { fontSize: FONTS.md, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.md },
  backBtnText: { color: '#fff', fontSize: FONTS.md, fontWeight: '600' },
  section: { margin: SPACING.lg, marginBottom: 0, borderRadius: RADIUS.lg, padding: SPACING.lg },
  sectionLabel: { fontSize: FONTS.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.md },
  itemCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, gap: SPACING.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FONTS.sm, fontWeight: '500' },
  itemPrice: { fontSize: FONTS.xs, marginTop: 2 },
  itemCat: { fontSize: FONTS.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  qtyBtnAdd: {},
  qtyInput: { width: 44, height: 28, borderRadius: 7, borderWidth: 1.5, fontSize: 15, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 2, paddingVertical: 0 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemSubtotal: { fontSize: FONTS.sm, fontWeight: '700' },
  selector: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1 },
  selectorText: { flex: 1, fontSize: FONTS.md },
  voucherRow: { flexDirection: 'row', gap: SPACING.sm },
  voucherInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, height: 48 },
  voucherInput: { flex: 1, fontSize: FONTS.md, paddingHorizontal: SPACING.sm, letterSpacing: 1.5, fontWeight: '600' },
  toggle: { flexDirection: 'row', borderRadius: RADIUS.md, padding: 3, marginBottom: SPACING.sm },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  toggleText: { fontSize: FONTS.sm, fontWeight: '500' },
  discountRow: { flexDirection: 'row', gap: SPACING.sm },
  discountInput: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md, borderWidth: 1, height: 48 },
  applyBtn: { borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, justifyContent: 'center', height: 48, minWidth: 72, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: FONTS.sm, fontWeight: '600' },
  discountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  discountBadgeText: { flex: 1, fontSize: FONTS.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1 },
  summaryLabel: { fontSize: FONTS.md },
  summaryValue: { fontSize: FONTS.md, fontWeight: '500' },
  totalRow: { borderBottomWidth: 0, paddingTop: SPACING.sm, marginTop: SPACING.sm, borderTopWidth: 1 },
  totalLabel: { fontSize: FONTS.lg, fontWeight: '700' },
  totalValue: { fontSize: FONTS.xl, fontWeight: '900' },
  checkoutBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 24 },
  checkoutInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutLabel: { fontSize: FONTS.sm },
  checkoutTotal: { fontSize: FONTS.xl, fontWeight: '700' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, paddingVertical: 14 },
  checkoutBtnText: { color: '#fff', fontSize: FONTS.md, fontWeight: '700' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  modalBox: { width: '100%', borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, borderWidth: 1 },
  modalTitle: { fontSize: FONTS.xl, fontWeight: '700' },
  modalText: { fontSize: FONTS.md, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: SPACING.md, width: '100%', marginTop: SPACING.sm },
  modalCancel: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  modalConfirm: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
});
