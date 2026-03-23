/**
 * src/context/PrinterContext.js
 * ─────────────────────────────────────────────────────────────
 * PrinterContext — Safe fallback tanpa native library
 *
 * Status: Library bluetooth (react-native-bluetooth-escpos-printer)
 * belum kompatibel dengan Gradle 8+ / EAS Build.
 *
 * Sementara ini, fitur cetak tersedia via:
 *   - Print PDF  ✅ (expo-print + expo-sharing)
 *   - Share WA   ✅ (React Native Share)
 *
 * Fitur Bluetooth Thermal Printer akan diaktifkan setelah
 * library kompatibel ditemukan.
 * ─────────────────────────────────────────────────────────────
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';

const PrinterContext = createContext(null);

const BT_MSG =
  'Cetak ke Bluetooth Thermal Printer belum tersedia.\n\n' +
  'Gunakan tombol "Print PDF" atau "Bagikan" untuk mencetak struk.';

export function PrinterProvider({ children }) {
  const [isScanning,      setIsScanning]   = useState(false);
  const [isConnecting,    setIsConnecting] = useState(false);
  const [isPrinting,      setIsPrinting]   = useState(false);
  const [connectedDevice, setConnected]    = useState(null);
  const [pairedDevices,   setPaired]       = useState([]);
  const [foundDevices,    setFound]        = useState([]);

  const initPrinter       = useCallback(async () => {}, []);
  const scanDevices       = useCallback(async () => { Alert.alert('🖨️ Printer Bluetooth', BT_MSG); }, []);
  const connectPrinter    = useCallback(async () => { Alert.alert('🖨️ Printer Bluetooth', BT_MSG); }, []);
  const disconnectPrinter = useCallback(async () => { setConnected(null); }, []);
  const printReceipt      = useCallback(async () => { Alert.alert('🖨️ Printer Bluetooth', BT_MSG); return false; }, []);
  const testPrint         = useCallback(async () => { Alert.alert('🖨️ Printer Bluetooth', BT_MSG); }, []);

  return (
    <PrinterContext.Provider value={{
      isScanning, isConnecting, isPrinting,
      isBtPrinting: isPrinting,
      connectedDevice, pairedDevices, foundDevices,
      isLibAvailable: false,
      initPrinter, scanDevices, connectPrinter,
      disconnectPrinter, printReceipt, testPrint,
    }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter harus dipakai di dalam PrinterProvider');
  return ctx;
}