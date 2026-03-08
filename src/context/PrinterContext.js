/**
 * PrinterContext.js
 * Letakkan di: src/context/PrinterContext.js
 *
 * Menggunakan: react-native-thermal-receipt-printer-image-qr
 * Support: Bluetooth Classic, 58mm & 80mm ESC/POS printer
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';

const PrinterContext = createContext(null);

export function PrinterProvider({ children }) {
  const [isScanning,      setIsScanning]   = useState(false);
  const [isConnecting,    setIsConnecting] = useState(false);
  const [isPrinting,      setIsPrinting]   = useState(false);
  const [connectedDevice, setConnected]    = useState(null);
  const [pairedDevices,   setPaired]       = useState([]);
  const [foundDevices,    setFound]        = useState([]);

  // ── Init printer ────────────────────────────────────────────
  const initPrinter = useCallback(async () => {
    try {
      await BLEPrinter.init();
    } catch (err) {
      console.warn('Printer init error:', err);
    }
  }, []);

  // ── Scan perangkat Bluetooth ────────────────────────────────
  const scanDevices = useCallback(async () => {
    try {
      setIsScanning(true);
      setFound([]);
      setPaired([]);

      await BLEPrinter.init();
      const devices = await BLEPrinter.getDeviceList();

      if (devices && devices.length > 0) {
        const mapped = devices.map(function (d) {
          return {
            name:    d.device_name || d.name || 'Unknown',
            address: d.inner_mac_address || d.address || '',
            raw:     d,
          };
        });
        setPaired(mapped);
        setFound(mapped);
      } else {
        Alert.alert(
          'Tidak Ada Perangkat',
          'Tidak ditemukan printer Bluetooth.\n\n' +
          'Pastikan:\n' +
          '• Bluetooth HP aktif\n' +
          '• Printer menyala\n' +
          '• Printer sudah di-pair di Pengaturan HP'
        );
      }
    } catch (err) {
      Alert.alert('Bluetooth Error', 'Gagal scan: ' + (err.message || err));
    } finally {
      setIsScanning(false);
    }
  }, []);

  // ── Koneksi ke printer ──────────────────────────────────────
  const connectPrinter = useCallback(async function (device) {
    try {
      setIsConnecting(true);
      await BLEPrinter.init();
      await BLEPrinter.connectPrinter(device.address);
      setConnected(device);
      Alert.alert('✅ Terhubung', 'Printer ' + device.name + ' berhasil terhubung!');
    } catch (err) {
      Alert.alert(
        'Gagal Konek',
        'Tidak bisa terhubung ke ' + device.name + '.\n' +
        'Pastikan printer menyala dan Bluetooth aktif.\n\n' +
        'Error: ' + (err.message || err)
      );
      setConnected(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Putus koneksi ───────────────────────────────────────────
  const disconnectPrinter = useCallback(async function () {
    try { await BLEPrinter.closeConn(); } catch (e) {}
    setConnected(null);
  }, []);

  // ── Helper ──────────────────────────────────────────────────
  function formatRp(v) {
    return 'Rp ' + Number(v).toLocaleString('id-ID');
  }

  function leftRight(left, right, col) {
    var space = col - left.length - right.length;
    if (space < 1) space = 1;
    return left + ' '.repeat(space) + right;
  }

  function divider(char, col) {
    return (char || '-').repeat(col || 32);
  }

  // ── Cetak struk ─────────────────────────────────────────────
  const printReceipt = useCallback(async function (receiptData) {
    if (!connectedDevice) {
      Alert.alert(
        'Printer Belum Terhubung',
        'Sambungkan ke printer Bluetooth terlebih dahulu di menu Pengaturan Printer.'
      );
      return false;
    }

    try {
      setIsPrinting(true);

      var storeName     = receiptData.storeName     || 'Toko Saya';
      var storeAddress  = receiptData.storeAddress  || '';
      var storePhone    = receiptData.storePhone    || '';
      var invoice       = receiptData.invoice       || '-';
      var date          = receiptData.date          || new Date().toLocaleString('id-ID');
      var cashier       = receiptData.cashier       || 'Kasir';
      var items         = receiptData.items         || [];
      var subtotal      = receiptData.subtotal      || 0;
      var discount      = receiptData.discount      || 0;
      var tax           = receiptData.tax           || 0;
      var total         = receiptData.total         || 0;
      var paymentMethod = receiptData.paymentMethod || 'Tunai';
      var paymentAmount = receiptData.paymentAmount || 0;
      var change        = receiptData.change        || 0;
      var notes         = receiptData.notes         || '';

      var COL = 32; // 58mm = 32 karakter

      var lines = [];

      // Header toko
      lines.push('[C]<b>' + storeName + '</b>');
      if (storeAddress) lines.push('[C]' + storeAddress);
      if (storePhone)   lines.push('[C]Telp: ' + storePhone);
      lines.push('[L]' + divider('=', COL));

      // Info transaksi
      lines.push('[L]No : ' + invoice);
      lines.push('[L]Tgl: ' + date);
      lines.push('[L]Ksr: ' + cashier);
      lines.push('[L]' + divider('-', COL));
      lines.push('[L]' + leftRight('Item', 'Subtotal', COL));
      lines.push('[L]' + divider('-', COL));

      // Item-item
      for (var i = 0; i < items.length; i++) {
        var item      = items[i];
        var itemName  = String(item.name || item.product_name || '').substring(0, COL);
        var itemQty   = Number(item.qty || item.quantity || 1);
        var itemPrice = Number(item.price || item.selling_price || 0);
        var itemTotal = itemQty * itemPrice;
        var qtyLine   = '  ' + itemQty + ' x ' + formatRp(itemPrice);

        lines.push('[L]' + itemName);
        lines.push('[L]' + leftRight(qtyLine, formatRp(itemTotal), COL));
      }

      lines.push('[L]' + divider('-', COL));
      lines.push('[L]' + leftRight('Subtotal', formatRp(subtotal), COL));
      if (discount > 0) {
        lines.push('[L]' + leftRight('Diskon', '-' + formatRp(discount), COL));
      }
      if (tax > 0) {
        lines.push('[L]' + leftRight('Pajak', formatRp(tax), COL));
      }
      lines.push('[L]' + divider('=', COL));
      lines.push('[L]<b>' + leftRight('TOTAL', formatRp(total), COL) + '</b>');
      lines.push('[L]' + divider('-', COL));
      lines.push('[L]' + leftRight('Bayar (' + paymentMethod + ')', formatRp(paymentAmount), COL));

      if (change >= 0 && paymentMethod.toLowerCase() === 'tunai') {
        lines.push('[L]' + leftRight('Kembali', formatRp(change), COL));
      }

      if (notes) {
        lines.push('[L]' + divider('-', COL));
        lines.push('[L]Catatan: ' + notes);
      }

      lines.push('[L]' + divider('=', COL));
      lines.push('[C]Terima kasih!');
      lines.push('[C]Barang yang sudah dibeli');
      lines.push('[C]tidak dapat dikembalikan');
      lines.push('[L] ');
      lines.push('[L] ');
      lines.push('[L] ');

      BLEPrinter.printText(lines.join('\n'));

      setIsPrinting(false);
      return true;

    } catch (err) {
      setIsPrinting(false);
      Alert.alert(
        'Gagal Cetak',
        'Pastikan printer menyala dan masih terhubung.\n\n' +
        'Error: ' + (err.message || err)
      );
      return false;
    }
  }, [connectedDevice]);

  // ── Test print ──────────────────────────────────────────────
  const testPrint = useCallback(async function () {
    if (!connectedDevice) {
      Alert.alert('Printer Belum Terhubung', 'Sambungkan printer dulu.');
      return;
    }
    try {
      BLEPrinter.printText([
        '[C]<b>=== TEST PRINT ===</b>',
        '[C]KasirPOS',
        '[C]Printer terhubung!',
        '[C]' + new Date().toLocaleString('id-ID'),
        '[C]==================',
        '[L] ',
        '[L] ',
        '[L] ',
      ].join('\n'));
      Alert.alert('✅ Test Berhasil', 'Printer berfungsi dengan baik!');
    } catch (err) {
      Alert.alert('Test Gagal', err.message || err);
    }
  }, [connectedDevice]);

  return (
    <PrinterContext.Provider value={{
      isScanning,
      isConnecting,
      isBtPrinting: isPrinting,
      isPrinting,
      connectedDevice,
      pairedDevices,
      foundDevices,
      initPrinter,
      scanDevices,
      connectPrinter,
      disconnectPrinter,
      printReceipt,
      testPrint,
    }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  var ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter harus dipakai di dalam PrinterProvider');
  return ctx;
}