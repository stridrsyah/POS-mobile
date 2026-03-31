/**
 * src/screens/ReceiptScreen.js — Struk Transaksi (Theme-Aware FIXED)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCart } from '../context/CartContext';
import { usePrinter } from '../context/PrinterContext';
import { useTheme } from '../context/ThemeContext';
import { receiptAPI, receiptSettingsAPI } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency, formatDate } from '../utils/helpers';

function buildHtml(receipt, settings) {
  const trx   = receipt.transaction || receipt;
  const items = receipt.items  || [];
  const store = receipt.store  || {};
  const cfg   = settings || {};

  const storeName    = cfg.store_name    || store.store_name    || 'KasirPOS';
  const storeAddress = cfg.store_address || store.store_address || '';
  const storePhone   = cfg.store_phone   || store.store_phone   || '';
  const storeEmail   = cfg.store_email   || '';
  const storeWebsite = cfg.store_website || '';
  const footerText   = cfg.footer_text   || store.footer        || 'Terima kasih atas kunjungan Anda!';
  const showDiscount = cfg.show_discount !== 0 && cfg.show_discount !== false && cfg.show_discount !== '0';
  const showTax      = cfg.show_tax === 1 || cfg.show_tax === true || cfg.show_tax === '1';
  const template     = cfg.template    || 'standard';
  const fontSize     = cfg.font_size   || 'normal';
  const paperWidth   = cfg.paper_width || '58mm';

  const fMap = {
    small:  { base: 10, store: 13, total: 13 },
    normal: { base: 12, store: 15, total: 15 },
    large:  { base: 14, store: 17, total: 17 },
  };
  const f         = fMap[fontSize] || fMap.normal;
  const bodyWidth = paperWidth === '80mm' ? '380px' : '300px';
  const isMinimal = template === 'minimal';
  const isDetail  = template === 'detail';

  const css = [
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{font-family:Courier New,monospace;font-size:' + f.base + 'px;width:' + bodyWidth + ';margin:0 auto;padding:16px 8px}',
    '.divider{border-top:1px dashed #888;margin:6px 0}',
    '.center{text-align:center}',
    '.row{display:flex;justify-content:space-between;margin:2px 0}',
    '.bold{font-weight:bold}',
    '.muted{color:#555}',
  ].join('');

  let header = '';
  if (isMinimal) {
    header = '<div class="bold" style="font-size:' + f.store + 'px">' + storeName + '</div>';
  } else {
    header  = '<div class="center bold" style="font-size:' + f.store + 'px">' + storeName + '</div>';
    if (storeAddress) header += '<div class="center muted" style="font-size:' + (f.base - 1) + 'px">' + storeAddress + '</div>';
    if (storePhone)   header += '<div class="center muted" style="font-size:' + (f.base - 1) + 'px">Telp: ' + storePhone + '</div>';
    if (storeEmail)   header += '<div class="center muted" style="font-size:' + (f.base - 1) + 'px">' + storeEmail + '</div>';
    header += '<div class="divider"></div>';
  }

  const info = [
    '<div style="font-size:' + f.base + 'px;margin:2px 0">No   : ' + (trx.invoice_number || '-') + '</div>',
    '<div style="font-size:' + f.base + 'px;margin:2px 0">Tgl  : ' + formatDate(trx.transaction_date || trx.created_at) + '</div>',
    '<div style="font-size:' + f.base + 'px;margin:2px 0">Kasir: ' + (trx.cashier_name || '-') + '</div>',
    trx.customer_name ? '<div style="font-size:' + f.base + 'px;margin:2px 0">Cust : ' + trx.customer_name + '</div>' : '',
  ].join('');

  let itemsHtml = '';
  items.forEach(function(item) {
    var name = item.product_name || item.name || '';
    var qty  = item.quantity;
    var price = formatCurrency(item.price);
    var sub   = formatCurrency(item.subtotal);
    if (isDetail) {
      itemsHtml += '<div style="font-size:' + f.base + 'px;margin:4px 0">' + name + '</div>';
      itemsHtml += '<div class="row muted" style="font-size:' + (f.base - 1) + 'px;margin-bottom:4px"><span>' + qty + ' x ' + price + '</span><span>' + sub + '</span></div>';
    } else {
      itemsHtml += '<div class="row" style="font-size:' + f.base + 'px"><span style="flex:1">' + name + ' (' + qty + 'x)</span><span>' + sub + '</span></div>';
    }
  });

  var subtotalHtml  = '<div class="row" style="font-size:' + f.base + 'px"><span>Subtotal</span><span>' + formatCurrency(trx.subtotal || 0) + '</span></div>';
  var discountHtml  = (showDiscount && Number(trx.discount || 0) > 0)
    ? '<div class="row" style="font-size:' + f.base + 'px;color:green"><span>Diskon</span><span>-' + formatCurrency(trx.discount) + '</span></div>' : '';
  var taxHtml       = (showTax && Number(trx.tax || 0) > 0)
    ? '<div class="row" style="font-size:' + f.base + 'px"><span>Pajak</span><span>' + formatCurrency(trx.tax) + '</span></div>' : '';
  var totalHtml     = '<div class="row bold" style="font-size:' + f.total + 'px;border-top:2px solid #333;padding-top:4px;margin-top:4px"><span>TOTAL</span><span>' + formatCurrency(trx.total || 0) + '</span></div>';
  var bayarHtml     = '<div class="row" style="font-size:' + f.base + 'px"><span>Bayar (' + (trx.payment_method || '').toUpperCase() + ')</span><span>' + formatCurrency(trx.payment_amount || 0) + '</span></div>';
  var kembalianHtml = Number(trx.change_amount || 0) > 0
    ? '<div class="row bold" style="font-size:' + f.base + 'px"><span>Kembalian</span><span>' + formatCurrency(trx.change_amount) + '</span></div>' : '';

  var footerHtml = '';
  if (!isMinimal) {
    footerHtml  = '<div class="divider"></div>';
    footerHtml += '<div class="center muted" style="font-size:' + (f.base - 1) + 'px;font-style:italic">' + footerText + '</div>';
    if (storeWebsite) footerHtml += '<div class="center" style="font-size:' + (f.base - 2) + 'px;color:#999;margin-top:2px">' + storeWebsite + '</div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>' + css + '</style></head><body>' +
    header + info + '<div class="divider"></div>' + itemsHtml +
    '<div class="divider"></div>' + subtotalHtml + discountHtml + taxHtml + totalHtml + bayarHtml + kembalianHtml +
    footerHtml + '<div style="height:20px"></div></body></html>';
}

export default function ReceiptScreen({ navigation, route }) {
  const { clearCart } = useCart();
  const { colors, isDark } = useTheme();
  const { connectedDevice, printReceipt } = usePrinter();
  const { transactionId, invoiceNumber } = route.params || {};

  const [receipt,   setReceipt]   = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing,  setIsSharing]  = useState(false);
  const [settings,  setSettings]  = useState(null);
  const autoPromptDone = useRef(false);

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

  useEffect(() => {
    if (!isLoading && receipt && !autoPromptDone.current) {
      autoPromptDone.current = true;
      setTimeout(() => {
        Alert.alert('🖨️ Cetak Struk?', 'Transaksi berhasil! Ingin mencetak struk sekarang?', [
          { text: 'Tidak', style: 'cancel' },
          { text: 'Print PDF', onPress: handlePrintPdf },
          { text: '🔵 Thermal', onPress: handleThermalPrint },
        ]);
      }, 600);
    }
  }, [isLoading, receipt]);

  const handlePrintPdf = async () => {
    setIsPrinting(true);
    try {
      const html    = buildHtml(receipt, settings);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Print / Share Struk', UTI: 'com.adobe.pdf' });
    } catch (e) { Alert.alert('Gagal', 'Tidak bisa membuat PDF: ' + e.message); }
    setIsPrinting(false);
  };

  const handleThermalPrint = async () => {
    if (!receipt) return;
    const trx   = receipt?.transaction || receipt;
    const items = receipt?.items  || [];
    const store = receipt?.store  || {};
    const cfg   = settings || {};
    await printReceipt({
      storeName: cfg.store_name || store.store_name || 'KasirPOS',
      storeAddress: cfg.store_address || store.store_address || '',
      storePhone: cfg.store_phone || store.store_phone || '',
      invoice: trx?.invoice_number, date: formatDate(trx?.transaction_date || trx?.created_at),
      cashier: trx?.cashier_name,
      items: items.map(it => ({ name: it.product_name || it.name, qty: it.quantity, price: it.price })),
      subtotal: Number(trx?.subtotal || 0), discount: Number(trx?.discount || 0),
      tax: Number(trx?.tax || 0), total: Number(trx?.total || 0),
      paymentMethod: (trx?.payment_method || 'tunai').toUpperCase(),
      paymentAmount: Number(trx?.payment_amount || 0), change: Number(trx?.change_amount || 0),
      notes: cfg.footer_text || store.footer || 'Terima kasih!',
    });
  };

  const handleShareText = async () => {
    if (!receipt) return;
    setIsSharing(true);
    const trx   = receipt.transaction || receipt;
    const items = receipt.items || [];
    const store = receipt.store || {};
    const cfg   = settings || {};
    let text = '🧾 *STRUK BELANJA*\n' + (cfg.store_name || store.store_name || 'KasirPOS') + '\n';
    text += '─────────────────\n';
    text += 'No: ' + trx.invoice_number + '\nTgl: ' + formatDate(trx.transaction_date) + '\n';
    text += '─────────────────\n';
    items.forEach(item => {
      text += (item.product_name || item.name) + '\n';
      text += '  ' + item.quantity + ' x ' + formatCurrency(item.price) + ' = ' + formatCurrency(item.subtotal) + '\n';
    });
    text += '─────────────────\n';
    text += 'Subtotal: ' + formatCurrency(trx.subtotal || 0) + '\n';
    if (Number(trx.discount || 0) > 0) text += 'Diskon: -' + formatCurrency(trx.discount) + '\n';
    text += '*TOTAL: ' + formatCurrency(trx.total || 0) + '*\n';
    text += 'Bayar: ' + formatCurrency(trx.payment_amount || 0) + '\n';
    if (Number(trx.change_amount || 0) > 0) text += 'Kembalian: ' + formatCurrency(trx.change_amount) + '\n';
    text += '─────────────────\n' + (cfg.footer_text || 'Terima kasih! 🙏');
    await Share.share({ message: text });
    setIsSharing(false);
  };

  const handleNewTransaction = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat struk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const trx   = receipt?.transaction || receipt;
  const items = receipt?.items || [];
  const store = receipt?.store || {};
  const cfg   = settings || {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: colors.bgMedium,
        borderBottomColor: colors.border,
        borderBottomWidth: isDark ? 1 : 0.5,
      }]}>
        <View style={{ width: 24 }} />
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>Struk Pembayaran</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrinterSettings')}
            style={[styles.printerBtn, {
              backgroundColor: connectedDevice ? colors.success + '15' : colors.bgSurface,
              borderColor: connectedDevice ? colors.success + '40' : colors.border,
            }]}
          >
            <Ionicons name={connectedDevice ? 'print' : 'print-outline'} size={14}
              color={connectedDevice ? colors.success : colors.textDark} />
            <Text style={[styles.printerBtnTxt, { color: connectedDevice ? colors.success : colors.textDark }]}>
              {connectedDevice ? connectedDevice.name.substring(0, 10) : 'Printer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewTransaction}>
            <Ionicons name="home-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sukses Banner */}
      <View style={[styles.successBanner, {
        backgroundColor: colors.bgMedium,
        borderBottomColor: colors.border,
        borderBottomWidth: isDark ? 1 : 0.5,
      }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={36} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.textWhite }]}>Transaksi Berhasil!</Text>
        <Text style={[styles.successSub, { color: colors.textMuted }]}>{trx?.invoice_number || invoiceNumber || '-'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {receipt && trx ? (
          <View style={[styles.receiptCard, {
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
            borderWidth: isDark ? 1 : 0.5,
            ...(!isDark && { shadowColor: '#00000012', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 }),
          }]}>
            {/* Info toko */}
            <View style={styles.storeInfo}>
              <Text style={[styles.storeName, { color: colors.textWhite }]}>{cfg.store_name || store.store_name || 'KasirPOS'}</Text>
              {!!(cfg.store_address || store.store_address) && (
                <Text style={[styles.storeDetail, { color: colors.textMuted }]}>{cfg.store_address || store.store_address}</Text>
              )}
              {!!(cfg.store_phone || store.store_phone) && (
                <Text style={[styles.storeDetail, { color: colors.textMuted }]}>Telp: {cfg.store_phone || store.store_phone}</Text>
              )}
              {!!cfg.store_email   && <Text style={[styles.storeDetail, { color: colors.textMuted }]}>{cfg.store_email}</Text>}
            </View>
            <View style={[styles.dashed, { borderTopColor: colors.border }]} />

            {[
              { l: 'Tanggal', v: formatDate(trx.transaction_date || trx.created_at) },
              { l: 'Kasir',   v: trx.cashier_name || '-' },
              trx.customer_name ? { l: 'Pelanggan', v: trx.customer_name } : null,
            ].filter(Boolean).map(r => (
              <View key={r.l} style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{r.l}</Text>
                <Text style={[styles.infoValue, { color: colors.textLight }]}>{r.v}</Text>
              </View>
            ))}
            <View style={[styles.dashed, { borderTopColor: colors.border }]} />

            {items.map((item, i) => (
              <View key={String(i)} style={styles.itemBlock}>
                <Text style={[styles.itemName, { color: colors.textWhite }]}>{item.product_name || item.name}</Text>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemQty, { color: colors.textMuted }]}>{item.quantity} × {formatCurrency(item.price)}</Text>
                  <Text style={[styles.itemSub, { color: colors.textLight }]}>{formatCurrency(item.subtotal)}</Text>
                </View>
              </View>
            ))}
            <View style={[styles.dashed, { borderTopColor: colors.border }]} />

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.textLight }]}>{formatCurrency(trx.subtotal || 0)}</Text>
            </View>
            {(cfg.show_discount !== 0 && cfg.show_discount !== false) && Number(trx.discount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>Diskon</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>-{formatCurrency(trx.discount)}</Text>
              </View>
            )}
            {(cfg.show_tax === 1 || cfg.show_tax === true) && Number(trx.tax || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pajak</Text>
                <Text style={[styles.summaryValue, { color: colors.textLight }]}>{formatCurrency(trx.tax)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textWhite }]}>TOTAL</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(trx.total || 0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bayar ({(trx.payment_method || '').toUpperCase()})</Text>
              <Text style={[styles.summaryValue, { color: colors.textLight }]}>{formatCurrency(trx.payment_amount || 0)}</Text>
            </View>
            {Number(trx.change_amount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textWhite, fontWeight: '700' }]}>Kembalian</Text>
                <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>{formatCurrency(trx.change_amount)}</Text>
              </View>
            )}
            <View style={[styles.dashed, { borderTopColor: colors.border }]} />
            <Text style={[styles.footer, { color: colors.textMuted }]}>{cfg.footer_text || store.footer || 'Terima kasih atas kunjungan Anda!'}</Text>
          </View>
        ) : (
          <View style={styles.noReceipt}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.textDark} />
            <Text style={[styles.noReceiptText, { color: colors.textMuted }]}>Data struk tidak tersedia</Text>
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actionBar, {
        backgroundColor: colors.bgMedium,
        borderTopColor: colors.border,
        borderTopWidth: isDark ? 1 : 0.5,
      }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }]}
          onPress={handleShareText} disabled={isSharing || !receipt}
        >
          {isSharing
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="share-social-outline" size={18} color={colors.primary} />}
          <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>Bagikan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }]}
          onPress={handlePrintPdf} disabled={isPrinting || !receipt}
        >
          {isPrinting
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="print-outline" size={18} color={colors.primary} />}
          <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>Print PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#2196F3' }]}
          onPress={handleThermalPrint} disabled={!receipt}
        >
          <Ionicons name={connectedDevice ? 'print' : 'print-outline'} size={18} color="#fff" />
          <Text style={styles.btnWhiteText}>{connectedDevice ? 'Cetak' : 'Thermal'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnWide, { backgroundColor: colors.primary }]}
          onPress={handleNewTransaction}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.btnWhiteText}>Baru</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  loading:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText:   { fontSize: FONTS.md },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  headerTitle:   { fontSize: FONTS.lg, fontWeight: '700' },
  printerBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  printerBtnTxt: { fontSize: 10, fontWeight: '600' },
  successBanner: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  successIcon:   { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  successTitle:  { fontSize: FONTS.xl, fontWeight: '700' },
  successSub:    { fontSize: FONTS.sm },
  receiptCard:   { margin: SPACING.lg, borderRadius: RADIUS.xl, padding: SPACING.xl },
  storeInfo:     { alignItems: 'center', marginBottom: SPACING.md },
  storeName:     { fontSize: FONTS.lg, fontWeight: '700', textAlign: 'center' },
  storeDetail:   { fontSize: FONTS.xs, textAlign: 'center', marginTop: 2 },
  dashed:        { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: SPACING.md },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  infoLabel:     { fontSize: FONTS.xs, width: 80 },
  infoValue:     { fontSize: FONTS.xs, flex: 1, textAlign: 'right' },
  itemBlock:     { marginBottom: SPACING.sm },
  itemName:      { fontSize: FONTS.sm, fontWeight: '500' },
  itemRow:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  itemQty:       { fontSize: FONTS.xs },
  itemSub:       { fontSize: FONTS.sm, fontWeight: '500' },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel:  { fontSize: FONTS.sm },
  summaryValue:  { fontSize: FONTS.sm },
  totalRow:      { paddingTop: SPACING.sm, marginTop: SPACING.sm, borderTopWidth: 2, borderBottomWidth: 0 },
  totalLabel:    { fontSize: FONTS.lg, fontWeight: '700' },
  totalValue:    { fontSize: FONTS.xl, fontWeight: '900' },
  footer:        { textAlign: 'center', fontSize: FONTS.xs, marginTop: SPACING.sm, fontStyle: 'italic' },
  noReceipt:     { alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  noReceiptText: { fontSize: FONTS.md },
  actionBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, paddingBottom: 24 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: RADIUS.md },
  btnWide:       { flex: 1.2 },
  btnSecondaryText: { fontSize: 11, fontWeight: '600' },
  btnWhiteText:  { fontSize: 11, color: '#fff', fontWeight: '700' },
});
