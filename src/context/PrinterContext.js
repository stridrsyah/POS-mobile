/**
 * PrinterContext.js
 * Letakkan di: src/context/PrinterContext.js
 * 
 * Mengelola koneksi Bluetooth ke thermal printer (ESC/POS)
 * Compatible dengan: POS-58, POS-80, GOOJPRT, XP series, Cashino, dan semua ESC/POS printer
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import {
  BluetoothManager,
  BluetoothEscposPrinter,
  BluetoothTscPrinter,
} from 'react-native-bluetooth-escpos-printer';

const PrinterContext = createContext(null);

export function PrinterProvider({ children }) {
  const [isScanning, setIsScanning]       = useState(false);
  const [isConnecting, setIsConnecting]   = useState(false);
  const [isPrinting, setIsPrinting]       = useState(false);
  const [connectedDevice, setConnected]   = useState(null); // { name, address }
  const [pairedDevices, setPaired]        = useState([]);
  const [foundDevices, setFound]          = useState([]);

  // ── Scan perangkat Bluetooth di sekitar ──────────────────────
  const scanDevices = useCallback(async () => {
    try {
      setIsScanning(true);
      setFound([]);

      // Minta izin Bluetooth (Android 12+)
      if (Platform.OS === 'android') {
        const enabled = await BluetoothManager.isBluetoothEnabled();
        if (!enabled) {
          await BluetoothManager.enableBluetooth();
        }
      }

      // Ambil perangkat yang sudah pernah dipasangkan
      const paired = await BluetoothManager.enableBluetooth();
      if (paired && paired.length > 0) {
        const devices = paired.map(function(d) {
          var parsed = typeof d === 'string' ? JSON.parse(d) : d;
          return { name: parsed.name || 'Unknown', address: parsed.address };
        });
        setPaired(devices);
      }

      // Scan perangkat baru di sekitar
      BluetoothManager.onDeviceAlreadyPaired(function(rsp) {
        if (rsp && rsp.devices) {
          var devs = rsp.devices.map(function(d) {
            var parsed = typeof d === 'string' ? JSON.parse(d) : d;
            return { name: parsed.name || 'Unknown', address: parsed.address };
          });
          setPaired(devs);
        }
      });

      BluetoothManager.onDeviceFound(function(rsp) {
        if (rsp && rsp.device) {
          var parsed = typeof rsp.device === 'string' ? JSON.parse(rsp.device) : rsp.device;
          var dev = { name: parsed.name || 'Unknown', address: parsed.address };
          setFound(function(prev) {
            var exists = prev.find(function(p) { return p.address === dev.address; });
            return exists ? prev : prev.concat([dev]);
          });
        }
      });

      await BluetoothManager.scanDevices();

    } catch (err) {
      Alert.alert('Bluetooth Error', 'Gagal scan perangkat: ' + (err.message || err));
    } finally {
      setIsScanning(false);
    }
  }, []);

  // ── Koneksi ke printer ────────────────────────────────────────
  const connectPrinter = useCallback(async function(device) {
    try {
      setIsConnecting(true);
      await BluetoothManager.connect(device.address);
      setConnected(device);
      Alert.alert('✅ Terhubung', 'Printer ' + device.name + ' berhasil terhubung!');
    } catch (err) {
      Alert.alert('Gagal Konek', 'Tidak bisa terhubung ke ' + device.name + '.\nPastikan printer menyala dan Bluetooth aktif.');
      setConnected(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Putus koneksi ─────────────────────────────────────────────
  const disconnectPrinter = useCallback(async function() {
    try {
      await BluetoothManager.disconnect();
      setConnected(null);
    } catch (err) {
      setConnected(null);
    }
  }, []);

  // ── Cetak struk ───────────────────────────────────────────────
  const printReceipt = useCallback(async function(receiptData) {
    if (!connectedDevice) {
      Alert.alert('Printer Belum Terhubung', 'Sambungkan ke printer Bluetooth terlebih dahulu di menu Pengaturan Printer.');
      return false;
    }

    try {
      setIsPrinting(true);

      var storeName    = receiptData.storeName    || 'Toko Saya';
      var storeAddress = receiptData.storeAddress || '';
      var storePhone   = receiptData.storePhone   || '';
      var invoice      = receiptData.invoice      || '-';
      var date         = receiptData.date         || new Date().toLocaleString('id-ID');
      var cashier      = receiptData.cashier      || 'Kasir';
      var items        = receiptData.items        || [];
      var subtotal     = receiptData.subtotal     || 0;
      var discount     = receiptData.discount     || 0;
      var tax          = receiptData.tax          || 0;
      var total        = receiptData.total        || 0;
      var paymentMethod = receiptData.paymentMethod || 'Tunai';
      var paymentAmount = receiptData.paymentAmount || 0;
      var change       = receiptData.change       || 0;
      var notes        = receiptData.notes        || '';

      function formatRp(v) {
        return 'Rp ' + Number(v).toLocaleString('id-ID');
      }

      // Lebar kertas 58mm = 32 karakter per baris
      var COL = 32;

      function line(text) {
        return text.substring(0, COL);
      }

      function centerText(text) {
        var pad = Math.max(0, Math.floor((COL - text.length) / 2));
        return ' '.repeat(pad) + text;
      }

      function leftRight(left, right) {
        var space = COL - left.length - right.length;
        if (space < 1) space = 1;
        return left + ' '.repeat(space) + right;
      }

      function divider(char) {
        return (char || '-').repeat(COL);
      }

      // ── Mulai cetak ──
      await BluetoothEscposPrinter.printerInit();

      // Nama toko — besar di tengah
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText(storeName + '\n', {
        encoding: 'GBK',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        fonttype: 1,
      });

      // Alamat & telepon
      if (storeAddress) {
        await BluetoothEscposPrinter.printText(storeAddress + '\n', { encoding: 'GBK', codepage: 0 });
      }
      if (storePhone) {
        await BluetoothEscposPrinter.printText('Telp: ' + storePhone + '\n', { encoding: 'GBK', codepage: 0 });
      }

      await BluetoothEscposPrinter.printText(divider('=') + '\n', { encoding: 'GBK', codepage: 0 });

      // Info transaksi
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
      await BluetoothEscposPrinter.printText('No : ' + invoice + '\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('Tgl: ' + date + '\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('Ksr: ' + cashier + '\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText(divider('-') + '\n', { encoding: 'GBK', codepage: 0 });

      // Header kolom
      await BluetoothEscposPrinter.printText(
        leftRight('Item', 'Subtotal') + '\n',
        { encoding: 'GBK', codepage: 0 }
      );
      await BluetoothEscposPrinter.printText(divider('-') + '\n', { encoding: 'GBK', codepage: 0 });

      // Item-item
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var itemName  = String(item.name || item.product_name || '').substring(0, COL);
        var itemQty   = Number(item.qty || item.quantity || 1);
        var itemPrice = Number(item.price || item.selling_price || 0);
        var itemTotal = itemQty * itemPrice;

        // Nama produk (baris pertama)
        await BluetoothEscposPrinter.printText(itemName + '\n', { encoding: 'GBK', codepage: 0 });
        // Qty x harga = subtotal (baris kedua, rata kanan)
        var qtyLine = '  ' + itemQty + ' x ' + formatRp(itemPrice);
        await BluetoothEscposPrinter.printText(
          leftRight(qtyLine, formatRp(itemTotal)) + '\n',
          { encoding: 'GBK', codepage: 0 }
        );
      }

      await BluetoothEscposPrinter.printText(divider('-') + '\n', { encoding: 'GBK', codepage: 0 });

      // Subtotal, diskon, pajak
      await BluetoothEscposPrinter.printText(
        leftRight('Subtotal', formatRp(subtotal)) + '\n',
        { encoding: 'GBK', codepage: 0 }
      );
      if (discount > 0) {
        await BluetoothEscposPrinter.printText(
          leftRight('Diskon', '-' + formatRp(discount)) + '\n',
          { encoding: 'GBK', codepage: 0 }
        );
      }
      if (tax > 0) {
        await BluetoothEscposPrinter.printText(
          leftRight('Pajak', formatRp(tax)) + '\n',
          { encoding: 'GBK', codepage: 0 }
        );
      }

      await BluetoothEscposPrinter.printText(divider('=') + '\n', { encoding: 'GBK', codepage: 0 });

      // TOTAL — cetak besar
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
      await BluetoothEscposPrinter.printText(
        leftRight('TOTAL', formatRp(total)) + '\n',
        {
          encoding: 'GBK', codepage: 0,
          widthtimes: 1, heigthtimes: 1, fonttype: 1,
        }
      );

      await BluetoothEscposPrinter.printText(divider('-') + '\n', { encoding: 'GBK', codepage: 0 });

      // Pembayaran
      await BluetoothEscposPrinter.printText(
        leftRight('Bayar (' + paymentMethod + ')', formatRp(paymentAmount)) + '\n',
        { encoding: 'GBK', codepage: 0 }
      );
      if (change >= 0 && paymentMethod.toLowerCase() === 'tunai') {
        await BluetoothEscposPrinter.printText(
          leftRight('Kembali', formatRp(change)) + '\n',
          { encoding: 'GBK', codepage: 0 }
        );
      }

      // Catatan
      if (notes) {
        await BluetoothEscposPrinter.printText(divider('-') + '\n', { encoding: 'GBK', codepage: 0 });
        await BluetoothEscposPrinter.printText('Catatan: ' + notes + '\n', { encoding: 'GBK', codepage: 0 });
      }

      await BluetoothEscposPrinter.printText(divider('=') + '\n', { encoding: 'GBK', codepage: 0 });

      // Footer
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText('Terima kasih!\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('Barang yang sudah dibeli\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('tidak dapat dikembalikan\n', { encoding: 'GBK', codepage: 0 });

      // Feed kertas ke bawah supaya bisa dipotong
      await BluetoothEscposPrinter.printText('\n\n\n\n', { encoding: 'GBK', codepage: 0 });

      setIsPrinting(false);
      return true;

    } catch (err) {
      setIsPrinting(false);
      Alert.alert(
        'Gagal Cetak',
        'Terjadi kesalahan saat mencetak.\n' +
        'Pastikan printer menyala dan masih terhubung.\n\n' +
        'Error: ' + (err.message || err)
      );
      return false;
    }
  }, [connectedDevice]);

  // ── Test print sederhana ──────────────────────────────────────
  const testPrint = useCallback(async function() {
    if (!connectedDevice) {
      Alert.alert('Printer Belum Terhubung', 'Sambungkan printer dulu.');
      return;
    }
    try {
      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText('=== TEST PRINT ===\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('KasirPOS\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('Printer terhubung!\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText(new Date().toLocaleString('id-ID') + '\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('==================\n', { encoding: 'GBK', codepage: 0 });
      await BluetoothEscposPrinter.printText('\n\n\n', { encoding: 'GBK', codepage: 0 });
      Alert.alert('✅ Test Berhasil', 'Printer berfungsi dengan baik!');
    } catch (err) {
      Alert.alert('Test Gagal', err.message || err);
    }
  }, [connectedDevice]);

  return (
    <PrinterContext.Provider value={{
      // State
      isScanning,
      isConnecting,
      isPrinting,
      connectedDevice,
      pairedDevices,
      foundDevices,
      // Actions
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