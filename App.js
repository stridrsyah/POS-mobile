/**
 * App.js — Komponen Root Aplikasi POS Mobile
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider }    from './src/context/AuthContext';
import { CartProvider }    from './src/context/CartContext';
import { PrinterProvider } from './src/context/PrinterContext';
import RootNavigator       from './src/navigation/RootNavigator';
import SplashScreen        from './src/screens/SplashScreen';
import { initImageCache }  from './src/services/api';

// 900 (delay) + 28huruf×55ms (1540) + 2000 (setelah typing) = 4440ms
const SPLASH_DURATION = 4440;

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initImageCache(); // preload URL server untuk foto produk
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor="#1a1a2e" />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1a2e' },
});