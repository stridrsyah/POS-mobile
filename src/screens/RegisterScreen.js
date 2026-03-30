/**
 * src/screens/RegisterScreen.js — Daftar Akun Owner v2.1
 * - Tambah field: alamat bisnis & kota
 * - Data bisnis otomatis dipakai untuk pengaturan struk pertama kali
 * - Tema konsisten dark/light
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

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors, isDark } = useTheme();

  const [name,     setName]     = useState('');
  const [bizName,  setBizName]  = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [pass,     setPass]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const bizRef      = useRef();
  const bizAddrRef  = useRef();
  const bizPhoneRef = useRef();
  const emailRef    = useRef();
  const phoneRef    = useRef();
  const passRef     = useRef();
  const confirmRef  = useRef();

  const clearErr = (key) => setErrors((e) => ({ ...e, [key]: null }));

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
        // Auto-isi pengaturan struk dari data bisnis
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

  // ── Komponen field ───────────────────────────────────────
  const Field = ({
    label, value, onChangeText, errorKey,
    placeholder, keyboard = 'default',
    secure = false, showToggle = false, toggleState, onToggle,
    returnKeyType = 'next', onSubmitEditing, inputRef,
    autoCapitalize = 'none', multiline = false,
  }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textLight }]}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        { backgroundColor: colors.bgInput, borderColor: errors[errorKey] ? colors.danger + '99' : colors.border },
        multiline && { height: 80, alignItems: 'flex-start' },
      ]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.textWhite }, multiline && { textAlignVertical: 'top', paddingTop: 10 }]}
          value={value}
          onChangeText={(v) => { onChangeText(v); clearErr(errorKey); }}
          placeholder={placeholder}
          placeholderTextColor={colors.textDark}
          keyboardType={keyboard}
          secureTextEntry={secure && !toggleState}
          returnKeyType={multiline ? 'default' : returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          blurOnSubmit={false}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
            <Ionicons
              name={toggleState ? 'eye-off-outline' : 'eye-outline'}
              size={18} color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[errorKey] ? (
        <Text style={[styles.errMsg, { color: colors.danger }]}>{errors[errorKey]}</Text>
      ) : null}
    </View>
  );

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

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
              <Ionicons name="storefront" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textWhite }]}>Daftar Sebagai Owner</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Buat akun untuk mulai kelola bisnis Anda
            </Text>
          </View>

          {/* ── SEKSI 1: DATA PRIBADI ── */}
          <View style={[styles.sectionBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DATA PRIBADI</Text>
            </View>
            <Field
              label="Nama Lengkap *"
              value={name} onChangeText={setName} errorKey="name"
              placeholder="Contoh: Budi Santoso"
              autoCapitalize="words"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <Field
              label="Email *"
              value={email} onChangeText={setEmail} errorKey="email"
              placeholder="email@contoh.com"
              keyboard="email-address"
              inputRef={emailRef}
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            <Field
              label="Nomor HP *"
              value={phone} onChangeText={setPhone} errorKey="phone"
              placeholder="08xxxxxxxxxx"
              keyboard="phone-pad"
              inputRef={phoneRef}
              onSubmitEditing={() => passRef.current?.focus()}
            />
          </View>

          {/* ── SEKSI 2: DATA BISNIS ── */}
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
            <Field
              label="Nama Usaha / Bisnis *"
              value={bizName} onChangeText={setBizName} errorKey="bizName"
              placeholder="Contoh: Warung Makan Barokah"
              autoCapitalize="words"
              inputRef={bizRef}
              onSubmitEditing={() => bizAddrRef.current?.focus()}
            />
            <Field
              label="Alamat Bisnis"
              value={bizAddress} onChangeText={setBizAddress} errorKey="bizAddress"
              placeholder="Contoh: Jl. Merdeka No. 12, Jakarta"
              autoCapitalize="sentences"
              inputRef={bizAddrRef}
              multiline
              onSubmitEditing={() => bizPhoneRef.current?.focus()}
            />
            <Field
              label="Telepon Bisnis"
              value={bizPhone} onChangeText={setBizPhone} errorKey="bizPhone"
              placeholder="(Kosongkan jika sama dengan HP)"
              keyboard="phone-pad"
              inputRef={bizPhoneRef}
              onSubmitEditing={() => passRef.current?.focus()}
            />
          </View>

          {/* ── SEKSI 3: KEAMANAN ── */}
          <View style={[styles.sectionBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KEAMANAN AKUN</Text>
            </View>
            <Field
              label="Password *"
              value={pass} onChangeText={setPass} errorKey="pass"
              placeholder="Minimal 6 karakter"
              secure showToggle toggleState={showPass}
              onToggle={() => setShowPass((v) => !v)}
              inputRef={passRef}
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <Field
              label="Konfirmasi Password *"
              value={confirm} onChangeText={setConfirm} errorKey="confirm"
              placeholder="Ulangi password"
              secure showToggle toggleState={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              inputRef={confirmRef}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
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
  gradient: { flex: 1 },
  flex:     { flex: 1 },
  scroll:   {
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

  header:   { alignItems: 'center', marginBottom: SPACING.xl, gap: SPACING.sm },
  logoBox:  {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 4,
  },
  title:    { fontSize: FONTS.xl, fontWeight: FONTS.bold },
  subtitle: { fontSize: FONTS.sm, textAlign: 'center' },

  // Section boxes
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

  // Form
  inputGroup:   { marginBottom: SPACING.sm },
  label:        { fontSize: FONTS.sm, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md, height: 50,
  },
  input:      { flex: 1, fontSize: FONTS.md },
  eyeBtn:     { padding: 4 },
  errMsg:     { fontSize: FONTS.xs, marginTop: 4, marginLeft: 2 },

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
  submitText:        { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: '#fff' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { fontSize: FONTS.sm },
  footerLink: { fontSize: FONTS.sm, fontWeight: FONTS.bold },
});
