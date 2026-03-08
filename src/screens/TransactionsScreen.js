/**
 * src/screens/TransactionsScreen.js — Riwayat Transaksi
 * Fix QRIS: normalizeMethod + paymentLabel + paymentColor
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { transactionsAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency, formatDate, toApiDate } from '../utils/helpers';

const DATE_PRESETS = [
  { label: 'Hari Ini',  start: () => toApiDate(), end: () => toApiDate() },
  { label: 'Kemarin',   start: () => toApiDate(new Date(Date.now()-86400000)), end: () => toApiDate(new Date(Date.now()-86400000)) },
  { label: '7 Hari',    start: () => toApiDate(new Date(Date.now()-6*86400000)), end: () => toApiDate() },
  { label: 'Bulan Ini', start: () => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  }, end: () => toApiDate() },
];

// Normalize: semua variasi payment_method → lowercase standar
// null/'' → null (tampil '-'), 'unknown'/'QRIS' → 'qris'
const normalizeMethod = (raw) => {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'unknown') return 'qris';  // transaksi lama tanpa metode = QRIS
  return String(raw).toLowerCase().trim();
};

// Label tampil: 'qris' → 'QRIS', 'cash' → 'CASH', null → '-'
const paymentLabel = (raw) => {
  const m = normalizeMethod(raw);
  if (!m) return '-';
  const MAP = { cash: 'CASH', transfer: 'TRANSFER', qris: 'QRIS', card: 'KARTU' };
  return MAP[m] || m.toUpperCase();
};

// Warna: QRIS oranye, cash hijau, transfer biru, kartu pink
const paymentColor = (raw) => {
  const m = normalizeMethod(raw);
  switch (m) {
    case 'cash':     return COLORS.success;
    case 'transfer': return COLORS.info;
    case 'qris':     return '#FF9800';
    case 'card':     return '#E91E63';
    default:         return COLORS.textMuted;
  }
};

export default function TransactionsScreen({ navigation }) {
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
    const mColor = paymentColor(item.payment_method);
    const mLabel = paymentLabel(item.payment_method);
    return (
      <TouchableOpacity style={styles.trxCard} onPress={() => openDetail(item)} activeOpacity={0.8}>
        <View style={styles.trxLeft}>
          <View style={[styles.methodDot, { backgroundColor: mColor }]} />
          <View>
            <Text style={styles.invoiceNo}>{item.invoice_number}</Text>
            <Text style={styles.trxDate}>{formatDate(item.transaction_date)}</Text>
            <Text style={styles.trxCashier}>Kasir: {item.cashier_name || '-'}</Text>
            {item.customer_name && <Text style={styles.trxCustomer}>Pelanggan: {item.customer_name}</Text>}
          </View>
        </View>
        <View style={styles.trxRight}>
          <Text style={styles.trxTotal}>{formatCurrency(item.total)}</Text>
          <View style={[styles.methodBadge, { backgroundColor: mColor + '22' }]}>
            <Text style={[styles.methodText, { color: mColor }]}>{mLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textDark} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaksi</Text>
        <Text style={styles.headerSub}>{transactions.length} transaksi</Text>
      </View>
      <View style={styles.presetRow}>
        {DATE_PRESETS.map((p, idx) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.presetBtn, activePreset === idx && styles.presetBtnActive]}
            onPress={() => applyPreset(idx)}
          >
            <Text style={[styles.presetText, activePreset === idx && styles.presetTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!isLoading && transactions.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryLabel}>Total Omzet</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
        </View>
      )}
      {isLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadTransactions(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={56} color={COLORS.textDark} />
              <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
              <Text style={styles.emptyText}>dalam periode yang dipilih</Text>
            </View>
          }
        />
      )}

      {/* Modal Detail */}
      <Modal visible={!!selectedTrx} animationType="slide" onRequestClose={() => { setSelectedTrx(null); setTrxDetail(null); }}>
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => { setSelectedTrx(null); setTrxDetail(null); }}>
              <Ionicons name="close" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Detail Transaksi</Text>
            {trxDetail && (
              <TouchableOpacity onPress={() => {
                setSelectedTrx(null); setTrxDetail(null);
                navigation.navigate('Receipt', { transactionId: selectedTrx.id, invoiceNumber: selectedTrx.invoice_number });
              }}>
                <Ionicons name="print-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
          {loadingDetail ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : trxDetail ? (
            <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                {[
                  { label: 'No Invoice', value: trxDetail.invoice_number },
                  { label: 'Tanggal',    value: formatDate(trxDetail.transaction_date) },
                  { label: 'Kasir',      value: trxDetail.cashier_name || '-' },
                  { label: 'Pelanggan',  value: trxDetail.customer_name || 'Umum' },
                ].map(r => (
                  <View key={r.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{r.label}</Text>
                    <Text style={styles.detailValue}>{r.value}</Text>
                  </View>
                ))}
                {/* Metode — badge berwarna */}
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.detailLabel}>Metode</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: paymentColor(trxDetail.payment_method) }} />
                    <Text style={[styles.detailValue, { color: paymentColor(trxDetail.payment_method), fontWeight: 'bold', fontSize: FONTS.md }]}>
                      {paymentLabel(trxDetail.payment_method)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.detailSectionTitle}>Item Dibeli</Text>
              <View style={styles.detailSection}>
                {(trxDetail.items || []).map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemRowLeft}>
                      <Text style={styles.itemName}>{item.product_name || item.name}</Text>
                      <Text style={styles.itemQty}>{item.quantity} × {formatCurrency(item.price)}</Text>
                    </View>
                    <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.detailSectionTitle}>Pembayaran</Text>
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Subtotal</Text>
                  <Text style={styles.detailValue}>{formatCurrency(trxDetail.subtotal)}</Text>
                </View>
                {Number(trxDetail.discount) > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: COLORS.success }]}>Diskon</Text>
                    <Text style={[styles.detailValue, { color: COLORS.success }]}>-{formatCurrency(trxDetail.discount)}</Text>
                  </View>
                )}
                <View style={[styles.detailRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={styles.totalValue}>{formatCurrency(trxDetail.total)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dibayar</Text>
                  <Text style={styles.detailValue}>{formatCurrency(trxDetail.payment_amount)}</Text>
                </View>
                {Number(trxDetail.change_amount) > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kembalian</Text>
                    <Text style={[styles.detailValue, { color: COLORS.success, fontWeight: 'bold' }]}>{formatCurrency(trxDetail.change_amount)}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: { paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, backgroundColor: COLORS.bgMedium },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  headerSub: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
  presetRow: { flexDirection: 'row', backgroundColor: COLORS.bgMedium, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  presetBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  presetBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  presetText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.medium },
  presetTextActive: { color: '#fff', fontWeight: FONTS.bold },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.primary + '15', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  summaryValue: { fontSize: FONTS.lg, color: COLORS.primary, fontWeight: FONTS.bold },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 60 },
  trxCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  trxLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, flex: 1 },
  methodDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  invoiceNo: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.bold },
  trxDate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  trxCashier: { fontSize: FONTS.xs, color: COLORS.textDark },
  trxCustomer: { fontSize: FONTS.xs, color: COLORS.primary, marginTop: 1 },
  trxRight: { alignItems: 'flex-end', gap: 4 },
  trxTotal: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.bold },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  methodText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.lg, color: COLORS.textMuted, fontWeight: FONTS.semibold },
  emptyText: { fontSize: FONTS.md, color: COLORS.textDark },
  detailContainer: { flex: 1, backgroundColor: COLORS.bgDark },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, backgroundColor: COLORS.bgMedium },
  detailTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  detailBody: { flex: 1, padding: SPACING.lg },
  detailSection: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  detailSectionTitle: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  detailLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  detailValue: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.medium },
  totalRow: { paddingTop: SPACING.sm, borderTopWidth: 2, borderTopColor: COLORS.border, marginTop: SPACING.sm, borderBottomWidth: 0 },
  totalLabel: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textWhite },
  totalValue: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.primary },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  itemRowLeft: { flex: 1 },
  itemName: { fontSize: FONTS.sm, color: COLORS.textWhite },
  itemQty: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  itemSubtotal: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
});