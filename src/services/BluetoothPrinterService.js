/**
 * src/services/BluetoothPrinterService.js
 * ============================================================
 * Service untuk print struk ke Bluetooth Thermal Printer fisik
 *
 * Library: react-native-bluetooth-escpos-printer
 * Install: sudah ada di package.json
 *
 * CARA PAKAI:
 *   import BluetoothPrinter from '../services/BluetoothPrinterService';
 *
 *   // 1. Scan printer
 *   const devices = await BluetoothPrinter.scanDevices();
 *
 *   // 2. Koneksi ke printer
 *   await BluetoothPrinter.connect(device.address);
 *
 *   // 3. Print struk
 *   await BluetoothPrinter.printReceipt(receiptData);
 *
 * CATATAN PENTING:
 * - Printer harus sudah di-pair di Bluetooth Settings HP terlebih dahulu
 * - Library ini butuh native build (tidak bisa di Expo Go biasa)
 * - Untuk testing di Expo Go: gunakan printToPDF() sebagai fallback
 * - Untuk produksi: build APK dengan EAS Build
 * ============================================================
 */

import { Platform, Alert } from 'react-native';
import { formatCurrency, formatDate } from '../utils/helpers';

// Cek apakah modul Bluetooth tersedia (hanya di native build)
let BluetoothManager = null;
let BluetoothEscposPrinter = null;

try {
  // Library ini hanya tersedia setelah build native (bukan Expo Go standar)
  const btLib = require('react-native-bluetooth-escpos-printer');
  BluetoothManager        = btLib.BluetoothManager;
  BluetoothEscposPrinter  = btLib.BluetoothEscposPrinter;
} catch (e) {
  console.warn('[BT Printer] Library Bluetooth tidak tersedia di environment ini.');
  console.warn('[BT Printer] Gunakan EAS Build untuk fitur Bluetooth.');
}

// Konstanta ESC/POS untuk thermal printer 58mm
const ESC  = '\x1B';
const GS   = '\x1D';
const BOLD_ON    = ESC + 'E\x01';
const BOLD_OFF   = ESC + 'E\x00';
const CENTER     = ESC + 'a\x01';
const LEFT       = ESC + 'a\x00';
const RIGHT      = ESC + 'a\x02';
const CUT        = GS  + 'V\x01';  // Full cut
const FEED       = ESC + 'd\x03';  // Feed 3 lines
const CHAR_NORMAL = ESC + '!\x00'; // Normal size
const CHAR_LARGE  = ESC + '!\x10'; // Double height

const PRINTER_WIDTH = 32; // Lebar karakter untuk kertas 58mm

/**
 * Helper: pad kanan & kiri string untuk alignment
 * @param {string} left - Teks kiri
 * @param {string} right - Teks kanan
 * @param {number} width - Lebar total
 */
const padLine = (left, right, width = PRINTER_WIDTH) => {
  const space = width - left.length - right.length;
  return left + ' '.repeat(Math.max(space, 1)) + right;
};

/**
 * Helper: center text dalam lebar printer
 */
const centerText = (text, width = PRINTER_WIDTH) => {
  const space = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(space) + text;
};

// ============================================================
// CLASS UTAMA
// ============================================================

