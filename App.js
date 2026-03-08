/**
 * App.js — Komponen Root Aplikasi POS Mobile
 * ============================================================
 * Struktur Provider (dari luar ke dalam):
 *   GestureHandlerRootView  → wajib untuk @react-navigation/stack
 *     AuthProvider          → menyimpan state login user
 *       CartProvider        → menyimpan state keranjang belanja
 *         RootNavigator     → routing semua halaman
 *
 * Splash screen ditampilkan 2.5 detik lalu masuk ke app
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

// GestureHandlerRootView WAJIB berada di paling luar
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/context/AuthContext';
import { CartProvider }  from './src/context/CartContext';
import RootNavigator     from './src/navigation/RootNavigator';
import SplashScreen      from './src/screens/SplashScreen';

export default function App() {
  // State splash: tampilkan splash screen selama 2.5 detik
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(timer); // bersihkan timer saat unmount
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* StatusBar dengan warna sesuai tema dark */}
      <StatusBar style="light" backgroundColor="#1a1a2e" />

      {splashDone ? (
        // Setelah splash, tampilkan aplikasi utama dengan semua provider
        <AuthProvider>
          <CartProvider>
            <RootNavigator />
          </CartProvider>
        </AuthProvider>
      ) : (
        // Splash screen sementara app memuat
        <SplashScreen />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});