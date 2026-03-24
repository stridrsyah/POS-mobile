/**
 * src/screens/SplashScreen.js — Layar Pembuka AprilTech POS
 * Watermark: AprilTech dengan animasi profesional
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const BRAND_TEXT    = 'AprilTech';
const TAGLINE_TEXT  = 'Developed by';
const TYPING_DELAY  = 800;
const TYPING_SPEED  = 80;
const AFTER_TYPING  = 2000;
const TOTAL_TYPING  = BRAND_TEXT.length * TYPING_SPEED;

export default function SplashScreen() {
  const fadeMain   = useRef(new Animated.Value(0)).current;
  const scaleIcon  = useRef(new Animated.Value(0.6)).current;
  const fadeTitle  = useRef(new Animated.Value(0)).current;
  const slideTitle = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  const [brandText, setBrandText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    // Sequence animasi masuk
    Animated.sequence([
      // 1. Fade in
      Animated.parallel([
        Animated.timing(fadeMain, {
          toValue: 1, duration: 600, useNativeDriver: true,
        }),
        Animated.spring(scaleIcon, {
          toValue: 1, friction: 5, tension: 60, useNativeDriver: true,
        }),
      ]),
      // 2. Title slide up
      Animated.parallel([
        Animated.timing(fadeTitle, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
        Animated.timing(slideTitle, {
          toValue: 0, duration: 400,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: false }),
      ])
    ).start();

    // Progress bar
    Animated.sequence([
      Animated.timing(progressAnim, {
        toValue: 0.65, duration: TYPING_DELAY + 400, useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.9, duration: TOTAL_TYPING + 200, useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 1, duration: AFTER_TYPING, useNativeDriver: false,
      }),
    ]).start();

    // Typing effect untuk "AprilTech"
    const typingTimer = setTimeout(() => {
      setShowCursor(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setBrandText(BRAND_TEXT.slice(0, i));
        if (i >= BRAND_TEXT.length) {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), AFTER_TYPING);
        }
      }, TYPING_SPEED);
    }, TYPING_DELAY);

    return () => {
      clearInterval(cursorInterval);
      clearTimeout(typingTimer);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <LinearGradient
      colors={['#080812', '#0F0F1E', '#14142A']}
      style={styles.container}
    >
      {/* Background orbs */}
      <Animated.View style={[styles.orb1, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.orb2, { opacity: glowOpacity }]} />

      {/* Main content */}
      <Animated.View style={[styles.content, { opacity: fadeMain }]}>

        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleIcon }] }]}>
          <LinearGradient
            colors={['#6C63FF', '#8B85FF']}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="point-of-sale" size={48} color="#fff" />
          </LinearGradient>
          <Animated.View style={[styles.iconGlow, { opacity: glowOpacity }]} />
        </Animated.View>

        {/* App title */}
        <Animated.View style={[
          styles.titleWrap,
          { opacity: fadeTitle, transform: [{ translateY: slideTitle }] }
        ]}>
          <Text style={styles.appName}>KasirPOS</Text>
          <Text style={styles.appTagline}>Sistem Kasir Digital Profesional</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v2.0</Text>
          </View>
        </Animated.View>

        {/* Watermark / Developer branding */}
        <View style={styles.watermarkSection}>
          <View style={styles.watermarkLine} />
          <View style={styles.watermarkContent}>
            <Text style={styles.developedBy}>{TAGLINE_TEXT}</Text>
            <View style={styles.brandRow}>
              <Text style={styles.brandLetters}>
                {brandText}
                {showCursor && (
                  <Text style={[styles.cursor, { opacity: cursorVisible ? 1 : 0 }]}>|</Text>
                )}
              </Text>
            </View>
          </View>
          <View style={styles.watermarkLine} />
        </View>
      </Animated.View>

      {/* Footer: loading */}
      <Animated.View style={[styles.footer, { opacity: fadeMain }]}>
        <Text style={styles.loadingLabel}>Memuat aplikasi...</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <LinearGradient
              colors={['#6C63FF', '#8B85FF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Background orbs
  orb1: {
    position: 'absolute', top: height * 0.1, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#6C63FF', opacity: 0.08,
  },
  orb2: {
    position: 'absolute', bottom: height * 0.15, right: -100,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: '#8B85FF', opacity: 0.06,
  },

  content: { alignItems: 'center', gap: 20, paddingHorizontal: 40 },

  // Icon
  iconWrap: { position: 'relative', marginBottom: 8 },
  iconGradient: {
    width: 110, height: 110, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute', top: -15, left: -15, right: -15, bottom: -15,
    borderRadius: 50, backgroundColor: '#6C63FF',
    zIndex: -1,
  },

  // Title
  titleWrap: { alignItems: 'center', gap: 6 },
  appName: {
    fontSize: 36, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -1,
  },
  appTagline: { fontSize: 14, color: '#6B6B8A', fontWeight: '500' },
  versionBadge: {
    backgroundColor: '#6C63FF22', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 3,
    borderWidth: 1, borderColor: '#6C63FF44', marginTop: 4,
  },
  versionText: { color: '#8B85FF', fontSize: 11, fontWeight: '700' },

  // Watermark
  watermarkSection: { alignItems: 'center', gap: 10, marginTop: 16, width: '100%' },
  watermarkLine: { height: 1, width: '60%', backgroundColor: '#6C63FF33' },
  watermarkContent: { alignItems: 'center', gap: 4 },
  developedBy: {
    fontSize: 11, color: '#4A4A6A', fontWeight: '500',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center',
    minHeight: 32,
  },
  brandLetters: {
    fontSize: 22, fontWeight: '900', color: '#6C63FF',
    letterSpacing: 1,
  },
  cursor: {
    fontSize: 22, color: '#8B85FF', fontWeight: '300',
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 60,
    alignItems: 'center', gap: 10, width: '100%', paddingHorizontal: 60,
  },
  loadingLabel: { fontSize: 12, color: '#4A4A6A', fontWeight: '500', letterSpacing: 0.5 },
  progressTrack: {
    width: '100%', height: 3, backgroundColor: '#1A1A2E',
    borderRadius: 10, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 10, overflow: 'hidden' },
});
