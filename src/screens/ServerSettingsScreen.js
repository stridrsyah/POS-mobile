/**
 * src/screens/ServerSettingsScreen.js — FIXED: Full Light Mode
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

export const SERVER_URL_KEY = 'server_base_url';
export const DEFAULT_URL    = 'https://maxie-sylphic-externally.ngrok-free.dev';
export const API_PATH       = '/pos-app/mobile_api.php';
export const UPLOADS_PATH   = '/pos-app/public/uploads/products/';

export default function ServerSettingsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [url,        setUrl]        = useState('');
  const [isSaving,   setIsSaving]   = useState(false);
  const [isTesting,  setIsTesting]  = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(SERVER_URL_KEY).then(saved => setUrl(saved || DEFAULT_URL));
  }, []);

  const handleSave = async () => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed) { Alert.alert('Error', 'URL tidak boleh kosong'); return; }
    if (!trimmed.startsWith('http')) { Alert.alert('Error', 'URL harus diawali http:// atau https://'); return; }
    setIsSaving(true);
    await AsyncStorage.setItem(SERVER_URL_KEY, trimmed);
    setIsSaving(false);
    Alert.alert('✅ Tersimpan', 'URL server berhasil disimpan.\nRestart app untuk efek penuh.', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleTest = async () => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed) return;
    setIsTesting(true); setTestResult(null);
    try {
      const resp = await fetch(trimmed + API_PATH + '/health', { headers: { 'ngrok-skip-browser-warning': 'true' } });
      setTestResult(resp.status < 500 ? 'ok' : 'fail');
    } catch { setTestResult('fail'); }
    setIsTesting(false);
  };

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={[st.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border, borderBottomWidth: isDark ? 1 : 0.5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.textWhite }]}>Pengaturan Server</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={st.body} keyboardShouldPersistTaps="handled">
        <View style={[st.infoBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[st.infoText, { color: colors.textLight }]}>Ganti URL ngrok di sini setiap kali ngrok di-restart. Tidak perlu build ulang APK.</Text>
        </View>

        <View style={[st.card, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0.5 }]}>
          <Text style={[st.cardTitle, { color: colors.textWhite }]}>📋 Cara Pakai</Text>
          {['1. Jalankan XAMPP (Apache + MySQL)', '2. Jalankan ngrok: ngrok http 80', '3. Copy URL dari ngrok (https://xxxx.ngrok-free.app)', '4. Paste di kolom di bawah → Simpan', '5. Restart app → login seperti biasa'].map((step, i) => (
            <Text key={i} style={[st.step, { color: colors.textMuted }]}>{step}</Text>
          ))}
        </View>

        <Text style={[st.label, { color: colors.textLight }]}>URL Ngrok / Server</Text>
        <View style={[st.inputWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="link-outline" size={18} color={colors.textDark} style={{ marginRight: 8 }} />
          <TextInput
            style={[st.input, { color: colors.textWhite }]}
            value={url}
            onChangeText={v => { setUrl(v); setTestResult(null); }}
            placeholder="https://xxxx.ngrok-free.app"
            placeholderTextColor={colors.textDark}
            autoCapitalize="none" autoCorrect={false} keyboardType="url"
          />
          {url.length > 0 && (
            <TouchableOpacity onPress={() => { setUrl(''); setTestResult(null); }}>
              <Ionicons name="close-circle" size={18} color={colors.textDark} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[st.previewBox, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
          <Text style={[st.previewLabel, { color: colors.textDark }]}>API URL:</Text>
          <Text style={[st.previewValue, { color: colors.textMuted }]} numberOfLines={2}>{(url || DEFAULT_URL).replace(/\/$/, '') + API_PATH}</Text>
        </View>

        {testResult === 'ok' && (
          <View style={[st.resultBox, { borderColor: colors.success + '40', backgroundColor: colors.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[st.resultText, { color: colors.success }]}>Server dapat dijangkau! ✅</Text>
          </View>
        )}
        {testResult === 'fail' && (
          <View style={[st.resultBox, { borderColor: colors.danger + '40', backgroundColor: colors.danger + '15' }]}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={[st.resultText, { color: colors.danger }]}>Tidak bisa konek. Cek URL & pastikan ngrok + XAMPP aktif.</Text>
          </View>
        )}

        <TouchableOpacity style={[st.btnTest, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]} onPress={handleTest} disabled={isTesting}>
          {isTesting ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="wifi-outline" size={18} color={colors.primary} />}
          <Text style={[st.btnTestText, { color: colors.primary }]}>{isTesting ? 'Menguji...' : 'Test Koneksi'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[st.btnSave, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
          <Text style={st.btnSaveText}>{isSaving ? 'Menyimpan...' : 'Simpan URL'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.btnReset} onPress={() => { setUrl(DEFAULT_URL); setTestResult(null); }}>
          <Ionicons name="refresh-outline" size={16} color={colors.textDark} />
          <Text style={[st.btnResetText, { color: colors.textDark }]}>Reset ke URL Default</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  body: { flex: 1, padding: SPACING.lg },
  infoBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1 },
  infoText: { flex: 1, fontSize: FONTS.sm, lineHeight: 20 },
  card: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1 },
  cardTitle: { fontSize: FONTS.sm, fontWeight: '700', marginBottom: SPACING.sm },
  step: { fontSize: FONTS.xs, lineHeight: 22 },
  label: { fontSize: FONTS.sm, fontWeight: '600', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 52, marginBottom: SPACING.sm },
  input: { flex: 1, fontSize: FONTS.sm },
  previewBox: { borderRadius: RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1 },
  previewLabel: { fontSize: FONTS.xs, marginBottom: 4 },
  previewValue: { fontSize: FONTS.xs, lineHeight: 18 },
  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1 },
  resultText: { flex: 1, fontSize: FONTS.sm },
  btnTest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 13, marginBottom: SPACING.sm, borderWidth: 1 },
  btnTestText: { fontSize: FONTS.md, fontWeight: '700' },
  btnSave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 14, marginBottom: SPACING.sm },
  btnSaveText: { fontSize: FONTS.md, color: '#fff', fontWeight: '700' },
  btnReset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  btnResetText: { fontSize: FONTS.sm },
});
