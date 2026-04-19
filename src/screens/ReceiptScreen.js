/**
 * src/screens/ReceiptScreen.js — v3.0
 * Refactored: semua format struk menggunakan receiptFormatter.js
 * sehingga tampilan layar, PDF, dan share konsisten.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useCart } from '../context/CartContext';
import { usePrinter } from '../context/PrinterContext';
import { useTheme } from '../context/ThemeContext';
import { receiptAPI, receiptSettingsAPI } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { Platform } from 'react-native';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  buildReceiptHtml,
  buildReceiptData,
  buildShareText,
  normalizeSettings,
  normalizeReceipt,
} from '../utils/receiptFormatter';

export default function ReceiptScreen({ navigation, route }) {
  const { clearCart } = useCart();
  const { colors, isDark } = useTheme();
  const { connectedDevice, printReceipt } = usePrinter();
  const { transactionId, invoiceNumber } = route.params || {};

  const [receipt, setReceipt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [settings, setSettings] = useState(null);
  const autoPromptDone = useRef(false);

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!transactionId) { setIsLoading(false); return; }
      const result = await receiptAPI.getData(transactionId);
      if (result.success) setReceipt(result.data);
      setIsLoading(false);
    };
    load();
    clearCart();
  }, [transactionId]);

  useEffect(() => {
    receiptSettingsAPI.get().then(r => {
      if (r.success && r.data) setSettings(r.data);
    });
  }, []);

  // ── Auto-prompt cetak ─────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && receipt && !autoPromptDone.current) {
      autoPromptDone.current = true;
      setTimeout(() => {
        Alert.alert(
          '🖨️ Cetak Struk?',
          'Transaksi berhasil! Ingin mencetak struk sekarang?',
          [
            { text: 'Tidak', style: 'cancel' },
            { text: 'Print PDF', onPress: handlePrintPdf },
            { text: 'Thermal', onPress: handleThermalPrint },
          ]
        );
      }, 600);
    }
  }, [isLoading, receipt]);

  // ── Print PDF ─────────────────────────────────────────────────
  const handlePrintPdf = async () => {
    setIsPrinting(true);
    try {
      const html = buildReceiptHtml(receipt, settings);

      // Opsi print yang lebih baik
      const printOptions = {
        html: html,
        base64: false,
        // Untuk Android, tambahkan opsi ini
        ...(Platform.OS === 'android' && {
          margins: {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          },
        }),
      };

      const { uri } = await Print.printToFileAsync(printOptions);

      // Cek apakah device support sharing
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing tidak tersedia di device ini');
        setIsPrinting(false);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Simpan / Bagikan Struk',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      console.error('Print error:', e);
      Alert.alert('Gagal', 'Tidak bisa membuat PDF: ' + (e.message || 'Unknown error'));
    }
    setIsPrinting(false);
  };

  // ── Thermal print ─────────────────────────────────────────────
  const handleThermalPrint = async () => {
    if (!receipt) return;
    const data = buildReceiptData(receipt, settings);
    await printReceipt({
      storeName: data.store.name,
      storeAddress: data.store.address,
      storePhone: data.store.phone,
      invoice: data.transaction.invoice,
      date: data.transaction.date,
      cashier: data.transaction.cashier,
      items: data.items.map(i => ({
        name: i.name,
        qty: i.quantity,
        price: i.price,
      })),
      subtotal: data.payment.subtotal,
      discount: data.payment.discount,
      tax: data.payment.tax,
      total: data.payment.total,
      paymentMethod: data.payment.payMethod,
      paymentAmount: data.payment.payAmount,
      change: data.payment.changeAmount,
      notes: data.options.footerText,
    });
  };

  // ── Share text ────────────────────────────────────────────────
  const handleShareText = async () => {
    if (!receipt) return;
    setIsSharing(true);
    const text = buildShareText(receipt, settings);
    await Share.share({ message: text });
    setIsSharing(false);
  };

  const handleNewTransaction = () =>
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>Memuat struk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Data untuk render ─────────────────────────────────────────
  const receiptData = receipt ? buildReceiptData(receipt, settings) : null;
  const cfg = normalizeSettings(settings);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDark }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[s.header, {
        backgroundColor: colors.bgMedium,
        borderBottomColor: colors.border,
        borderBottomWidth: isDark ? 1 : 0.5,
      }]}>
        <View style={{ width: 24 }} />
        <Text style={[s.headerTitle, { color: colors.textWhite }]}>Struk Pembayaran</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrinterSettings')}
            style={[s.printerBtn, {
              backgroundColor: connectedDevice ? colors.success + '15' : colors.bgSurface,
              borderColor: connectedDevice ? colors.success + '40' : colors.border,
            }]}
          >
            <Ionicons
              name={connectedDevice ? 'print' : 'print-outline'}
              size={14}
              color={connectedDevice ? colors.success : colors.textDark}
            />
            <Text style={[s.printerBtnTxt, { color: connectedDevice ? colors.success : colors.textDark }]}>
              {connectedDevice ? connectedDevice.name.substring(0, 10) : 'Printer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewTransaction}>
            <Ionicons name="home-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sukses Banner ── */}
      <View style={[s.successBanner, {
        backgroundColor: colors.bgMedium,
        borderBottomColor: colors.border,
        borderBottomWidth: isDark ? 1 : 0.5,
      }]}>
        <View style={[s.successIcon, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={36} color={colors.success} />
        </View>
        <Text style={[s.successTitle, { color: colors.textWhite }]}>Transaksi Berhasil!</Text>
        <Text style={[s.successSub, { color: colors.textMuted }]}>
          {receiptData?.transaction.invoice || invoiceNumber || '-'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {receiptData ? (
          <View style={[s.receiptCard, {
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
            borderWidth: isDark ? 1 : 0.5,
            ...(!isDark && {
              shadowColor: '#00000012',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 1,
              shadowRadius: 8,
              elevation: 3,
            }),
          }]}>

            {/* ── Info toko ── */}
            {!receiptData.options.isMinimal ? (
              <View style={s.storeInfo}>
                <Text style={[s.storeName, { color: colors.textWhite }]}>{receiptData.store.name}</Text>
                {!!receiptData.store.address && (
                  <Text style={[s.storeDetail, { color: colors.textMuted }]}>{receiptData.store.address}</Text>
                )}
                {!!receiptData.store.phone && (
                  <Text style={[s.storeDetail, { color: colors.textMuted }]}>Telp: {receiptData.store.phone}</Text>
                )}
                {!!receiptData.store.email && (
                  <Text style={[s.storeDetail, { color: colors.textMuted }]}>{receiptData.store.email}</Text>
                )}
              </View>
            ) : (
              <Text style={[s.storeName, { color: colors.textWhite }]}>{receiptData.store.name}</Text>
            )}

            <View style={[s.dashed, { borderTopColor: colors.border }]} />

            {/* ── Info transaksi ── */}
            {[
              { l: 'No', v: receiptData.transaction.invoice },
              { l: 'Tanggal', v: receiptData.transaction.date },
              { l: 'Kasir', v: receiptData.transaction.cashier },
              receiptData.transaction.customer
                ? { l: 'Pelanggan', v: receiptData.transaction.customer }
                : null,
            ].filter(Boolean).map(r => (
              <View key={r.l} style={s.infoRow}>
                <Text style={[s.infoLabel, { color: colors.textMuted }]}>{r.l}</Text>
                <Text style={[s.infoValue, { color: colors.textLight }]}>{r.v}</Text>
              </View>
            ))}

            <View style={[s.dashed, { borderTopColor: colors.border }]} />

            {/* ── Daftar item ── */}
            {receiptData.items.map((item, i) => (
              receiptData.options.isDetail ? (
                <View key={String(i)} style={s.itemBlock}>
                  <Text style={[s.itemName, { color: colors.textWhite }]}>{item.name}</Text>
                  <View style={s.itemRow}>
                    <Text style={[s.itemQty, { color: colors.textMuted }]}>
                      {item.quantity} × {formatCurrency(item.price)}
                    </Text>
                    <Text style={[s.itemSub, { color: colors.textLight }]}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View key={String(i)} style={[s.itemBlock, s.itemRowStd]}>
                  <Text style={[s.itemNameStd, { color: colors.textWhite }]} numberOfLines={2}>
                    {item.name} ({item.quantity}x)
                  </Text>
                  <Text style={[s.itemSub, { color: colors.textLight }]}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
              )
            ))}

            <View style={[s.dashed, { borderTopColor: colors.border }]} />

            {/* ── Ringkasan ── */}
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Subtotal</Text>
              <Text style={[s.summaryValue, { color: colors.textLight }]}>
                {formatCurrency(receiptData.payment.subtotal)}
              </Text>
            </View>

            {receiptData.options.showDiscount && receiptData.payment.discount > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: colors.success }]}>Diskon</Text>
                <Text style={[s.summaryValue, { color: colors.success }]}>
                  -{formatCurrency(receiptData.payment.discount)}
                </Text>
              </View>
            )}

            {receiptData.options.showTax && receiptData.payment.tax > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Pajak</Text>
                <Text style={[s.summaryValue, { color: colors.textLight }]}>
                  {formatCurrency(receiptData.payment.tax)}
                </Text>
              </View>
            )}

            <View style={[s.summaryRow, s.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[s.totalLabel, { color: colors.textWhite }]}>TOTAL</Text>
              <Text style={[s.totalValue, { color: colors.primary }]}>
                {formatCurrency(receiptData.payment.total)}
              </Text>
            </View>

            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textMuted }]}>
                Bayar ({receiptData.payment.payMethod})
              </Text>
              <Text style={[s.summaryValue, { color: colors.textLight }]}>
                {formatCurrency(receiptData.payment.payAmount)}
              </Text>
            </View>

            {receiptData.payment.changeAmount > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: colors.textWhite, fontWeight: '700' }]}>
                  Kembalian
                </Text>
                <Text style={[s.summaryValue, { color: colors.primary, fontWeight: '700' }]}>
                  {formatCurrency(receiptData.payment.changeAmount)}
                </Text>
              </View>
            )}

            {/* ── Footer ── */}
            {!receiptData.options.isMinimal && (
              <>
                <View style={[s.dashed, { borderTopColor: colors.border }]} />
                <Text style={[s.footer, { color: colors.textMuted }]}>
                  {receiptData.options.footerText}
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={s.noReceipt}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.textDark} />
            <Text style={[s.noReceiptText, { color: colors.textMuted }]}>
              Data struk tidak tersedia
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Action bar ── */}
      <View style={[s.actionBar, {
        backgroundColor: colors.bgMedium,
        borderTopColor: colors.border,
        borderTopWidth: isDark ? 1 : 0.5,
      }]}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }]}
          onPress={handleShareText}
          disabled={isSharing || !receipt}
        >
          {isSharing
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="share-social-outline" size={18} color={colors.primary} />}
          <Text style={[s.btnSecondaryText, { color: colors.primary }]}>Bagikan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }]}
          onPress={handlePrintPdf}
          disabled={isPrinting || !receipt}
        >
          {isPrinting
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="print-outline" size={18} color={colors.primary} />}
          <Text style={[s.btnSecondaryText, { color: colors.primary }]}>Print PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#2196F3' }]}
          onPress={handleThermalPrint}
          disabled={!receipt}
        >
          <Ionicons name={connectedDevice ? 'print' : 'print-outline'} size={18} color="#fff" />
          <Text style={s.btnWhiteText}>{connectedDevice ? 'Cetak' : 'Thermal'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, s.btnWide, { backgroundColor: colors.primary }]}
          onPress={handleNewTransaction}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.btnWhiteText}>Baru</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText: { fontSize: FONTS.md },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  printerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  printerBtnTxt: { fontSize: 10, fontWeight: '600' },

  successBanner: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  successIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: FONTS.xl, fontWeight: '700' },
  successSub: { fontSize: FONTS.sm },

  receiptCard: { margin: SPACING.lg, borderRadius: RADIUS.xl, padding: SPACING.xl },

  storeInfo: { alignItems: 'center', marginBottom: SPACING.md },
  storeName: { fontSize: FONTS.lg, fontWeight: '700', textAlign: 'center' },
  storeDetail: { fontSize: FONTS.xs, textAlign: 'center', marginTop: 2 },

  dashed: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: SPACING.md },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  infoLabel: { fontSize: FONTS.xs, width: 80 },
  infoValue: { fontSize: FONTS.xs, flex: 1, textAlign: 'right' },

  // Standard item (1 baris)
  itemRowStd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemNameStd: { flex: 1, fontSize: FONTS.sm, fontWeight: '400', paddingRight: 8 },

  // Detail item (2 baris)
  itemBlock: { marginBottom: SPACING.sm },
  itemName: { fontSize: FONTS.sm, fontWeight: '500' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  itemQty: { fontSize: FONTS.xs },
  itemSub: { fontSize: FONTS.sm, fontWeight: '500' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: FONTS.sm },
  summaryValue: { fontSize: FONTS.sm },

  totalRow: { paddingTop: SPACING.sm, marginTop: SPACING.sm, borderTopWidth: 2, borderBottomWidth: 0 },
  totalLabel: { fontSize: FONTS.lg, fontWeight: '700' },
  totalValue: { fontSize: FONTS.xl, fontWeight: '900' },

  footer: { textAlign: 'center', fontSize: FONTS.xs, marginTop: SPACING.sm, fontStyle: 'italic' },

  noReceipt: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  noReceiptText: { fontSize: FONTS.md },

  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, paddingBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: RADIUS.md },
  btnWide: { flex: 1.2 },
  btnSecondaryText: { fontSize: 11, fontWeight: '600' },
  btnWhiteText: { fontSize: 11, color: '#fff', fontWeight: '700' },
});