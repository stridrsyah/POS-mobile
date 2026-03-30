/**
 * src/screens/TransactionsScreen.js — Riwayat Transaksi (Theme-Aware)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { transactionsAPI } from '../services/api';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate, toApiDate } from '../utils/helpers';

const DATE_PRESETS = [
  { label: 'Hari Ini',  start: () => toApiDate(), end: () => toApiDate() },
  { label: 'Kemarin',   start: () => toApiDate(new Date(Date.now()-86400000)), end: () => toApiDate(new Date(Date.now()-86400000)) },
  { label: '7 Hari',    start: () => toApiDate(new Date(Date.now()-6*86400000)), end: () => toApiDate() },
  { label: 'Bulan Ini', start: () => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  }, end: () => toApiDate() },
];

const normalizeMethod = (raw) => {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'unknown') return 'qris';
  return s;
};

const paymentLabel = (raw) => {
  const m = normalizeMethod(raw);
  if (!m) return '-';
  const MAP = { cash: 'CASH', transfer: 'TRANSFER', qris: 'QRIS', card: 'KARTU' };
  return MAP[m] || m.toUpperCase();
};

const paymentColor = (raw, colors) => {
  const m = normalizeMethod(raw);
  switch (m) {
    case 'cash':     return colors.success;
    case 'transfer': return colors.info;
    case 'qris':     return '#FF9800';
    case 'card':     return '#E91E63';
    default:         return colors.textMuted;
  }
};

export default function TransactionsScreen({ navigation }) {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [startDate, setStartDate]       = useState(toApiDate());
  const [endDate, setEndDate]           = useState(toApiDate());
  const [selectedTrx, setSelectedTrx]   = useState(null);
  const [trxDetail, setTrxDetail]        = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0);

  const loadTransactions = async (refresh = false) => {
    if (refresh) setIsRefreshing(true); else setIsLoading(true);
    const result = await transactionsAPI.getAll(startDate, endDate);
    if (result.success && Array.isArray(result.data)) setTransactions(result.data);
    else setTransactions([]);
    setIsLoading(false); setIsRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadTransactions(); }, [startDate, endDate]));

  const applyPreset = (idx) => {
    const p = DATE_PRESETS[idx];
    setActivePreset(idx); setStartDate(p.start()); setEndDate(p.end());
  };

  const openDetail = async (trx) => {
    setSelectedTrx(trx); setLoadingDetail(true);
    const result = await transactionsAPI.getById(trx.id);
    if (result.success) setTrxDetail(result.data);
    setLoadingDetail(false);
  };

  const renderItem = ({ item }) => {
    const mColor = paymentColor(item.payment_method, colors);
    const mLabel = paymentLabel(item.payment_method);
    return (
      <TouchableOpacity
        style={[styles.trxCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => openDetail(item)} activeOpacity={0.8}
      >
        <View style={styles.trxLeft}>
          <View style={[styles.methodDot, { backgroundColor: mColor }]} />
          <View>
            <Text style={[styles.invoiceNo, { color: colors.textWhite }]}>{item.invoice_number}</Text>
            <Text style={[styles.trxDate, { color: colors.textMuted }]}>{formatDate(item.transaction_date)}</Text>
            <Text style={[styles.trxCashier, { color: colors.textDark }]}>Kasir: {item.cashier_name || '-'}</Text>
            {item.customer_name && <Text style={[styles.trxCustomer, { color: colors.primary }]}>Pelanggan: {item.customer_name}</Text>}
          </View>
        </View>
        <View style={styles.trxRight}>
          <Text style={[styles.trxTotal, { color: colors.textWhite }]}>{formatCurrency(item.total)}</Text>
          <View style={[styles.methodBadge, { backgroundColor: mColor + '22' }]}>
            <Text style={[styles.methodText, { color: mColor }]}>{mLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textDark} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      <View style={[styles.header, { backgroundColor: colors.bgMedium }]}>
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>Transaksi</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>{transactions.length} transaksi</Text>
      </View>
      <View style={[styles.presetRow, { backgroundColor: colors.bgMedium }]}>
        {DATE_PRESETS.map((p, idx) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.presetBtn, {
              backgroundColor: activePreset === idx ? colors.primary : colors.bgCard,
              borderColor: activePreset === idx ? colors.primary : colors.border,
            }]}
            onPress={() => applyPreset(idx)}
          >
            <Text style={[styles.presetText, { color: activePreset === idx ? '#fff' : colors.textMuted }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!isLoading && transactions.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: colors.primary + '15', borderBottomColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Omzet</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatCurrency(totalRevenue)}</Text>
        </View>
      )}
      {isLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadTransactions(true)} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={56} color={colors.textDark} />
              <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>Belum ada transaksi</Text>
              <Text style={[styles.emptyText, { color: colors.textDark }]}>dalam periode yang dipilih</Text>
            </View>
          }
        />
      )}

      {/* Modal Detail */}
      <Modal visible={!!selectedTrx} animationType="slide" onRequestClose={() => { setSelectedTrx(null); setTrxDetail(null); }}>
        <View style={[styles.detailContainer, { backgroundColor: colors.bgDark }]}>
          <View style={[styles.detailHeader, { backgroundColor: colors.bgMedium }]}>
            <TouchableOpacity onPress={() => { setSelectedTrx(null); setTrxDetail(null); }}>
              <Ionicons name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: colors.textWhite }]}>Detail Transaksi</Text>
            {trxDetail && (
              <TouchableOpacity onPress={() => {
                setSelectedTrx(null); setTrxDetail(null);
                navigation.navigate('Receipt', { transactionId: selectedTrx.id, invoiceNumber: selectedTrx.invoice_number });
              }}>
                <Ionicons name="print-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {loadingDetail ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : trxDetail ? (
            <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.detailSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {[
                  { label: 'No Invoice', value: trxDetail.invoice_number },
                  { label: 'Tanggal',    value: formatDate(trxDetail.transaction_date) },
                  { label: 'Kasir',      value: trxDetail.cashier_name || '-' },
                  { label: 'Pelanggan',  value: trxDetail.customer_name || 'Umum' },
                ].map(r => (
                  <View key={r.label} style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{r.label}</Text>
                    <Text style={[styles.detailValue, { color: colors.textWhite }]}>{r.value}</Text>
                  </View>
                ))}
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Metode</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: paymentColor(trxDetail.payment_method, colors) }} />
                    <Text style={[styles.detailValue, { color: paymentColor(trxDetail.payment_method, colors), fontWeight: 'bold', fontSize: FONTS.md }]}>
                      {paymentLabel(trxDetail.payment_method)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>Item Dibeli</Text>
              <View style={[styles.detailSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {(trxDetail.items || []).map((item, idx) => (
                  <View key={idx} style={[styles.itemRow, { borderBottomColor: colors.divider }]}>
                    <View style={styles.itemRowLeft}>
                      <Text style={[styles.itemName, { color: colors.textWhite }]}>{item.product_name || item.name}</Text>
                      <Text style={[styles.itemQty, { color: colors.textMuted }]}>{item.quantity} × {formatCurrency(item.price)}</Text>
                    </View>
                    <Text style={[styles.itemSubtotal, { color: colors.primary }]}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>Pembayaran</Text>
              <View style={[styles.detailSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Subtotal</Text>
                  <Text style={[styles.detailValue, { color: colors.textWhite }]}>{formatCurrency(trxDetail.subtotal)}</Text>
                </View>
                {Number(trxDetail.discount) > 0 && (
                  <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.detailLabel, { color: colors.success }]}>Diskon</Text>
                    <Text style={[styles.detailValue, { color: colors.success }]}>-{formatCurrency(trxDetail.discount)}</Text>
                  </View>
                )}
                <View style={[styles.detailRow, styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.textWhite }]}>TOTAL</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(trxDetail.total)}</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Dibayar</Text>
                  <Text style={[styles.detailValue, { color: colors.textWhite }]}>{formatCurrency(trxDetail.payment_amount)}</Text>
                </View>
                {Number(trxDetail.change_amount) > 0 && (
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Kembalian</Text>
                    <Text style={[styles.detailValue, { color: colors.success, fontWeight: 'bold' }]}>{formatCurrency(trxDetail.change_amount)}</Text>
                  </View>
                )}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  headerTitle: { fontSize: FONTS.xl, fontWeight: 'bold' },
  headerSub: { fontSize: FONTS.sm, marginTop: 2 },
  presetRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  presetBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1 },
  presetText: { fontSize: FONTS.xs, fontWeight: '500' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  summaryLabel: { fontSize: FONTS.sm },
  summaryValue: { fontSize: FONTS.lg, fontWeight: 'bold' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 60 },
  trxCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1, ...SHADOW.sm },
  trxLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, flex: 1 },
  methodDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  invoiceNo: { fontSize: FONTS.sm, fontWeight: 'bold' },
  trxDate: { fontSize: FONTS.xs, marginTop: 2 },
  trxCashier: { fontSize: FONTS.xs },
  trxCustomer: { fontSize: FONTS.xs, marginTop: 1 },
  trxRight: { alignItems: 'flex-end', gap: 4 },
  trxTotal: { fontSize: FONTS.md, fontWeight: 'bold' },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  methodText: { fontSize: FONTS.xs, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.lg, fontWeight: '600' },
  emptyText: { fontSize: FONTS.md },
  detailContainer: { flex: 1 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  detailTitle: { fontSize: FONTS.lg, fontWeight: 'bold' },
  detailBody: { flex: 1, padding: SPACING.lg },
  detailSection: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1 },
  detailSectionTitle: { fontSize: FONTS.sm, fontWeight: 'bold', marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1 },
  detailLabel: { fontSize: FONTS.sm },
  detailValue: { fontSize: FONTS.sm, fontWeight: '500' },
  totalRow: { paddingTop: SPACING.sm, borderTopWidth: 2, marginTop: SPACING.sm, borderBottomWidth: 0 },
  totalLabel: { fontSize: FONTS.md, fontWeight: 'bold' },
  totalValue: { fontSize: FONTS.lg, fontWeight: '900' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  itemRowLeft: { flex: 1 },
  itemName: { fontSize: FONTS.sm },
  itemQty: { fontSize: FONTS.xs, marginTop: 2 },
  itemSubtotal: { fontSize: FONTS.sm, fontWeight: 'bold' },
});
