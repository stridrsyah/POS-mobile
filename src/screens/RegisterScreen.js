/**
 * src/screens/RegisterScreen.js — Daftar Akun Owner
 * Desain konsisten dengan LoginScreen: LinearGradient dark, field sederhana
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [name,     setName]     = useState('');
  const [bizName,  setBizName]  = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [pass,     setPass]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  // Refs untuk navigasi fokus antar field
  const bizRef     = useRef();
  const emailRef   = useRef();
  const phoneRef   = useRef();
  const passRef    = useRef();
  const confirmRef = useRef();

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
        email:                 email.trim().toLowerCase(),
        phone:                 phone.trim(),
        password:              pass,
        password_confirmation: confirm,
      });
      if (!result.success) {
        Alert.alert('Gagal Mendaftar', result.error || 'Terjadi kesalahan, coba lagi.');
      }
      // Jika berhasil, AuthContext set user → RootNavigator otomatis redirect
    } catch {
      Alert.alert('Error', 'Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  // ── Komponen field form ───────────────────────────────────
  const Field = ({
    label, value, onChangeText, errorKey,
    placeholder, keyboard = 'default',
    secure = false, showToggle = false, toggleState, onToggle,
    returnKeyType = 'next', onSubmitEditing, inputRef,
    autoCapitalize = 'none',
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, errors[errorKey] && styles.inputError]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={(v) => { onChangeText(v); clearErr(errorKey); }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDark}
          keyboardType={keyboard}
          secureTextEntry={secure && !toggleState}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          blurOnSubmit={false}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
            <Ionicons
              name={toggleState ? 'eye-off-outline' : 'eye-outline'}
              size={18} color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[errorKey] ? (
        <Text style={styles.errMsg}>{errors[errorKey]}</Text>
      ) : null}
    </View>
  );

  return (
    <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={styles.gradient}>
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
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Ionicons name="storefront" size={38} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Daftar Sebagai Owner</Text>
            <Text style={styles.subtitle}>
              Buat akun untuk mulai kelola bisnis Anda
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field
              label="Nama Lengkap *"
              value={name} onChangeText={setName} errorKey="name"
              placeholder="Contoh: Budi Santoso"
              autoCapitalize="words"
              onSubmitEditing={() => bizRef.current?.focus()}
            />
            <Field
              label="Nama Usaha / Bisnis *"
              value={bizName} onChangeText={setBizName} errorKey="bizName"
              placeholder="Contoh: Warung Makan Barokah"
              autoCapitalize="words"
              inputRef={bizRef}
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

            {/* Info role */}
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.primary} />
              <Text style={styles.infoText}>
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
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Masuk di sini</Text>
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  header:   { alignItems: 'center', marginBottom: SPACING.xxl, gap: SPACING.sm },
  logoBox:  {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary + '44',
    marginBottom: 4,
  },
  title:    { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center' },

  form:         { gap: SPACING.xs },
  inputGroup:   { marginBottom: SPACING.sm },
  label:        { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium, marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 50,
  },
  inputError: { borderColor: COLORS.danger + '99' },
  input:      { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },
  eyeBtn:     { padding: 4 },
  errMsg:     { fontSize: FONTS.xs, color: COLORS.danger, marginTop: 4, marginLeft: 2 },

  infoBox: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '12',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '2A',
    marginTop: SPACING.sm,
  },
  infoText: { flex: 1, fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 18 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, height: 52, marginTop: SPACING.md,
    elevation: 4, shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText:        { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: '#fff' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { fontSize: FONTS.sm, color: COLORS.textMuted },
  footerLink: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
});