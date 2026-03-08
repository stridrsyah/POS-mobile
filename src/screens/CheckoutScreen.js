/**
 * src/screens/CheckoutScreen.js — Halaman Pembayaran
 * ============================================================
 * Fitur:
 * - Tampilkan ringkasan pesanan
 * - Pilih metode pembayaran (Cash / Transfer / QRIS)
 * - Input uang yang dibayarkan (untuk cash)
 * - Kalkulasi kembalian otomatis
 * - Proses transaksi ke API
 * - Redirect ke ReceiptScreen setelah sukses
 * ============================================================
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { transactionsAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// Metode pembayaran yang tersedia
const PAYMENT_METHODS = [
  {
    id: 'cash',
    label: 'Tunai',
    icon: <Ionicons name="cash-outline" size={22} color={COLORS.success} />,
  },
  {
    id: 'transfer',
    label: 'Transfer',
    icon: <MaterialCommunityIcons name="bank-transfer" size={22} color={COLORS.info} />,
  },
  {
    id: 'qris',
    label: 'QRIS',
    icon: <MaterialCommunityIcons name="qrcode-scan" size={22} color={COLORS.primary} />,
  },
];

// Nominal uang yang sering dipakai (untuk shortcut cash)
const CASH_SHORTCUTS = [10000, 20000, 50000, 100000];

export default function CheckoutScreen({ navigation }) {
  const {
    items, customer, subtotal, discount, totalAmount,
    paymentMethod, setPaymentMethod,
    buildTransactionPayload, clearCart,
  } = useCart();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing]   = useState(false);

  // Hitung kembalian
  const paid    = parseFloat(paymentAmount.replace(/[^0-9]/g, '')) || 0;
  const change  = Math.max(paid - totalAmount, 0);
  const isEnough = paid >= totalAmount || paymentMethod !== 'cash';

  /**
   * Proses pembayaran dan buat transaksi
   */
  const handleProcessPayment = async () => {
    // Validasi
    if (items.length === 0) {
      Alert.alert('Error', 'Keranjang kosong');
      return;
    }

    if (paymentMethod === 'cash' && paid < totalAmount) {
      Alert.alert('Kurang', `Uang yang dibayar kurang ${formatCurrency(totalAmount - paid)}`);
      return;
    }

    setIsProcessing(true);
    try {
      const actualPaid = paymentMethod === 'cash' ? paid : totalAmount;
      const payload    = buildTransactionPayload(actualPaid);

      const result = await transactionsAPI.create(payload);

      if (result.success) {
        const { transaction_id, invoice_number } = result.data;
        clearCart(); // Kosongkan keranjang

        // Navigasi ke halaman struk
        navigation.replace('Receipt', {
          transactionId: transaction_id,
          invoiceNumber: invoice_number,
          summary: {
            total:    totalAmount,
            paid:     actualPaid,
            change:   actualPaid - totalAmount,
            method:   paymentMethod,
            items:    items.length,
          },
        });
      } else {
        Alert.alert('Gagal', result.error || 'Transaksi gagal. Coba lagi.');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Ringkasan Pesanan ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Pesanan</Text>

          {/* Item list (ringkas) */}
          {items.slice(0, 3).map(item => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.orderItemPrice}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          {items.length > 3 && (
            <Text style={styles.moreItems}>+{items.length - 3} item lainnya</Text>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Total harga */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Diskon</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                -{formatCurrency(discount)}
              </Text>
            </View>
          )}
          {customer && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pelanggan</Text>
              <Text style={styles.summaryValue}>{customer.name}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Bayar</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        {/* ── Metode Pembayaran ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          <View style={styles.paymentMethods}>
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  paymentMethod === method.id && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                {method.icon}
                <Text style={[
                  styles.paymentMethodLabel,
                  paymentMethod === method.id && styles.paymentMethodLabelActive,
                ]}>
                  {method.label}
                </Text>
                {paymentMethod === method.id && (
                  <View style={styles.selectedDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Input Uang (hanya untuk cash) ── */}
        {paymentMethod === 'cash' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uang Diterima</Text>

            {/* Shortcut nominal */}
            <View style={styles.shortcuts}>
              {CASH_SHORTCUTS.map(amount => {
                const isRound = amount >= totalAmount
                  ? Math.ceil(totalAmount / amount) * amount
                  : null;
                const label = amount >= totalAmount
                  ? formatCurrency(amount, false)
                  : formatCurrency(amount, false);
                return (
                  <TouchableOpacity
                    key={amount}
                    style={styles.shortcutBtn}
                    onPress={() => setPaymentAmount(amount.toString())}
                  >
                    <Text style={styles.shortcutText}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Tombol "Uang Pas" */}
              <TouchableOpacity
                style={[styles.shortcutBtn, styles.shortcutBtnExact]}
                onPress={() => setPaymentAmount(totalAmount.toString())}
              >
                <Text style={[styles.shortcutText, { color: COLORS.primary }]}>Pas</Text>
              </TouchableOpacity>
            </View>

            {/* Input manual */}
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>Rp</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={COLORS.textDark}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>

            {/* Kembalian */}
            {paid > 0 && (
              <View style={[
                styles.changeBox,
                !isEnough && styles.changeBoxError,
              ]}>
                {isEnough ? (
                  <>
                    <Ionicons name="cash" size={20} color={COLORS.success} />
                    <View>
                      <Text style={styles.changeLabel}>Kembalian</Text>
                      <Text style={styles.changeAmount}>{formatCurrency(change)}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Ionicons name="warning" size={20} color={COLORS.danger} />
                    <View>
                      <Text style={[styles.changeLabel, { color: COLORS.danger }]}>Kurang</Text>
                      <Text style={[styles.changeAmount, { color: COLORS.danger }]}>
                        {formatCurrency(totalAmount - paid)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Pesan untuk metode non-cash */}
        {paymentMethod !== 'cash' && (
          <View style={styles.section}>
            <View style={styles.nonCashInfo}>
              <Ionicons name="information-circle" size={20} color={COLORS.info} />
              <Text style={styles.nonCashText}>
                {paymentMethod === 'qris'
                  ? 'Tampilkan QR code kepada pelanggan untuk pembayaran QRIS'
                  : 'Konfirmasi transfer dari pelanggan sebelum menekan Proses'}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Tombol Proses Pembayaran ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.processButton,
            (!isEnough || isProcessing) && styles.processButtonDisabled,
          ]}
          onPress={handleProcessPayment}
          disabled={!isEnough || isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.processButtonText}>
                Proses Pembayaran {formatCurrency(totalAmount)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgMedium,
  },
  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textWhite,
  },

  // Section
  section: {
    margin: SPACING.lg,
    marginBottom: 0,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Order Items
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textLight,
    marginRight: SPACING.sm,
  },
  orderItemPrice: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.medium },
  moreItems: { fontSize: FONTS.sm, color: COLORS.textMuted, fontStyle: 'italic' },

  divider: { height: 1, backgroundColor: COLORS.border },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: FONTS.md, color: COLORS.textMuted },
  summaryValue: { fontSize: FONTS.md, color: COLORS.textLight },
  totalRow: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  totalLabel: { fontSize: FONTS.lg, color: COLORS.textWhite, fontWeight: FONTS.bold },
  totalValue: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.black },

  // Payment Methods
  paymentMethods: { flexDirection: 'row', gap: SPACING.sm },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgMedium,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  paymentMethodActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  paymentMethodLabel: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.medium },
  paymentMethodLabelActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  selectedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Cash input
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  shortcutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shortcutBtnExact: { borderColor: COLORS.primary },
  shortcutText: { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMedium,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 56,
    gap: SPACING.sm,
  },
  currencySymbol: {
    fontSize: FONTS.lg,
    color: COLORS.textMuted,
    fontWeight: FONTS.bold,
  },
  amountInput: {
    flex: 1,
    fontSize: FONTS.xxl,
    color: COLORS.textWhite,
    fontWeight: FONTS.bold,
  },

  changeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.success + '20',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  changeBoxError: {
    backgroundColor: COLORS.danger + '20',
    borderColor: COLORS.danger + '40',
  },
  changeLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  changeAmount: {
    fontSize: FONTS.xl,
    color: COLORS.success,
    fontWeight: FONTS.bold,
  },

  // Non-cash info
  nonCashInfo: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  nonCashText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: COLORS.bgMedium,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md + 2,
    ...SHADOW.md,
  },
  processButtonDisabled: { backgroundColor: COLORS.textDark },
  processButtonText: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: '#fff',
  },
});