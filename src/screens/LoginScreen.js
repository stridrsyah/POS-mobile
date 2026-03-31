/**
 * src/screens/LoginScreen.js — v2.3
 * FIX: Ikon diganti menjadi storefront (toko berwarna ungu)
 * konsisten dengan SplashScreen & RegisterScreen
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SERVER_URL_KEY, DEFAULT_URL } from './ServerSettingsScreen';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();

  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');
  const [serverUrl,    setServerUrl]    = useState('');

  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    AsyncStorage.getItem(SERVER_URL_KEY).then(saved => setServerUrl(saved || DEFAULT_URL));
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      AsyncStorage.getItem(SERVER_URL_KEY).then(saved => setServerUrl(saved || DEFAULT_URL));
    });
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
      if (!result.success) setError(result.error || 'Login gagal. Periksa email dan password Anda.');
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const shortUrl = (serverUrl || DEFAULT_URL).replace(/^https?:\/\//, '').split('/')[0];

  const gradColors = isDark
    ? ['#080812', '#0F0F1E', '#14142A']
    : ['#F3F3FA', '#EEEEF8', '#E8E8F5'];

  const s = getStyles(colors, isDark);

  return (
    <LinearGradient colors={gradColors} style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top bar: Theme toggle ── */}
          <View style={s.topRow}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[s.themeBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={isDark ? colors.accentGold || '#FFB547' : colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* ── Logo — IKON STOREFRONT (TOKO UNGU) ── */}
          <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Gradient sama persis dengan splash screen & register */}
            <LinearGradient colors={['#6C63FF', '#8B85FF']} style={s.logoContainer}>
              <Ionicons name="storefront" size={42} color="#fff" />
            </LinearGradient>
            <Text style={[s.appName, { color: colors.textWhite }]}>KasirPOS</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>Masuk ke akun Anda</Text>
            <Text style={[s.brandBy, { color: colors.primary + '90' }]}>by AprilTech</Text>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View style={[s.form, { opacity: fadeAnim }]}>
            {error ? (
              <View style={[s.errorBox, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
                <Ionicons name="warning-outline" size={16} color={colors.danger} />
                <Text style={[s.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            {/* Username */}
            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textLight }]}>Email atau Username</Text>
              <View style={[s.inputWrapper, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: colors.textWhite }]}
                  placeholder="Masukkan email atau username"
                  placeholderTextColor={colors.textDark}
                  value={username}
                  onChangeText={t => { setUsername(t); setError(''); }}
                  autoCapitalize="none" autoCorrect={false}
                  keyboardType="email-address" returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textLight }]}>Password</Text>
              <View style={[s.inputWrapper, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: colors.textWhite }]}
                  placeholder="Masukkan password"
                  placeholderTextColor={colors.textDark}
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none" returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[s.loginButton, isLoading && { opacity: 0.7 }]}
              onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6C63FF', '#8B85FF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.loginGradient}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (<><Ionicons name="log-in-outline" size={20} color="#fff" /><Text style={s.loginButtonText}>Masuk</Text></>)
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[s.dividerText, { color: colors.textDark }]}>atau</Text>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Register button */}
            <TouchableOpacity
              style={[s.registerBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
              onPress={() => navigation.navigate('Register')} activeOpacity={0.8}
            >
              <View style={[s.registerIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="storefront-outline" size={17} color={colors.primary} />
              </View>
              <View style={s.registerBtnContent}>
                <Text style={[s.registerBtnTitle, { color: colors.primary }]}>Daftar Sebagai Owner</Text>
                <Text style={[s.registerBtnSub, { color: colors.textDark }]}>Buat bisnis baru & kelola karyawan</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.primary} />
            </TouchableOpacity>
          </Animated.View>

          {/* Server info */}
          <TouchableOpacity
            style={[s.serverBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ServerSettings')} activeOpacity={0.7}
          >
            <View style={s.serverLeft}>
              <View style={[s.serverDot, { backgroundColor: colors.success }]} />
              <Ionicons name="server-outline" size={13} color={colors.textDark} />
              <Text style={[s.serverLabel, { color: colors.textDark }]}>Server:</Text>
              <Text style={[s.serverUrl, { color: colors.textMuted }]} numberOfLines={1}>{shortUrl}</Text>
            </View>
            <View style={s.serverRight}>
              <Text style={[s.serverEdit, { color: colors.primary }]}>Ganti</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container:        { flex: 1 },
  flex:             { flex: 1 },
  scrollContent:    { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl, paddingTop: 50, paddingBottom: 32 },
  topRow:           { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: SPACING.lg },
  themeBtn:         { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Header dengan ikon storefront
  header:           { alignItems: 'center', marginBottom: SPACING.xxl, gap: SPACING.sm },
  logoContainer:    { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  appName:          { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle:         { fontSize: FONTS.md },
  brandBy:          { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  form:             { gap: SPACING.md, marginBottom: SPACING.xl },
  errorBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1 },
  errorText:        { flex: 1, fontSize: FONTS.sm, lineHeight: 18 },
  inputGroup:       { gap: 7 },
  label:            { fontSize: FONTS.sm, fontWeight: '600', marginLeft: 2 },
  inputWrapper:     { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 54 },
  inputIcon:        { marginRight: SPACING.sm },
  input:            { flex: 1, fontSize: FONTS.md },
  eyeBtn:           { padding: 4 },
  loginButton:      { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.sm },
  loginGradient:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 54 },
  loginButtonText:  { fontSize: FONTS.lg, fontWeight: '800', color: '#fff' },
  dividerRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dividerLine:      { flex: 1, height: 1 },
  dividerText:      { fontSize: FONTS.xs },
  registerBtn:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1 },
  registerIcon:     { width: 38, height: 38, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  registerBtnContent: { flex: 1 },
  registerBtnTitle: { fontSize: FONTS.sm, fontWeight: '700' },
  registerBtnSub:   { fontSize: FONTS.xs, marginTop: 1 },
  serverBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1 },
  serverLeft:       { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  serverDot:        { width: 6, height: 6, borderRadius: 3 },
  serverLabel:      { fontSize: FONTS.xs },
  serverUrl:        { fontSize: FONTS.xs, flex: 1 },
  serverRight:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  serverEdit:       { fontSize: FONTS.xs, fontWeight: '700' },
});
