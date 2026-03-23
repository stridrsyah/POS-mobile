/**
 * src/screens/SplashScreen.js — Layar Pembuka Aplikasi
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../utils/theme';

const { width } = Dimensions.get('window');

const FULL_TEXT    = 'Developed by : strindrasyah';
const TYPING_DELAY = 900;   // mulai ketik setelah 900ms
const TYPING_SPEED = 55;    // ms per huruf
const TOTAL_TYPING = FULL_TEXT.length * TYPING_SPEED;
const AFTER_TYPING = 2000;  // 2 detik diam setelah typing selesai

export default function SplashScreen() {
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [typedText,  setTypedText]  = useState('');
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    // ── 1. Fade + scale ──
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 800, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
      }),
    ]).start();

    // ── 2. Loading bar ──
    // Fase 1: 0 → 70% cepat (saat splash muncul)
    // Fase 2: 70 → 95% lambat (saat typing berlangsung)
    // Fase 3: 95 → 100% saat 1 detik terakhir setelah typing selesai
    Animated.sequence([
      Animated.timing(progressAnim, {
        toValue: 0.7,
        duration: TYPING_DELAY + 200,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.95,
        duration: TOTAL_TYPING,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: AFTER_TYPING,
        useNativeDriver: false,
      }),
    ]).start();

    // ── 3. Efek ketik ──
    setTimeout(() => {
      setShowCursor(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setTypedText(FULL_TEXT.slice(0, i));
        if (i >= FULL_TEXT.length) {
          clearInterval(interval);
          // Cursor tetap tampil 1 detik lalu hilang
          setTimeout(() => setShowCursor(false), AFTER_TYPING);
        }
      }, TYPING_SPEED);
    }, TYPING_DELAY);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={['#0F0F1A', '#1A1A2E', '#252550']}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="storefront" size={64} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>POS Mobile</Text>
        <Text style={styles.tagline}>Sistem Kasir Digital</Text>
        <Text style={styles.version}>v1.0.0</Text>
        <Text style={styles.watermark}>
          {typedText}{showCursor ? '|' : ''}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.loadingText}>Memuat aplikasi...</Text>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingProgress, { width: progressWidth }]} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:         { alignItems: 'center', gap: 12 },
  iconContainer:   { width: 120, height: 120, borderRadius: 30, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 2, borderColor: COLORS.primary + '44' },
  appName:         { fontSize: FONTS.xxxl, fontWeight: FONTS.black, color: COLORS.textWhite, letterSpacing: 1 },
  tagline:         { fontSize: FONTS.md, color: COLORS.textMuted, fontWeight: FONTS.medium },
  version:         { fontSize: FONTS.xs, color: COLORS.textDark, marginTop: 8 },
  watermark:       { fontSize: FONTS.md, color: COLORS.primary, letterSpacing: 0.8, marginTop: 4, opacity: 0.85, fontWeight: FONTS.medium },
  footer:          { position: 'absolute', bottom: 60, alignItems: 'center', gap: 12 },
  loadingText:     { fontSize: FONTS.sm, color: COLORS.textDark },
  loadingBar:      { width: width * 0.4, height: 3, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  loadingProgress: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
});