/**
 * PrinterContext.js
 * src/context/PrinterContext.js
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';

const PrinterContext = createContext(null);

const MSG = 'Gunakan tombol Print PDF untuk mencetak struk.';

export function PrinterProvider({ children }) {
  const [isScanning,      setIsScanning]   = useState(false);
  const [isConnecting,    setIsConnecting] = useState(false);
  const [isPrinting,      setIsPrinting]   = useState(false);
  const [connectedDevice, setConnected]    = useState(null);
  const [pairedDevices,   setPaired]       = useState([]);
  const [foundDevices,    setFound]        = useState([]);

  const initPrinter       = useCallback(async () => {}, []);
  const scanDevices       = useCallback(async () => { Alert.alert('Info', MSG); }, []);
  const connectPrinter    = useCallback(async () => { Alert.alert('Info', MSG); }, []);
  const disconnectPrinter = useCallback(async () => { setConnected(null); }, []);
  const printReceipt      = useCallback(async () => { Alert.alert('Info', MSG); return false; }, []);
  const testPrint         = useCallback(async () => { Alert.alert('Info', MSG); }, []);

  return (
    <PrinterContext.Provider value={{
      isScanning, isConnecting,
      isBtPrinting: isPrinting, isPrinting,
      connectedDevice, pairedDevices, foundDevices,
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