/**
 * src/screens/CartScreen.js — Keranjang Belanja (FIXED)
 * ─────────────────────────────────────────────────────
 * FIX:
 *  - "Each child in a list should have a unique key" → pakai keyExtractor di FlatList
 *    atau key unik di map
 *  - Keyboard tidak tertutup di input diskon
 *  - keyboardShouldPersistTaps="handled"
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, ScrollView, Modal, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// ── Komponen item keranjang di LUAR agar tidak re-render berlebihan
const CartItem = React.memo(({ item, onRemove, onAdd, onDelete }) => (
  <View style={styles.itemCard}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.itemPrice}>{formatCurrency(item.price)} / {item.unit || 'pcs'}</Text>
      {item.category ? <Text style={styles.itemCat}>{item.category}</Text> : null}
    </View>

    <View style={styles.qtyRow}>
      <TouchableOpacity style={styles.qtyBtn} onPress={() => onRemove(item.id)}>
        <Ionicons name="remove" size={14} color={COLORS.textWhite} />
      </TouchableOpacity>
      <Text style={styles.qtyText}>{item.quantity}</Text>
      <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => onAdd(item.id, item.quantity + 1)}>
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
));

export default function CartScreen({ navigation }) {
  const {
    items, customer, discount, discountPercent,
    subtotal, totalAmount, totalItems,
    removeItem, setItemQuantity, deleteItem, clearCart,
    applyDiscount, applyDiscountPercent, setCustomer, isEmpty,
  } = useCart();

  const [discountInput,  setDiscountInput]  = useState('');
  const [discountMode,   setDiscountMode]   = useState('nominal');
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
  }, [discountInput, discountMode, applyDiscount, applyDiscountPercent]);

  // Handler stabil agar CartItem tidak re-render karena fungsi berubah
  const handleRemove = useCallback((id) => removeItem(id), [removeItem]);
  const handleAdd    = useCallback((id, qty) => setItemQuantity(id, qty), [setItemQuantity]);
  const handleDelete = useCallback((id) => deleteItem(id), [deleteItem]);

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
          {/* Daftar Item — FIX: gunakan FlatList dengan keyExtractor yang unik */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ITEM BELANJA</Text>
            {/* Pakai map dengan key yang benar-benar unik */}
            {items.map((item) => (
              <CartItem
                key={`cart-item-${item.id}`}
                item={item}
                onRemove={handleRemove}
                onAdd={handleAdd}
                onDelete={handleDelete}
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

          {/* Diskon */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DISKON</Text>
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
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.discountBadgeText}>
                  Diskon {discountPercent > 0 ? `${discountPercent}% ` : ''}= -{formatCurrency(discount)}
                </Text>
                <TouchableOpacity onPress={() => applyDiscount(0)}>
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
                <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Diskon</Text>
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

  itemCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider || COLORS.border, gap: SPACING.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: '500' },
  itemPrice: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  itemCat: { fontSize: FONTS.xs, color: COLORS.textDark },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 7, backgroundColor: COLORS.bgMedium, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  qtyBtnAdd: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  qtyText: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.bold, minWidth: 22, textAlign: 'center' },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemSubtotal: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },

  selector: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  selectorText: { flex: 1, fontSize: FONTS.md, color: COLORS.textMuted },
  selectorTextActive: { color: COLORS.textWhite, fontWeight: '500' },

  toggle: { flexDirection: 'row', backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.md, padding: 3, marginBottom: SPACING.sm },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: '500' },
  toggleTextActive: { color: '#fff' },
  discountRow: { flexDirection: 'row', gap: SPACING.sm },
  discountInput: { flex: 1, backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textWhite, fontSize: FONTS.md, borderWidth: 1, borderColor: COLORS.border, height: 48 },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, justifyContent: 'center', height: 48 },
  applyBtnText: { color: '#fff', fontSize: FONTS.sm, fontWeight: '600' },
  discountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success + '20', borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  discountBadgeText: { flex: 1, fontSize: FONTS.sm, color: COLORS.success },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.divider || COLORS.border },
  summaryLabel: { fontSize: FONTS.md, color: COLORS.textMuted },
  summaryValue: { fontSize: FONTS.md, color: COLORS.textLight, fontWeight: '500' },
  totalRow: { borderBottomWidth: 0, paddingTop: SPACING.sm, marginTop: SPACING.sm },
  totalLabel: { fontSize: FONTS.lg, color: COLORS.textWhite, fontWeight: FONTS.bold },
  totalValue: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.black || '900' },

  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgMedium, borderTopWidth: 1, borderTopColor: COLORS.border,
    padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 24,
  },
  checkoutInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  checkoutTotal: { fontSize: FONTS.xl, color: COLORS.textWhite, fontWeight: FONTS.bold },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14 },
  checkoutBtnText: { color: '#fff', fontSize: FONTS.md, fontWeight: FONTS.bold },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  modalBox: { width: '100%', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  modalText: { fontSize: FONTS.md, color: COLORS.textMuted, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: SPACING.md, width: '100%', marginTop: SPACING.sm },
  modalCancel: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bgMedium, alignItems: 'center' },
  modalConfirm: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.danger, alignItems: 'center' },
});
