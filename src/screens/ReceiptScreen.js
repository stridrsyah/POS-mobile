/**
 * src/screens/ReceiptScreen.js — Struk Transaksi
 * - Print PDF pakai pengaturan struk (template/font/paper)
 * - Cetak ke Bluetooth Thermal Printer
 * - Share via WhatsApp
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCart } from '../context/CartContext';
import { usePrinter } from '../context/PrinterContext';
import { receiptAPI, receiptSettingsAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency, formatDate } from '../utils/helpers';

// Bluetooth dikelola oleh PrinterContext

// ── Helper: build HTML struk tanpa nested template literal ───
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

  // ── CSS ──
  const css = [
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{font-family:Courier New,monospace;font-size:' + f.base + 'px;width:' + bodyWidth + ';margin:0 auto;padding:16px 8px}',
    '.divider{border-top:1px dashed #888;margin:6px 0}',
    '.center{text-align:center}',
    '.row{display:flex;justify-content:space-between;margin:2px 0}',
    '.bold{font-weight:bold}',
    '.muted{color:#555}',
  ].join('');

  // ── Header toko ──
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

  // ── Info transaksi ──
  const info = [
    '<div style="font-size:' + f.base + 'px;margin:2px 0">No   : ' + (trx.invoice_number || '-') + '</div>',
    '<div style="font-size:' + f.base + 'px;margin:2px 0">Tgl  : ' + formatDate(trx.transaction_date || trx.created_at) + '</div>',
    '<div style="font-size:' + f.base + 'px;margin:2px 0">Kasir: ' + (trx.cashier_name || '-') + '</div>',
    trx.customer_name ? '<div style="font-size:' + f.base + 'px;margin:2px 0">Cust : ' + trx.customer_name + '</div>' : '',
  ].join('');

  // ── Items ──
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

  // ── Ringkasan ──
  var subtotalHtml  = '<div class="row" style="font-size:' + f.base + 'px"><span>Subtotal</span><span>' + formatCurrency(trx.subtotal || 0) + '</span></div>';
  var discountHtml  = (showDiscount && Number(trx.discount || 0) > 0)
    ? '<div class="row" style="font-size:' + f.base + 'px;color:green"><span>Diskon</span><span>-' + formatCurrency(trx.discount) + '</span></div>'
    : '';
  var taxHtml       = (showTax && Number(trx.tax || 0) > 0)
    ? '<div class="row" style="font-size:' + f.base + 'px"><span>Pajak</span><span>' + formatCurrency(trx.tax) + '</span></div>'
    : '';
  var totalHtml     = '<div class="row bold" style="font-size:' + f.total + 'px;border-top:2px solid #333;padding-top:4px;margin-top:4px"><span>TOTAL</span><span>' + formatCurrency(trx.total || 0) + '</span></div>';
  var bayarHtml     = '<div class="row" style="font-size:' + f.base + 'px"><span>Bayar (' + (trx.payment_method || '').toUpperCase() + ')</span><span>' + formatCurrency(trx.payment_amount || 0) + '</span></div>';
  var kembalianHtml = Number(trx.change_amount || 0) > 0
    ? '<div class="row bold" style="font-size:' + f.base + 'px"><span>Kembalian</span><span>' + formatCurrency(trx.change_amount) + '</span></div>'
    : '';

  // ── Footer ──
  var footerHtml = '';
  if (!isMinimal) {
    footerHtml  = '<div class="divider"></div>';
    footerHtml += '<div class="center muted" style="font-size:' + (f.base - 1) + 'px;font-style:italic">' + footerText + '</div>';
    if (storeWebsite) footerHtml += '<div class="center" style="font-size:' + (f.base - 2) + 'px;color:#999;margin-top:2px">' + storeWebsite + '</div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>' + css + '</style></head><body>' +
    header + info +
    '<div class="divider"></div>' + itemsHtml +
    '<div class="divider"></div>' + subtotalHtml + discountHtml + taxHtml + totalHtml + bayarHtml + kembalianHtml +
    footerHtml +
    '<div style="height:20px"></div></body></html>';
}

export default function ReceiptScreen({ navigation, route }) {
  const { clearCart } = useCart();
  const {
    connectedDevice,
    isScanning,
    isBtPrinting: isBtPrintingCtx,
    scanDevices,
    connectPrinter,
    printReceipt,
    testPrint,
  } = usePrinter();
  const { transactionId, invoiceNumber } = route.params || {};

  const [receipt,      setReceipt]      = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isPrinting,   setIsPrinting]   = useState(false);
  const [isSharing,    setIsSharing]    = useState(false);
  const [isBtPrinting, setIsBtPrinting] = useState(false);
  const [settings,     setSettings]     = useState(null);

  const [btModalVisible, setBtModalVisible] = useState(false);

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
        Alert.alert(
          '🖨️ Cetak Struk?',
          'Transaksi berhasil! Ingin mencetak struk sekarang?',
          [
            { text: 'Tidak', style: 'cancel' },
            { text: 'Print PDF', onPress: handlePrintPdf },
            { text: '🔵 Thermal', onPress: handleThermalPrint },
          ]
        );
      }, 600);
    }
  }, [isLoading, receipt]);

  const handlePrintPdf = async () => {
    setIsPrinting(true);
    try {
      const html      = buildHtml(receipt, settings);
      const { uri }   = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType:    'application/pdf',
        dialogTitle: 'Print / Share Struk',
        UTI:         'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Gagal', 'Tidak bisa membuat PDF: ' + e.message);
    }
    setIsPrinting(false);
  };

  // scan dikelola PrinterContext — buka PrinterSettings lewat navigasi

  // Cetak thermal pakai PrinterContext
  const handleThermalPrint = async () => {
    if (!receipt) return;
    const trx   = receipt?.transaction || receipt;
    const items = receipt?.items  || [];
    const store = receipt?.store  || {};
    const cfg   = settings || {};

    await printReceipt({
      storeName:     cfg.store_name    || store.store_name    || 'KasirPOS',
      storeAddress:  cfg.store_address || store.store_address || '',
      storePhone:    cfg.store_phone   || store.store_phone   || '',
      invoice:       trx?.invoice_number,
      date:          formatDate(trx?.transaction_date || trx?.created_at),
      cashier:       trx?.cashier_name,
      items:         items.map(function(it) { return {
        name:  it.product_name || it.name,
        qty:   it.quantity,
        price: it.price,
      }; }),
      subtotal:      Number(trx?.subtotal || 0),
      discount:      Number(trx?.discount || 0),
      tax:           Number(trx?.tax || 0),
      total:         Number(trx?.total || 0),
      paymentMethod: (trx?.payment_method || 'tunai').toUpperCase(),
      paymentAmount: Number(trx?.payment_amount || 0),
      change:        Number(trx?.change_amount || 0),
      notes:         cfg.footer_text || store.footer || 'Terima kasih!',
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat struk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const trx   = receipt?.transaction || receipt;
  const items = receipt?.items || [];
  const store = receipt?.store || {};
  const cfg   = settings || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Struk Pembayaran</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Status printer — tap buka settings */}
          <TouchableOpacity
            onPress={function() { navigation.navigate('PrinterSettings'); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: connectedDevice ? 'rgba(38,166,154,0.15)' : 'rgba(255,255,255,0.06)',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
              borderWidth: 1,
              borderColor: connectedDevice ? 'rgba(38,166,154,0.4)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <Ionicons
              name={connectedDevice ? 'print' : 'print-outline'}
              size={14}
              color={connectedDevice ? '#26a69a' : COLORS.textDark}
            />
            <Text style={{ fontSize: 10, color: connectedDevice ? '#26a69a' : COLORS.textDark, fontWeight: '600' }}>
              {connectedDevice ? connectedDevice.name.substring(0, 10) : 'Printer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewTransaction}>
            <Ionicons name="home-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sukses */}
      <View style={styles.successBanner}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
        </View>
        <Text style={styles.successTitle}>Transaksi Berhasil!</Text>
        <Text style={styles.successSub}>{trx?.invoice_number || invoiceNumber || '-'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {receipt && trx ? (
          <View style={styles.receiptCard}>
            {/* Info toko — pakai settings */}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{cfg.store_name || store.store_name || 'KasirPOS'}</Text>
              {!!(cfg.store_address || store.store_address) && (
                <Text style={styles.storeDetail}>{cfg.store_address || store.store_address}</Text>
              )}
              {!!(cfg.store_phone || store.store_phone) && (
                <Text style={styles.storeDetail}>Telp: {cfg.store_phone || store.store_phone}</Text>
              )}
              {!!cfg.store_email   && <Text style={styles.storeDetail}>{cfg.store_email}</Text>}
              {!!cfg.store_website && <Text style={[styles.storeDetail, { fontStyle: 'italic' }]}>{cfg.store_website}</Text>}
            </View>
            <View style={styles.dashed} />

            {[
              { l: 'Tanggal',  v: formatDate(trx.transaction_date || trx.created_at) },
              { l: 'Kasir',    v: trx.cashier_name || '-' },
              trx.customer_name ? { l: 'Pelanggan', v: trx.customer_name } : null,
            ].filter(Boolean).map(r => (
              <View key={r.l} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{r.l}</Text>
                <Text style={styles.infoValue}>{r.v}</Text>
              </View>
            ))}
            <View style={styles.dashed} />

            {items.map((item, i) => (
              <View key={String(i)} style={styles.itemBlock}>
                <Text style={styles.itemName}>{item.product_name || item.name}</Text>
                <View style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity} × {formatCurrency(item.price)}</Text>
                  <Text style={styles.itemSub}>{formatCurrency(item.subtotal)}</Text>
                </View>
              </View>
            ))}
            <View style={styles.dashed} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(trx.subtotal || 0)}</Text>
            </View>
            {(cfg.show_discount !== 0 && cfg.show_discount !== false) && Number(trx.discount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Diskon</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>-{formatCurrency(trx.discount)}</Text>
              </View>
            )}
            {(cfg.show_tax === 1 || cfg.show_tax === true) && Number(trx.tax || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pajak</Text>
                <Text style={styles.summaryValue}>{formatCurrency(trx.tax)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatCurrency(trx.total || 0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bayar ({(trx.payment_method || '').toUpperCase()})</Text>
              <Text style={styles.summaryValue}>{formatCurrency(trx.payment_amount || 0)}</Text>
            </View>
            {Number(trx.change_amount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>Kembalian</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary, fontWeight: 'bold' }]}>
                  {formatCurrency(trx.change_amount)}
                </Text>
              </View>
            )}
            <View style={styles.dashed} />
            <Text style={styles.footer}>{cfg.footer_text || store.footer || 'Terima kasih atas kunjungan Anda!'}</Text>
            {!!cfg.store_website && (
              <Text style={[styles.footer, { marginTop: 2, fontSize: FONTS.xs - 1 }]}>{cfg.store_website}</Text>
            )}
          </View>
        ) : (
          <View style={styles.noReceipt}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.textDark} />
            <Text style={styles.noReceiptText}>Data struk tidak tersedia</Text>
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnSecondary]}
          onPress={handleShareText}
          disabled={isSharing || !receipt}
        >
          {isSharing
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />}
          <Text style={styles.btnSecondaryText}>Bagikan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnSecondary]}
          onPress={handlePrintPdf}
          disabled={isPrinting || !receipt}
        >
          {isPrinting
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="print-outline" size={18} color={COLORS.primary} />}
          <Text style={styles.btnSecondaryText}>Print PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnBluetooth]}
          onPress={handleThermalPrint}
          disabled={!receipt}
        >
          <Ionicons
            name={connectedDevice ? 'print' : 'print-outline'}
            size={18} color="#fff"
          />
          <Text style={styles.btnBluetoothText}>
            {connectedDevice ? 'Cetak' : 'Thermal'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnPrimary]}
          onPress={handleNewTransaction}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>Baru</Text>
        </TouchableOpacity>
      </View>

      {/* Modal BT dipindah ke PrinterSettingsScreen */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bgDark },
  loading:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText:      { color: COLORS.textMuted, fontSize: FONTS.md },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle:      { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  successBanner:    { alignItems: 'center', paddingVertical: SPACING.xl, backgroundColor: COLORS.bgMedium, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  successIcon:      { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center' },
  successTitle:     { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  successSub:       { fontSize: FONTS.sm, color: COLORS.textMuted },
  receiptCard:      { margin: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  storeInfo:        { alignItems: 'center', marginBottom: SPACING.md },
  storeName:        { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite, textAlign: 'center' },
  storeDetail:      { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  dashed:           { borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed', marginVertical: SPACING.md },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  infoLabel:        { fontSize: FONTS.xs, color: COLORS.textMuted, width: 80 },
  infoValue:        { fontSize: FONTS.xs, color: COLORS.textLight, flex: 1, textAlign: 'right' },
  itemBlock:        { marginBottom: SPACING.sm },
  itemName:         { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.medium },
  itemRow:          { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  itemQty:          { fontSize: FONTS.xs, color: COLORS.textMuted },
  itemSub:          { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium },
  summaryRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel:     { fontSize: FONTS.sm, color: COLORS.textMuted },
  summaryValue:     { fontSize: FONTS.sm, color: COLORS.textLight },
  totalRow:         { paddingTop: SPACING.sm, marginTop: SPACING.sm, borderTopWidth: 2, borderTopColor: COLORS.border },
  totalLabel:       { fontSize: FONTS.lg, color: COLORS.textWhite, fontWeight: FONTS.bold },
  totalValue:       { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.black },
  footer:           { textAlign: 'center', fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.sm, fontStyle: 'italic' },
  noReceipt:        { alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  noReceiptText:    { color: COLORS.textMuted, fontSize: FONTS.md },
  actionBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 6, backgroundColor: COLORS.bgMedium, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, paddingBottom: 24 },
  actionBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: RADIUS.md },
  btnSecondary:     { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  btnSecondaryText: { fontSize: 11, color: COLORS.primary, fontWeight: FONTS.semibold },
  btnBluetooth:     { backgroundColor: '#2196F3' },
  btnBluetoothText: { fontSize: 11, color: '#fff', fontWeight: FONTS.bold },
  btnPrimary:       { backgroundColor: COLORS.primary, flex: 1.2 },
  btnPrimaryText:   { fontSize: 11, color: '#fff', fontWeight: FONTS.bold },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox:         { backgroundColor: COLORS.bgMedium, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40, maxHeight: '70%' },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle:       { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  modalCenter:      { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  modalSubText:     { color: COLORS.textMuted, fontSize: FONTS.sm },
  rescanBtn:        { marginTop: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  rescanBtnText:    { color: '#fff', fontWeight: FONTS.bold },
  deviceRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  deviceName:       { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.medium },
  deviceAddr:       { fontSize: FONTS.xs, color: COLORS.textDark },
});