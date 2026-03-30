/**
 * src/screens/CheckoutScreen.js — Halaman Pembayaran (Theme-Aware)
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { transactionsAPI } from '../services/api';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

const PAYMENT_METHODS = [
  { id: 'cash',     label: 'Tunai',    icon: <Ionicons name="cash-outline" size={22} color="#26a69a" /> },
  { id: 'transfer', label: 'Transfer', icon: <MaterialCommunityIcons name="bank-transfer" size={22} color="#2196F3" /> },
  { id: 'qris',     label: 'QRIS',     icon: <MaterialCommunityIcons name="qrcode-scan" size={22} color="#6C63FF" /> },
];

const CASH_SHORTCUTS = [10000, 20000, 50000, 100000];

export default function CheckoutScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    items, customer, subtotal, discount, totalAmount,
    paymentMethod, setPaymentMethod,
    buildTransactionPayload, clearCart,
  } = useCart();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing]   = useState(false);

  const paid    = parseFloat(paymentAmount.replace(/[^0-9]/g, '')) || 0;
  const change  = Math.max(paid - totalAmount, 0);
  const isEnough = paid >= totalAmount || paymentMethod !== 'cash';

  const handleProcessPayment = async () => {
    if (items.length === 0) { Alert.alert('Error', 'Keranjang kosong'); return; }
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
        clearCart();
        navigation.replace('Receipt', {
          transactionId: transaction_id,
          invoiceNumber: invoice_number,
          summary: { total: totalAmount, paid: actualPaid, change: actualPaid - totalAmount, method: paymentMethod, items: items.length },
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
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      <View style={[styles.header, { backgroundColor: colors.bgMedium }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>Pembayaran</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Ringkasan Pesanan */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Ringkasan Pesanan</Text>
          {items.slice(0, 3).map(item => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={[styles.orderItemName, { color: colors.textLight }]} numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={[styles.orderItemPrice, { color: colors.textWhite }]}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          {items.length > 3 && <Text style={[styles.moreItems, { color: colors.textMuted }]}>+{items.length - 3} item lainnya</Text>}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.textLight }]}>{formatCurrency(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>Diskon</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>-{formatCurrency(discount)}</Text>
            </View>
          )}
          {customer && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pelanggan</Text>
              <Text style={[styles.summaryValue, { color: colors.textLight }]}>{customer.name}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.textWhite }]}>Total Bayar</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        {/* Metode Pembayaran */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Metode Pembayaran</Text>
          <View style={styles.paymentMethods}>
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  { backgroundColor: colors.bgMedium, borderColor: colors.border },
                  paymentMethod === method.id && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                {method.icon}
                <Text style={[
                  styles.paymentMethodLabel,
                  { color: colors.textMuted },
                  paymentMethod === method.id && { color: colors.primary, fontWeight: 'bold' },
                ]}>
                  {method.label}
                </Text>
                {paymentMethod === method.id && (
                  <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input Uang (cash) */}
        {paymentMethod === 'cash' && (
          <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Uang Diterima</Text>
            <View style={styles.shortcuts}>
              {CASH_SHORTCUTS.map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.shortcutBtn, { backgroundColor: colors.bgMedium, borderColor: colors.border }]}
                  onPress={() => setPaymentAmount(amount.toString())}
                >
                  <Text style={[styles.shortcutText, { color: colors.textLight }]}>{formatCurrency(amount, false)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.shortcutBtn, { borderColor: colors.primary, backgroundColor: colors.bgMedium }]}
                onPress={() => setPaymentAmount(totalAmount.toString())}
              >
                <Text style={[styles.shortcutText, { color: colors.primary }]}>Pas</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: colors.bgMedium, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>Rp</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.textWhite }]}
                placeholder="0"
                placeholderTextColor={colors.textDark}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
            {paid > 0 && (
              <View style={[
                styles.changeBox,
                isEnough
                  ? { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }
                  : { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40' },
              ]}>
                {isEnough ? (
                  <>
                    <Ionicons name="cash" size={20} color={colors.success} />
                    <View>
                      <Text style={[styles.changeLabel, { color: colors.textMuted }]}>Kembalian</Text>
                      <Text style={[styles.changeAmount, { color: colors.success }]}>{formatCurrency(change)}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Ionicons name="warning" size={20} color={colors.danger} />
                    <View>
                      <Text style={[styles.changeLabel, { color: colors.danger }]}>Kurang</Text>
                      <Text style={[styles.changeAmount, { color: colors.danger }]}>{formatCurrency(totalAmount - paid)}</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {paymentMethod !== 'cash' && (
          <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.nonCashInfo}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={[styles.nonCashText, { color: colors.textMuted }]}>
                {paymentMethod === 'qris'
                  ? 'Tampilkan QR code kepada pelanggan untuk pembayaran QRIS'
                  : 'Konfirmasi transfer dari pelanggan sebelum menekan Proses'}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.bgMedium, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.processButton,
            { backgroundColor: colors.success },
            (!isEnough || isProcessing) && { backgroundColor: colors.textDark },
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
              <Text style={styles.processButtonText}>Proses Pembayaran {formatCurrency(totalAmount)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  headerTitle: { fontSize: FONTS.lg, fontWeight: 'bold' },
  section: { margin: SPACING.lg, marginBottom: 0, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, gap: SPACING.md },
  sectionTitle: { fontSize: FONTS.sm, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItemName: { flex: 1, fontSize: FONTS.sm, marginRight: SPACING.sm },
  orderItemPrice: { fontSize: FONTS.sm, fontWeight: '500' },
  moreItems: { fontSize: FONTS.sm, fontStyle: 'italic' },
  divider: { height: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: FONTS.md },
  summaryValue: { fontSize: FONTS.md },
  totalRow: { paddingTop: SPACING.sm, borderTopWidth: 1, marginTop: SPACING.sm },
  totalLabel: { fontSize: FONTS.lg, fontWeight: 'bold' },
  totalValue: { fontSize: FONTS.xl, fontWeight: '900' },
  paymentMethods: { flexDirection: 'row', gap: SPACING.sm },
  paymentMethod: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 2, position: 'relative' },
  paymentMethodLabel: { fontSize: FONTS.sm, fontWeight: '500' },
  selectedDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  shortcutBtn: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1 },
  shortcutText: { fontSize: FONTS.sm, fontWeight: '500' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 56, gap: SPACING.sm },
  currencySymbol: { fontSize: FONTS.lg, fontWeight: 'bold' },
  amountInput: { flex: 1, fontSize: FONTS.xxl, fontWeight: 'bold' },
  changeBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1 },
  changeLabel: { fontSize: FONTS.sm },
  changeAmount: { fontSize: FONTS.xl, fontWeight: 'bold' },
  nonCashInfo: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  nonCashText: { flex: 1, fontSize: FONTS.sm, lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, borderTopWidth: 1 },
  processButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, paddingVertical: SPACING.md + 2, ...SHADOW.md },
  processButtonText: { fontSize: FONTS.md, fontWeight: 'bold', color: '#fff' },
});
