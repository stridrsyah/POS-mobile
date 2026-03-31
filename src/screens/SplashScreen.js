/**
 * src/screens/SplashScreen.js — KasirPOS v2.2
 * FIX: Ikon diganti menjadi storefront (toko berwarna ungu)
 * Konsisten dengan LoginScreen & RegisterScreen
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// ── Brand Colors ─────────────────────────────────────────────
const PURPLE       = '#6C63FF';
const PURPLE_DEEP  = '#4C46C0';
const PURPLE_SOFT  = '#9D97FF';
const PURPLE_GLOW  = 'rgba(108,99,255,0.18)';
const BG_TOP       = '#0D0C1D';
const BG_MID       = '#110F24';
const BG_BOT       = '#14122B';

export default function SplashScreen() {
  // ── Animated values ──────────────────────────────────────
  const bgOpacity    = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.65)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const ringScale1   = useRef(new Animated.Value(0.5)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2   = useRef(new Animated.Value(0.4)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textSlide    = useRef(new Animated.Value(18)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const barWidth     = useRef(new Animated.Value(0)).current;
  const footerOpacity= useRef(new Animated.Value(0)).current;
  const dotAnim      = useRef(new Animated.Value(0)).current;

  // ── Typing effect ─────────────────────────────────────────
  const [typed, setTyped]     = useState('');
  const BRAND = 'AprilTech';

  useEffect(() => {
    // 1. Background fade in
    Animated.timing(bgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // 2. Ring pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale1,   { toValue: 1.6, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(ringOpacity1, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale1,   { toValue: 0.5, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity1, { toValue: 0.35, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale2,   { toValue: 1.8, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(ringOpacity2, { toValue: 0, duration: 2200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale2,   { toValue: 0.4, duration: 0, useNativeDriver: true }),
            Animated.timing(ringOpacity2, { toValue: 0.2, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, 600);

    // 3. Logo springs in
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale,  { toValue: 1, friction: 5.5, tension: 70, useNativeDriver: true }),
        Animated.timing(logoOpacity,{ toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 200);

    // 4. App name
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity,{ toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textSlide,  { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 550);

    // 5. Tagline
    setTimeout(() => {
      Animated.timing(tagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, 850);

    // 6. Progress bar
    setTimeout(() => {
      Animated.timing(barWidth, {
        toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: false,
      }).start();
    }, 900);

    // 7. Footer
    setTimeout(() => {
      Animated.timing(footerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 1000);

    // 8. Dot pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // 9. Typing
    setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setTyped(BRAND.slice(0, i));
        if (i >= BRAND.length) clearInterval(iv);
      }, 75);
    }, 1000);
  }, []);

  const progressInterpolate = barWidth.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });
  const dotOpacity = dotAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.3, 1],
  });

  return (
    <View style={s.root}>
      {/* Background */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient colors={[BG_TOP, BG_MID, BG_BOT]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* ── Center content ── */}
      <View style={s.center}>

        {/* Ring pulse */}
        <View style={s.ringWrap}>
          <Animated.View style={[s.ring, { transform: [{ scale: ringScale1 }], opacity: ringOpacity1 }]} />
          <Animated.View style={[s.ring, s.ringLarge, { transform: [{ scale: ringScale2 }], opacity: ringOpacity2 }]} />

          {/* Logo — IKON STOREFRONT (TOKO UNGU) */}
          <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <View style={s.logoGlow} />
            {/* Gradient sama dengan login & register */}
            <LinearGradient
              colors={['#6C63FF', '#4C46C0']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.logoCard}
            >
              <View style={s.logoHighlight} />
              {/* STOREFRONT ICON — ikon toko */}
              <Ionicons name="storefront" size={46} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* App name */}
        <Animated.View style={[s.nameWrap, { opacity: textOpacity, transform: [{ translateY: textSlide }] }]}>
          <Text style={s.appName}>KasirPOS</Text>
          <View style={s.vBadge}>
            <Text style={s.vText}>v2.2</Text>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
          Sistem Kasir Digital Profesional
        </Animated.Text>

        {/* Feature pills */}
        <Animated.View style={[s.pillRow, { opacity: tagOpacity }]}>
          {['Offline Ready', 'Multi Kasir', 'Laporan Real-time'].map(label => (
            <View key={label} style={s.pill}>
              <Text style={s.pillText}>{label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* ── Bottom area ── */}
      <View style={s.bottom}>
        {/* Loading label */}
        <View style={s.loadRow}>
          <Animated.View style={[s.dot, { opacity: dotOpacity }]} />
          <Text style={s.loadText}>Memuat aplikasi</Text>
          <Animated.Text style={[s.loadDots, { opacity: dotOpacity }]}>...</Animated.Text>
        </View>

        {/* Progress bar */}
        <View style={s.barTrack}>
          <Animated.View style={[s.barFill, { width: progressInterpolate }]}>
            <LinearGradient
              colors={[PURPLE_SOFT, PURPLE, PURPLE_DEEP]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.barShimmer} />
          </Animated.View>
        </View>

        {/* Watermark — AprilTech */}
        <Animated.View style={[s.watermark, { opacity: footerOpacity }]}>
          <View style={s.wLine} />
          <View style={s.wContent}>
            <Text style={s.wBy}>Developed by</Text>
            <View style={s.wBrandRow}>
              <LinearGradient colors={[PURPLE, PURPLE_DEEP]} style={s.wIcon}>
                <Text style={s.wIconText}>A</Text>
              </LinearGradient>
              <Text style={s.wBrand}>{typed || ' '}</Text>
              {typed.length < BRAND.length && <View style={s.cursor} />}
            </View>
          </View>
          <View style={s.wLine} />
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: BG_TOP,
    alignItems: 'center', justifyContent: 'center',
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40,
  },
  ringWrap: {
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  ring: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 1.5, borderColor: PURPLE,
  },
  ringLarge: { width: 180, height: 180, borderRadius: 90 },
  logoWrap:  { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  logoGlow:  {
    position: 'absolute', width: 110, height: 110,
    borderRadius: 30, backgroundColor: PURPLE_GLOW, transform: [{ scale: 1.3 }],
  },
  logoCard: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55, shadowRadius: 22, elevation: 18, overflow: 'hidden',
  },
  logoHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 48,
    borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.10)',
  },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  appName:  { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 },
  vBadge:   {
    backgroundColor: 'rgba(108,99,255,0.25)', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.4)',
  },
  vText:    { fontSize: 10, color: PURPLE_SOFT, fontWeight: '700', letterSpacing: 0.3 },
  tagline:  { fontSize: 13, color: 'rgba(200,200,230,0.55)', fontWeight: '400', letterSpacing: 0.3, marginBottom: 20 },
  pillRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill:     {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(108,99,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.22)',
  },
  pillText: { fontSize: 10, color: PURPLE_SOFT, fontWeight: '600', letterSpacing: 0.2 },
  bottom:   { width: '100%', paddingHorizontal: 48, paddingBottom: 48, alignItems: 'center', gap: 14 },
  loadRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: PURPLE_SOFT },
  loadText: { fontSize: 11, color: 'rgba(160,160,200,0.5)', fontWeight: '500', letterSpacing: 0.5 },
  loadDots: { fontSize: 11, color: PURPLE_SOFT, fontWeight: '700' },
  barTrack: { width: '100%', height: 3, backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: 999, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 999, overflow: 'hidden' },
  barShimmer:{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 30, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 999 },
  watermark:{ marginTop: 4, alignItems: 'center', gap: 10, width: '100%' },
  wLine:    { width: '40%', height: 1, backgroundColor: 'rgba(108,99,255,0.18)' },
  wContent: { alignItems: 'center', gap: 5 },
  wBy:      { fontSize: 9, color: 'rgba(130,130,160,0.5)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: '500' },
  wBrandRow:{ flexDirection: 'row', alignItems: 'center', gap: 7 },
  wIcon:    { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  wIconText:{ fontSize: 10, fontWeight: '900', color: '#fff' },
  wBrand:   { fontSize: 15, fontWeight: '800', color: PURPLE_SOFT, letterSpacing: 0.8, minWidth: 70 },
  cursor:   { width: 2, height: 14, backgroundColor: PURPLE_SOFT, borderRadius: 1, marginLeft: 1 },
});