const BluetoothPrinterService = {

  /**
   * Cek apakah fitur Bluetooth tersedia di perangkat ini
   */
  isAvailable() {
    return BluetoothManager !== null;
  },

  /**
   * Scan perangkat Bluetooth yang sudah di-pair
   * @returns {Promise<Array>} Array of { name, address }
   */
  async scanDevices() {
    if (!BluetoothManager) {
      throw new Error('Bluetooth tidak tersedia. Pastikan menggunakan APK build (bukan Expo Go).');
    }

    try {
      // Aktifkan Bluetooth jika belum aktif
      await BluetoothManager.enableBluetooth();

      // Ambil daftar perangkat yang sudah di-pair
      const paired = await BluetoothManager.scanDevices();
      const data   = JSON.parse(paired);

      // Gabungkan paired + found devices
      const devices = [
        ...(data.paired || []),
        ...(data.found  || []),
      ].filter(d => d.name); // filter yang punya nama

      return devices;
    } catch (error) {
      console.error('[BT Printer] Scan error:', error);
      throw new Error('Gagal scan Bluetooth: ' + error.message);
    }
  },

  /**
   * Koneksi ke printer Bluetooth
   * @param {string} address - MAC address printer (contoh: "AA:BB:CC:DD:EE:FF")
   */
  async connect(address) {
    if (!BluetoothManager) {
      throw new Error('Bluetooth tidak tersedia');
    }
    try {
      await BluetoothManager.connect(address);
      console.log('[BT Printer] Terhubung ke:', address);
      return true;
    } catch (error) {
      throw new Error('Gagal koneksi ke printer: ' + error.message);
    }
  },

  /**
   * Putuskan koneksi Bluetooth
   */
  async disconnect() {
    if (!BluetoothManager) return;
    try {
      await BluetoothManager.disconnect();
    } catch (e) {
      console.warn('[BT Printer] Disconnect error:', e);
    }
  },

  /**
   * Print struk transaksi ke thermal printer
   *
   * @param {object} receiptData - Data dari receiptAPI.getData()
   *   receiptData.transaction - Info transaksi
   *   receiptData.items       - Daftar produk
   *   receiptData.store       - Info toko
   */
  async printReceipt(receiptData) {
    if (!BluetoothEscposPrinter) {
      throw new Error('Printer Bluetooth tidak tersedia. Build APK terlebih dahulu.');
    }

    const printer = BluetoothEscposPrinter;
    const trx     = receiptData.transaction || {};
    const items   = receiptData.items       || [];
    const store   = receiptData.store       || {};
    const storeName = store.name || 'KASIR POS';

    try {
      // ── Header Toko ──────────────────────────────────────
      await printer.printerAlign(printer.ALIGN.CENTER);
      await printer.printText(BOLD_ON + storeName + BOLD_OFF + '\n', {});
      if (store.address) await printer.printText(store.address + '\n', {});
      if (store.phone)   await printer.printText('Telp: ' + store.phone + '\n', {});

      await printer.printText('-'.repeat(PRINTER_WIDTH) + '\n', {});

      // ── Info Transaksi ───────────────────────────────────
      await printer.printerAlign(printer.ALIGN.LEFT);
      await printer.printText('No : ' + (trx.invoice_number || '-') + '\n', {});
      await printer.printText('Tgl: ' + formatDate(trx.transaction_date) + '\n', {});
      await printer.printText('Kasir: ' + (trx.cashier_name || '-') + '\n', {});
      if (trx.customer_name) {
        await printer.printText('Pelanggan: ' + trx.customer_name + '\n', {});
      }

      await printer.printText('-'.repeat(PRINTER_WIDTH) + '\n', {});

      // ── Daftar Item ──────────────────────────────────────
      for (const item of items) {
        const name = item.product_name || item.name || '-';
        const qty  = `${item.quantity} x ${formatCurrency(item.price, false)}`;
        const sub  = formatCurrency(item.subtotal, false);

        // Nama produk (baris penuh jika panjang)
        await printer.printText(name + '\n', {});
        await printer.printText('  ' + padLine(qty, sub, PRINTER_WIDTH - 2) + '\n', {});
      }

      await printer.printText('-'.repeat(PRINTER_WIDTH) + '\n', {});

      // ── Ringkasan Harga ──────────────────────────────────
      const subtotalStr = 'Rp ' + formatCurrency(trx.subtotal || 0, false);
      await printer.printText(padLine('Subtotal', subtotalStr) + '\n', {});

      if ((trx.discount || 0) > 0) {
        const discStr = '-Rp ' + formatCurrency(trx.discount, false);
        await printer.printText(padLine('Diskon', discStr) + '\n', {});
      }

      // Total (lebih besar & tebal)
      const totalStr = 'Rp ' + formatCurrency(trx.total || 0, false);
      await printer.printText(BOLD_ON + padLine('TOTAL', totalStr) + BOLD_OFF + '\n', {});

      const payStr = 'Rp ' + formatCurrency(trx.payment_amount || 0, false);
      const method = trx.payment_method || 'cash';
      await printer.printText(padLine('Bayar (' + method + ')', payStr) + '\n', {});

      if ((trx.change_amount || 0) > 0) {
        const chgStr = 'Rp ' + formatCurrency(trx.change_amount, false);
        await printer.printText(padLine('Kembali', chgStr) + '\n', {});
      }

      await printer.printText('-'.repeat(PRINTER_WIDTH) + '\n', {});

      // ── Footer ───────────────────────────────────────────
      await printer.printerAlign(printer.ALIGN.CENTER);
      await printer.printText('Terima kasih!\n', {});
      await printer.printText('Barang tidak dapat dikembalikan\n', {});

      // Feed & Cut
      await printer.printText(FEED, {});
      await printer.cutPaper(printer.CUT_FULL);

      console.log('[BT Printer] ✅ Struk berhasil dicetak!');
      return true;

    } catch (error) {
      console.error('[BT Printer] Print error:', error);
      throw new Error('Gagal print: ' + error.message);
    }
  },

  /**
   * Print test page (untuk verifikasi koneksi printer)
   */
  async printTest() {
    if (!BluetoothEscposPrinter) {
      throw new Error('Printer Bluetooth tidak tersedia');
    }
    try {
      const p = BluetoothEscposPrinter;
      await p.printerAlign(p.ALIGN.CENTER);
      await p.printText(BOLD_ON + 'TEST PRINT\n' + BOLD_OFF, {});
      await p.printText('POS Mobile\n', {});
      await p.printText(new Date().toLocaleString('id-ID') + '\n', {});
      await p.printText('-'.repeat(PRINTER_WIDTH) + '\n', {});
      await p.printText('Printer terhubung dengan baik!\n', {});
      await p.printText(FEED, {});
      await p.cutPaper(p.CUT_FULL);
      return true;
    } catch (error) {
      throw new Error('Test print gagal: ' + error.message);
    }
  },
};

export default BluetoothPrinterService;
