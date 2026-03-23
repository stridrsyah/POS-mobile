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
      AsyncStorage.getItem(SERVER_URL_KEY).then(saved => {
        setServerUrl(saved || DEFAULT_URL);
      });
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const validate = () => {
    if (!username.trim()) { setError('Username atau email tidak boleh kosong'); return false; }
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
        setError(result.error || 'Login gagal. Periksa username dan password.');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Pastikan server XAMPP aktif dan ngrok berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  const shortUrl = serverUrl.replace('https://', '').replace('http://', '');

  return (
    <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header / Logo — TIDAK DIUBAH */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="storefront" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.appName}>POS Mobile</Text>
            <Text style={styles.subtitle}>Masuk ke akun Anda</Text>
          </View>

          {/* Form Login — TIDAK DIUBAH */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username / Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan username atau email"
                  placeholderTextColor={COLORS.textDark}
                  value={username}
                  onChangeText={(text) => { setUsername(text); setError(''); }}
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
                  onChangeText={(text) => { setPassword(text); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

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
          </View>

          {/* ── BARU: Tombol ganti URL server — bisa diakses SEBELUM login ── */}
          <TouchableOpacity
            style={styles.serverBtn}
            onPress={() => navigation.navigate('ServerSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.serverBtnLeft}>
              <Ionicons name="server-outline" size={16} color={COLORS.textDark} />
              <Text style={styles.serverBtnLabel}>Server:</Text>
              <Text style={styles.serverBtnUrl} numberOfLines={1}>{shortUrl}</Text>
            </View>
            <View style={styles.serverBtnRight}>
              <Text style={styles.serverBtnEdit}>Ganti</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center',
    padding: SPACING.xl, paddingTop: 60,
  },

  // Header
  header: { alignItems: 'center', marginBottom: SPACING.xxl, gap: SPACING.sm },
  logoContainer: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, borderWidth: 2, borderColor: COLORS.primary + '44',
  },
  appName:  { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  subtitle: { fontSize: FONTS.md, color: COLORS.textMuted },

  // Form
  form:     { gap: SPACING.md, marginBottom: SPACING.xl },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.danger + '22', borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.danger + '55',
  },
  errorText: { flex: 1, fontSize: FONTS.sm, color: COLORS.danger, lineHeight: 18 },
  inputGroup:  { gap: 6 },
  label:       { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 52,
  },
  inputIcon: { marginRight: SPACING.sm },
  input:     { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },
  eyeButton: { padding: 4 },
  loginButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, height: 52, marginTop: SPACING.sm,
    elevation: 4, shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: '#fff' },

  // Server button
  serverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard ?? '#1e1e2e',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  serverBtnLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  serverBtnLabel: { fontSize: FONTS.xs, color: COLORS.textDark },
  serverBtnUrl:   { fontSize: FONTS.xs, color: COLORS.textMuted, flex: 1 },
  serverBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  serverBtnEdit:  { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
});