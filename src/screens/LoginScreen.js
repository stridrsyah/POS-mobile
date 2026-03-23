/**
 * src/screens/LoginScreen.js — Halaman Login
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL_KEY, DEFAULT_URL } from './ServerSettingsScreen';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');
  const [serverUrl,    setServerUrl]    = useState('');

  const { login } = useAuth();

  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(SERVER_URL_KEY).then((saved) => {
        setServerUrl(saved || DEFAULT_URL);
      });
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const validate = () => {
    if (!username.trim()) { setError('Email atau username tidak boleh kosong'); return false; }
    if (!password.trim()) { setError('Password tidak boleh kosong'); return false; }
    if (password.length < 4) { setError('Password minimal 4 karakter'); return false; }
    return true;
  };

  const handleLogin = async () => {
    setError('');
    if (!validate()) return;
    setIsLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (!result.success) {
        setError(result.error || 'Login gagal. Periksa email dan password Anda.');
      }
    } catch {
      setError('Tidak dapat terhubung ke server. Pastikan koneksi internet aktif.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tampilkan host saja tanpa path
  const shortUrl = (serverUrl || DEFAULT_URL)
    .replace(/^https?:\/\//, '')
    .split('/')[0];

  return (
    <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo & Judul ── */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="storefront" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.appName}>KasirPOS</Text>
            <Text style={styles.subtitle}>Masuk ke akun Anda</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email atau Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan email atau username"
                  placeholderTextColor={COLORS.textDark}
                  value={username}
                  onChangeText={(t) => { setUsername(t); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password"
                  placeholderTextColor={COLORS.textDark}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18} color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tombol Login */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>Masuk</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Tombol Daftar Sebagai Owner */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
              <View style={styles.registerBtnContent}>
                <Text style={styles.registerBtnTitle}>Daftar Sebagai Owner</Text>
                <Text style={styles.registerBtnSub}>Buat bisnis baru & kelola karyawan</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Info Server ── */}
          <TouchableOpacity
            style={styles.serverBtn}
            onPress={() => navigation.navigate('ServerSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.serverLeft}>
              <Ionicons name="server-outline" size={13} color={COLORS.textDark} />
              <Text style={styles.serverLabel}>Server:</Text>
              <Text style={styles.serverUrl} numberOfLines={1}>{shortUrl}</Text>
            </View>
            <View style={styles.serverRight}>
              <Text style={styles.serverEdit}>Ganti</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  flex:         { flex: 1 },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center',
    padding: SPACING.xl, paddingTop: 60, paddingBottom: 32,
  },

  header:        { alignItems: 'center', marginBottom: SPACING.xxl, gap: SPACING.sm },
  logoContainer: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, borderWidth: 2, borderColor: COLORS.primary + '44',
  },
  appName:  { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  subtitle: { fontSize: FONTS.md, color: COLORS.textMuted },

  form:         { gap: SPACING.md, marginBottom: SPACING.xl },
  errorBox:     {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.danger + '18', borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.danger + '44',
  },
  errorText:    { flex: 1, fontSize: FONTS.sm, color: COLORS.danger, lineHeight: 18 },
  inputGroup:   { gap: 6 },
  label:        { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 52,
  },
  inputIcon: { marginRight: SPACING.sm },
  input:     { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },
  eyeBtn:    { padding: 4 },

  loginButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, height: 52, marginTop: SPACING.sm,
    elevation: 4, shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText:     { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: '#fff' },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONTS.xs, color: COLORS.textDark },

  registerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary + '12',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '3A',
  },
  registerBtnContent: { flex: 1 },
  registerBtnTitle:   { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  registerBtnSub:     { fontSize: FONTS.xs, color: COLORS.textDark, marginTop: 2 },

  serverBtn:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  serverLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  serverLabel: { fontSize: FONTS.xs, color: COLORS.textDark },
  serverUrl:   { fontSize: FONTS.xs, color: COLORS.textMuted, flex: 1 },
  serverRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  serverEdit:  { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
});