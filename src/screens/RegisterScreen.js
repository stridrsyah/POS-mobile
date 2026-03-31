/**
 * src/screens/RegisterScreen.js — Daftar Akun Owner v2.2
 * FIX: Keyboard menutup — Field komponen dipindah ke LUAR RegisterScreen
 * FIX: Ikon diganti menjadi storefront (toko ungu) konsisten dengan halaman login
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

// ─── Field komponen di LUAR RegisterScreen ─────────────────
// PENTING: Jika didefinisikan di dalam, React membuat komponen baru
// setiap render → keyboard menutup. Harus di luar!
const FormField = ({
  label, value, onChangeText, placeholder,
  keyboard = 'default', secure = false,
  showToggle = false, toggleState, onToggle,
  multiline = false, autoCapitalize = 'none',
  colors, error,
}) => (
  <View style={ff.group}>
    <Text style={[ff.label, { color: colors.textLight }]}>{label}</Text>
    <View style={[
      ff.wrap,
      { backgroundColor: colors.bgInput, borderColor: error ? colors.danger + '99' : colors.border },
      multiline && { height: 80, alignItems: 'flex-start' },
    ]}>
      <TextInput
        style={[ff.input, { color: colors.textWhite }, multiline && { textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDark}
        keyboardType={keyboard}
        secureTextEntry={secure && !toggleState}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        blurOnSubmit={false}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={ff.eye}>
          <Ionicons name={toggleState ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={[ff.err, { color: colors.danger }]}>{error}</Text> : null}
  </View>
);

const ff = StyleSheet.create({
  group: { marginBottom: SPACING.sm },
  label: { fontSize: FONTS.sm, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
  wrap:  { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 50 },
  input: { flex: 1, fontSize: FONTS.md },
  eye:   { padding: 4 },
  err:   { fontSize: FONTS.xs, marginTop: 4, marginLeft: 2 },
});
// ──────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors, isDark } = useTheme();

  const [name,       setName]       = useState('');
  const [bizName,    setBizName]    = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizPhone,   setBizPhone]   = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [pass,       setPass]       = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState({});

  const clearErr = (key) => setErrors(e => ({ ...e, [key]: null }));

  const validate = () => {
    const e = {};
    if (!name.trim())    e.name    = 'Nama lengkap wajib diisi';
    if (!bizName.trim()) e.bizName = 'Nama usaha wajib diisi';
    if (!email.trim())   e.email   = 'Email wajib diisi';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Format email tidak valid';
    if (!phone.trim())   e.phone   = 'Nomor HP wajib diisi';
    if (!pass)           e.pass    = 'Password wajib diisi';
    else if (pass.length < 6) e.pass = 'Password minimal 6 karakter';
    if (pass !== confirm) e.confirm = 'Password tidak cocok';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register({
        name:                  name.trim(),
        business_name:         bizName.trim(),
        business_address:      bizAddress.trim(),
        business_phone:        bizPhone.trim() || phone.trim(),
        email:                 email.trim().toLowerCase(),
        phone:                 phone.trim(),
        password:              pass,
        password_confirmation: confirm,
        receipt_store_name:    bizName.trim(),
        receipt_store_address: bizAddress.trim(),
        receipt_store_phone:   bizPhone.trim() || phone.trim(),
      });
      if (!result.success) {
        Alert.alert('Gagal Mendaftar', result.error || 'Terjadi kesalahan, coba lagi.');
      }
    } catch {
      Alert.alert('Error', 'Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const gradColors = isDark
    ? ['#080812', '#0F0F1E', '#14142A']
    : ['#F5F5FC', '#EEEEF8', '#E8E8F5'];

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tombol kembali */}
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Header — IKON STOREFRONT (TOKO) seperti login */}
          <View style={styles.header}>
            <LinearGradient colors={['#6C63FF', '#8B85FF']} style={styles.logoContainer}>
              <Ionicons name="storefront" size={42} color="#fff" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.textWhite }]}>Daftar Sebagai Owner</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Buat akun untuk mulai kelola bisnis Anda
            </Text>
          </View>

          {/* SEKSI 1: DATA PRIBADI */}
          <View style={[styles.sectionBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DATA PRIBADI</Text>
            </View>
            <FormField
              label="Nama Lengkap *" value={name}
              onChangeText={v => { setName(v); clearErr('name'); }}
              placeholder="Contoh: Budi Santoso"
              autoCapitalize="words" error={errors.name} colors={colors}
            />
            <FormField
              label="Email *" value={email}
              onChangeText={v => { setEmail(v); clearErr('email'); }}
              placeholder="email@contoh.com"
              keyboard="email-address" error={errors.email} colors={colors}
            />
            <FormField
              label="Nomor HP *" value={phone}
              onChangeText={v => { setPhone(v); clearErr('phone'); }}
              placeholder="08xxxxxxxxxx"
              keyboard="phone-pad" error={errors.phone} colors={colors}
            />
          </View>

          {/* SEKSI 2: DATA BISNIS */}
          <View style={[styles.sectionBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="storefront-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DATA BISNIS</Text>
            </View>
            <View style={[styles.infoBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.infoBannerText, { color: colors.textDark }]}>
                Data ini akan otomatis digunakan sebagai header template struk
              </Text>
            </View>
            <FormField
              label="Nama Usaha / Bisnis *" value={bizName}
              onChangeText={v => { setBizName(v); clearErr('bizName'); }}
              placeholder="Contoh: Warung Makan Barokah"
              autoCapitalize="words" error={errors.bizName} colors={colors}
            />
            <FormField
              label="Alamat Bisnis" value={bizAddress}
              onChangeText={v => { setBizAddress(v); clearErr('bizAddress'); }}
              placeholder="Contoh: Jl. Merdeka No. 12, Jakarta"
              autoCapitalize="sentences" multiline error={errors.bizAddress} colors={colors}
            />
            <FormField
              label="Telepon Bisnis" value={bizPhone}
              onChangeText={v => { setBizPhone(v); clearErr('bizPhone'); }}
              placeholder="(Kosongkan jika sama dengan HP)"
              keyboard="phone-pad" error={errors.bizPhone} colors={colors}
            />
          </View>

          {/* SEKSI 3: KEAMANAN */}
          <View style={[styles.sectionBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KEAMANAN AKUN</Text>
            </View>
            <FormField
              label="Password *" value={pass}
              onChangeText={v => { setPass(v); clearErr('pass'); }}
              placeholder="Minimal 6 karakter"
              secure showToggle toggleState={showPass}
              onToggle={() => setShowPass(v => !v)}
              error={errors.pass} colors={colors}
            />
            <FormField
              label="Konfirmasi Password *" value={confirm}
              onChangeText={v => { setConfirm(v); clearErr('confirm'); }}
              placeholder="Ulangi password"
              secure showToggle toggleState={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              error={errors.confirm} colors={colors}
            />
          </View>

          {/* Info role */}
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '2A' }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Akun owner memiliki akses penuh: kelola produk, laporan, dan karyawan.
              Karyawan bisa ditambahkan setelah masuk.
            </Text>
          </View>

          {/* Tombol daftar */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.submitText}>Daftar Sekarang</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Masuk di sini</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:    { flex: 1 },
  flex:        { flex: 1 },
  scroll:      {
    flexGrow: 1,
    padding: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 40,
  },

  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg, borderWidth: 1,
  },

  // Header — ikon storefront sama dengan login
  header:         { alignItems: 'center', marginBottom: SPACING.xl, gap: SPACING.sm },
  logoContainer:  {
    width: 90, height: 90, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title:    { fontSize: FONTS.xl, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: FONTS.sm, textAlign: 'center' },

  sectionBox: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    borderRadius: RADIUS.sm, padding: SPACING.sm,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  infoBannerText: { flex: 1, fontSize: FONTS.xs, lineHeight: 17 },

  infoBox: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  infoText: { flex: 1, fontSize: FONTS.xs, lineHeight: 18 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: '#6C63FF',
    borderRadius: RADIUS.md, height: 52, marginTop: SPACING.sm,
    elevation: 4, shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText:        { fontSize: FONTS.lg, fontWeight: '700', color: '#fff' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { fontSize: FONTS.sm },
  footerLink: { fontSize: FONTS.sm, fontWeight: '700' },
});
