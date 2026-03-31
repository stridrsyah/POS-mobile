/**
 * src/components/UIComponents.js v2.2
 * FIXED: Full light mode support di semua komponen
 * Semua komponen menggunakan useTheme() secara konsisten
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

// ── Chip ─────────────────────────────────────────────────
export const Chip = ({ label, color, small, onPress, icon }) => {
  const { colors } = useTheme();
  const c         = color || colors.primary;
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component
      onPress={onPress}
      style={[chipS.wrap, {
        backgroundColor: c + '20',
        borderColor: c + '50',
        paddingHorizontal: small ? 8 : 12,
        paddingVertical: small ? 3 : 6,
      }]}
    >
      {icon && <Ionicons name={icon} size={small ? 10 : 12} color={c} style={{ marginRight: 3 }} />}
      <Text style={[chipS.text, { color: c, fontSize: small ? 10 : 12 }]}>{label}</Text>
    </Component>
  );
};
const chipS = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.full, borderWidth: 1 },
  text: { fontWeight: '600', letterSpacing: 0.2 },
});

// ── Screen Header ─────────────────────────────────────────
export const ScreenHeader = ({ title, subtitle, onBack, rightComponent, transparent }) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={[
      headerS.wrap,
      {
        backgroundColor: transparent ? 'transparent' : colors.bgMedium,
        borderBottomColor: transparent ? 'transparent' : colors.border,
        borderBottomWidth: transparent ? 0 : isDark ? 1 : 0.5,
      }
    ]}>
      {onBack ? (
        <TouchableOpacity
          style={[headerS.backBtn, { backgroundColor: colors.bgSurface }]}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textWhite} />
        </TouchableOpacity>
      ) : <View style={{ width: 42 }} />}
      <View style={headerS.center}>
        <Text style={[headerS.title, { color: colors.textWhite }]}>{title}</Text>
        {subtitle ? <Text style={[headerS.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      <View style={{ width: 42, alignItems: 'flex-end' }}>
        {rightComponent || null}
      </View>
    </View>
  );
};
const headerS = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 14 },
  backBtn: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  center:  { flex: 1, alignItems: 'center' },
  title:   { fontSize: FONTS.lg, fontWeight: '700', letterSpacing: -0.3 },
  subtitle:{ fontSize: FONTS.xs, marginTop: 1 },
});

// ── Card ──────────────────────────────────────────────────
export const Card = ({ children, style, onPress, noPadding }) => {
  const { colors, isDark } = useTheme();
  const Component  = onPress ? TouchableOpacity : View;
  return (
    <Component
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        cardS.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0.5,
          padding: noPadding ? 0 : SPACING.lg,
        },
        isDark ? SHADOW.sm : {
          elevation: 2,
          shadowColor: '#00000015',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 1,
          shadowRadius: 4,
        },
        style,
      ]}
    >
      {children}
    </Component>
  );
};
const cardS = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, overflow: 'hidden' },
});

// ── Button ────────────────────────────────────────────────
export const Button = ({
  label, onPress, variant = 'primary', size = 'md',
  icon, iconRight, loading, disabled, style, labelStyle, fullWidth = true,
}) => {
  const { colors, isDark } = useTheme();
  const sizeMap = {
    sm: { height: 38, fontSize: FONTS.xs, px: SPACING.md, radius: RADIUS.md },
    md: { height: 50, fontSize: FONTS.md, px: SPACING.xl, radius: RADIUS.md },
    lg: { height: 58, fontSize: FONTS.lg, px: SPACING.xxl, radius: RADIUS.lg },
  };
  const s = sizeMap[size];
  const variantStyle = {
    primary:   { bg: disabled ? colors.textDark : colors.primary,  text: '#FFFFFF', border: 'transparent' },
    secondary: { bg: colors.primary + '18', text: colors.primary,  border: colors.primary + '44' },
    danger:    { bg: disabled ? colors.textDark : colors.danger,   text: '#FFFFFF', border: 'transparent' },
    ghost:     { bg: 'transparent', text: colors.textMuted, border: colors.border },
    success:   { bg: disabled ? colors.textDark : colors.success,  text: '#FFFFFF', border: 'transparent' },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        btnS.wrap,
        {
          height: s.height, backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border, borderRadius: s.radius,
          paddingHorizontal: s.px, alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: (disabled && variant !== 'primary' && variant !== 'danger') ? 0.5 : 1,
        },
        variant !== 'primary' && variant !== 'danger' && variant !== 'success' && btnS.bordered,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={variantStyle.text} /> : (
        <>
          {icon && !iconRight && <Ionicons name={icon} size={s.fontSize + 1} color={variantStyle.text} style={{ marginRight: 7 }} />}
          <Text style={[btnS.label, { color: variantStyle.text, fontSize: s.fontSize }, labelStyle]}>{label}</Text>
          {icon && iconRight && <Ionicons name={icon} size={s.fontSize + 1} color={variantStyle.text} style={{ marginLeft: 7 }} />}
        </>
      )}
    </TouchableOpacity>
  );
};
const btnS = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  bordered:{ borderWidth: 1 },
  label:   { fontWeight: '700', letterSpacing: 0.1 },
});

// ── Stat Card ─────────────────────────────────────────────
export const StatCard = ({ label, value, icon, color, sub, trend, wide, onPress }) => {
  const { colors, isDark } = useTheme();
  const c          = color || colors.primary;
  const Component  = onPress ? TouchableOpacity : View;
  return (
    <Component
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        statS.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0.5,
          borderLeftColor: c,
          flex: wide ? 2 : 1,
        },
        isDark ? SHADOW.sm : {
          elevation: 2,
          shadowColor: '#00000012',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 1,
          shadowRadius: 4,
        },
      ]}
    >
      <View style={[statS.iconWrap, { backgroundColor: c + '18' }]}>
        <Ionicons name={icon} size={18} color={c} />
      </View>
      <Text style={[statS.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[statS.value, { color: colors.textWhite }]}>{value}</Text>
      {sub ? <Text style={[statS.sub, { color: colors.textDark }]}>{sub}</Text> : null}
      {trend !== undefined && (
        <View style={statS.trendRow}>
          <Ionicons name={trend >= 0 ? 'trending-up' : 'trending-down'} size={12} color={trend >= 0 ? colors.success : colors.danger} />
          <Text style={[statS.trendText, { color: trend >= 0 ? colors.success : colors.danger }]}>
            {Math.abs(trend).toFixed(1)}%
          </Text>
        </View>
      )}
    </Component>
  );
};
const statS = StyleSheet.create({
  card:     { borderRadius: RADIUS.lg, borderWidth: 1, borderLeftWidth: 4, padding: SPACING.md, gap: 4 },
  iconWrap: { width: 34, height: 34, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  label:    { fontSize: FONTS.xs, fontWeight: '500' },
  value:    { fontSize: FONTS.lg, fontWeight: '800', letterSpacing: -0.5 },
  sub:      { fontSize: 10 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  trendText:{ fontSize: 10, fontWeight: '600' },
});

// ── Empty State ───────────────────────────────────────────
export const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => {
  const { colors } = useTheme();
  return (
    <View style={emptyS.wrap}>
      <View style={[emptyS.iconWrap, { backgroundColor: colors.bgSurface }]}>
        <Ionicons name={icon} size={36} color={colors.textDark} />
      </View>
      <Text style={[emptyS.title, { color: colors.textMuted }]}>{title}</Text>
      {subtitle ? <Text style={[emptyS.subtitle, { color: colors.textDark }]}>{subtitle}</Text> : null}
      {onAction && (
        <TouchableOpacity style={[emptyS.btn, { backgroundColor: colors.primary }]} onPress={onAction}>
          <Text style={emptyS.btnText}>{actionLabel || 'Tambah Baru'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
const emptyS = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: 12, paddingTop: 60 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:    { fontSize: FONTS.lg, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: FONTS.sm, textAlign: 'center', lineHeight: 20 },
  btn:      { borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: FONTS.sm },
});

// ── Offline Banner ────────────────────────────────────────
export const OfflineBanner = ({ pendingCount }) => {
  const { colors } = useTheme();
  return (
    <View style={[obS.wrap, {
      backgroundColor: colors.warning + '18',
      borderColor: colors.warning + '44',
    }]}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
      <Text style={[obS.text, { color: colors.warning }]}>
        Mode Offline{pendingCount > 0 ? ` • ${pendingCount} transaksi menunggu sync` : ''}
      </Text>
    </View>
  );
};
const obS = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1 },
  text: { fontSize: 12, fontWeight: '600' },
});

// ── Section Title ─────────────────────────────────────────
export const SectionTitle = ({ title, action, actionLabel }) => {
  const { colors } = useTheme();
  return (
    <View style={stS.wrap}>
      <Text style={[stS.title, { color: colors.textLight }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action}>
          <Text style={[stS.action, { color: colors.primary }]}>{actionLabel || 'Lihat Semua'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
const stS = StyleSheet.create({
  wrap:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  title:  { fontSize: FONTS.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  action: { fontSize: FONTS.xs, fontWeight: '600' },
});

// ── Divider ───────────────────────────────────────────────
export const Divider = ({ my = SPACING.md }) => {
  const { colors } = useTheme();
  return <View style={{ height: 0.5, backgroundColor: colors.divider, marginVertical: my }} />;
};

// ── Skeleton ──────────────────────────────────────────────
export const Skeleton = ({ width, height, borderRadius, style }) => {
  const { colors } = useTheme();
  const anim       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.shimmer1, colors.shimmer2] });

  return (
    <Animated.View
      style={[{ width, height: height || 16, borderRadius: borderRadius || RADIUS.sm, backgroundColor: bg }, style]}
    />
  );
};

// ── Progress Bar ──────────────────────────────────────────
export const ProgressBar = ({ value, max, color, height = 6 }) => {
  const { colors } = useTheme();
  const c   = color || colors.primary;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={[pbS.track, { backgroundColor: colors.border, height }]}>
      <View style={[pbS.fill, { backgroundColor: c, width: `${pct}%` }]} />
    </View>
  );
};
const pbS = StyleSheet.create({
  track: { borderRadius: RADIUS.full, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: RADIUS.full },
});

// ── Avatar ────────────────────────────────────────────────
export const Avatar = ({ name, size = 46, color }) => {
  const { colors } = useTheme();
  const c          = color || colors.primary;
  const letter     = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={[avS.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: c + '22' }]}>
      <Text style={[avS.text, { color: c, fontSize: size * 0.38 }]}>{letter}</Text>
    </View>
  );
};
const avS = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '800' },
});

// ── Badge ─────────────────────────────────────────────────
export const Badge = ({ label, color, size = 'sm' }) => {
  const { colors } = useTheme();
  const c = color || colors.primary;
  const fontSize = size === 'sm' ? 9 : 11;
  return (
    <View style={[bdgS.wrap, { backgroundColor: c + '20', borderColor: c + '44' }]}>
      <Text style={[bdgS.text, { color: c, fontSize }]}>{label}</Text>
    </View>
  );
};
const bdgS = StyleSheet.create({
  wrap: { borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  text: { fontWeight: '700', letterSpacing: 0.2 },
});

// ── Input Field ───────────────────────────────────────────
export const InputField = ({ label, error, children, required }) => {
  const { colors } = useTheme();
  return (
    <View style={ifS.group}>
      {label ? (
        <Text style={[ifS.label, { color: colors.textLight }]}>
          {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? (
        <View style={ifS.errRow}>
          <Ionicons name="warning-outline" size={11} color={colors.danger} />
          <Text style={[ifS.errText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};
const ifS = StyleSheet.create({
  group: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sm, fontWeight: '600', marginBottom: 6 },
  errRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errText:{ fontSize: FONTS.xs },
});
