/**
 * App.js — Root Aplikasi KasirPOS v2 oleh AprilTech
 * Dengan Dark/Light theme, Offline support, professional UX
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider }    from './src/context/AuthContext';
import { CartProvider }    from './src/context/CartContext';
import { PrinterProvider } from './src/context/PrinterContext';
import RootNavigator       from './src/navigation/RootNavigator';
import SplashScreen        from './src/screens/SplashScreen';
import { initImageCache }  from './src/services/api';
import { initNetworkListener, pendingTransactions, isOnline } from './src/services/offlineService';

// Splash: 900 delay + 8 huruf × 80ms (640ms) + 2000 setelah typing = ~3600ms
const SPLASH_DURATION = 3800;

function AppContent() {
  const { isDark, colors } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initImageCache();

    // Init network listener untuk offline mode
    const unsubNetwork = initNetworkListener();

    // Auto-sync pending transactions saat kembali online
    const handleAppState = async (state) => {
      if (state === 'active' && isOnline()) {
        const count = await pendingTransactions.count();
        if (count > 0) {
          // Trigger sync — dilakukan di background
          const { transactionsAPI } = require('./src/services/api');
          pendingTransactions.sync(transactionsAPI.create).then(result => {
            if (result.success > 0) {
              console.log(`[Sync] ${result.success} transaksi berhasil disync`);
            }
          });
        }
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);

    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION);

    return () => {
      clearTimeout(timer);
      appStateSub.remove();
      if (typeof unsubNetwork === 'function') unsubNetwork();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={isDark ? '#0A0A14' : '#FFFFFF'}
      />
      {splashDone ? (
        <AuthProvider>
          <CartProvider>
            <PrinterProvider>
              <RootNavigator />
            </PrinterProvider>
          </CartProvider>
        </AuthProvider>
      ) : (
        <SplashScreen />
      )}
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
