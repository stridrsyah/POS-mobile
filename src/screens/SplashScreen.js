/**
 * src/screens/SplashScreen.js — Layar Pembuka Aplikasi
 * ============================================================
 * Ditampilkan selama 2.5 detik saat aplikasi pertama dibuka.
 * Menggunakan animasi fade dan scale sederhana.
 * ============================================================
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../utils/theme';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  // Nilai animasi
  const fadeAnim  = useRef(new Animated.Value(0)).current;  // opacity: 0 → 1
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // scale: 0.8 → 1

  useEffect(() => {
    // Jalankan animasi masuk saat komponen dimuat
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#0F0F1A', '#1A1A2E', '#252550']}
      style={styles.container}
    >
      {/* Logo dan nama aplikasi */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Ikon utama */}
        <View style={styles.iconContainer}>
          <Ionicons name="storefront" size={64} color={COLORS.primary} />
        </View>

        {/* Nama aplikasi */}
        <Text style={styles.appName}>POS Mobile</Text>
        <Text style={styles.tagline}>Sistem Kasir Digital</Text>

        {/* Versi */}
        <Text style={styles.version}>v1.0.0</Text>
      </Animated.View>

      {/* Loading indicator di bawah */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.loadingText}>Memuat aplikasi...</Text>
        <View style={styles.loadingBar}>
          <View style={styles.loadingProgress} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.primary + '44',
  },
  appName: {
    fontSize: FONTS.xxxl,
    fontWeight: FONTS.black,
    color: COLORS.textWhite,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FONTS.md,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },
  version: {
    fontSize: FONTS.xs,
    color: COLORS.textDark,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: FONTS.sm,
    color: COLORS.textDark,
  },
  loadingBar: {
    width: width * 0.4,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '70%',
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});