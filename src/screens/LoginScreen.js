/**
 * src/screens/LoginScreen.js — Halaman Login
 * ============================================================
 * Fitur:
 * - Input username/email + password
 * - Validasi form sebelum submit
 * - Tampilkan/sembunyikan password
 * - Pesan error yang jelas
 * - Loading state saat proses login
 * - Demo mode jika server tidak tersedia
 * ============================================================
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

export default function LoginScreen() {
  // State form
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  const { login } = useAuth();

  /**
   * Validasi input sebelum submit ke API
   * @returns {boolean} true jika valid
   */
  const validate = () => {
    if (!username.trim()) {
      setError('Username atau email tidak boleh kosong');
      return false;
    }
    if (!password.trim()) {
      setError('Password tidak boleh kosong');
      return false;
    }
    if (password.length < 4) {
      setError('Password minimal 4 karakter');
      return false;
    }
    return true;
  };

  /**
   * Handle tombol Login
   */
  const handleLogin = async () => {
    setError(''); // Reset error sebelumnya

    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await login(username.trim(), password);

      if (!result.success) {
        // Tampilkan pesan error dari API
        setError(result.error || 'Login gagal. Periksa username dan password.');
      }
      // Jika success, AuthContext akan update isLoggedIn → RootNavigator redirect ke AppNavigator
    } catch (err) {
      setError('Terjadi kesalahan. Pastikan server XAMPP aktif dan IP sudah benar.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Info cara setting IP untuk pengguna baru
   */
  const showIPHelp = () => {
    Alert.alert(
      '⚙️ Setting Server',
      'Untuk menghubungkan ke server XAMPP:\n\n' +
      '1. Buka file: src/services/api.js\n' +
      '2. Ganti SERVER_IP dengan IP laptop kamu\n\n' +
      '📍 Cara cek IP laptop:\n' +
      '• Windows: Buka CMD → ketik "ipconfig"\n' +
      '• Mac/Linux: ketik "ifconfig"\n' +
      '• Lihat "IPv4 Address" pada WiFi\n\n' +
      '⚠️ HP dan laptop harus terhubung ke WiFi yang SAMA',
      [{ text: 'Mengerti', style: 'default' }]
    );
  };

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
          {/* Header / Logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="storefront" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.appName}>POS Mobile</Text>
            <Text style={styles.subtitle}>Masuk ke akun Anda</Text>
          </View>

          {/* Form Login */}
          <View style={styles.form}>
            {/* Pesan Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input Username */}
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

            {/* Input Password */}
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
                {/* Toggle tampilkan password */}
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textMuted}
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

            {/* Tombol Help IP */}
            <TouchableOpacity style={styles.helpButton} onPress={showIPHelp}>
              <Ionicons name="help-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.helpText}>Tidak bisa terhubung ke server?</Text>
            </TouchableOpacity>
          </View>

          {/* Info koneksi */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.info} />
            <Text style={styles.infoText}>
              Pastikan server XAMPP aktif dan HP terhubung ke WiFi yang sama dengan laptop server
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingTop: 60,
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.primary + '44',
  },
  appName: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textWhite,
  },
  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.textMuted,
  },

  // ── Form ──
  form: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.danger + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '55',
  },
  errorText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.danger,
    lineHeight: 18,
  },

  inputGroup: { gap: 6 },
  label: {
    fontSize: FONTS.sm,
    color: COLORS.textLight,
    fontWeight: FONTS.medium,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: FONTS.md,
  },
  eyeButton: { padding: 4 },

  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    marginTop: SPACING.sm,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: '#fff',
  },

  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  helpText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },

  // ── Info Box ──
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.info + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.info + '30',
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
});