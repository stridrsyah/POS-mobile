/**
 * src/screens/ServerSettingsScreen.js
 * Halaman untuk ganti URL server/ngrok tanpa rebuild APK
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

export const SERVER_URL_KEY = 'server_base_url';
export const DEFAULT_URL    = 'https://maxie-sylphic-externally.ngrok-free.dev';
export const API_PATH       = '/pos-app/mobile_api.php';
export const UPLOADS_PATH   = '/pos-app/public/uploads/products/';

export default function ServerSettingsScreen({ navigation }) {
  const [url,       setUrl]       = useState('');
  const [isSaving,  setIsSaving]  = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'

  useEffect(() => {
    AsyncStorage.getItem(SERVER_URL_KEY).then(saved => {
      setUrl(saved || DEFAULT_URL);
    });
  }, []);

  const handleSave = async () => {
    const trimmed = url.trim().replace(/\/$/, ''); // hapus trailing slash
    if (!trimmed) {
      Alert.alert('Error', 'URL tidak boleh kosong');
      return;
    }
    if (!trimmed.startsWith('http')) {
      Alert.alert('Error', 'URL harus diawali http:// atau https://');
      return;
    }
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
    setIsTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch(trimmed + API_PATH + '/health', {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      setTestResult(resp.status < 500 ? 'ok' : 'fail');
    } catch (e) {
      setTestResult('fail');
    }
    setIsTesting(false);
  };

  const handleReset = () => {
    setUrl(DEFAULT_URL);
    setTestResult(null);
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Pengaturan Server</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={st.body} keyboardShouldPersistTaps="handled">

        {/* Info */}
        <View style={st.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={st.infoText}>
            Ganti URL ngrok di sini setiap kali ngrok di-restart. Tidak perlu build ulang APK.
          </Text>
        </View>

        {/* Cara pakai */}
        <View style={st.card}>
          <Text style={st.cardTitle}>📋 Cara Pakai</Text>
          {[
            '1. Jalankan XAMPP (Apache + MySQL)',
            '2. Jalankan ngrok: ngrok http 80',
            '3. Copy URL dari ngrok (https://xxxx.ngrok-free.app)',
            '4. Paste di kolom di bawah → Simpan',
            '5. Restart app → login seperti biasa',
          ].map((s, i) => (
            <Text key={i} style={st.step}>{s}</Text>
          ))}
        </View>

        {/* Input URL */}
        <Text style={st.label}>URL Ngrok / Server</Text>
        <View style={st.inputWrap}>
          <Ionicons name="link-outline" size={18} color={COLORS.textDark} style={{ marginRight: 8 }} />
          <TextInput
            style={st.input}
            value={url}
            onChangeText={v => { setUrl(v); setTestResult(null); }}
            placeholder="https://xxxx.ngrok-free.app"
            placeholderTextColor={COLORS.textDark}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {url.length > 0 && (
            <TouchableOpacity onPress={() => { setUrl(''); setTestResult(null); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textDark} />
            </TouchableOpacity>
          )}
        </View>

        {/* URL Preview */}
        <View style={st.previewBox}>
          <Text style={st.previewLabel}>API URL:</Text>
          <Text style={st.previewValue} numberOfLines={2}>
            {(url || DEFAULT_URL).replace(/\/$/, '') + API_PATH}
          </Text>
        </View>

        {/* Test result */}
        {testResult === 'ok' && (
          <View style={[st.resultBox, { borderColor: COLORS.success + '40', backgroundColor: COLORS.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={[st.resultText, { color: COLORS.success }]}>Server dapat dijangkau! ✅</Text>
          </View>
        )}
        {testResult === 'fail' && (
          <View style={[st.resultBox, { borderColor: '#ef535040', backgroundColor: '#ef535015' }]}>
            <Ionicons name="close-circle" size={16} color="#ef5350" />
            <Text style={[st.resultText, { color: '#ef5350' }]}>Tidak bisa konek. Cek URL & pastikan ngrok + XAMPP aktif.</Text>
          </View>
        )}

        {/* Tombol */}
        <TouchableOpacity style={st.btnTest} onPress={handleTest} disabled={isTesting}>
          {isTesting
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="wifi-outline" size={18} color={COLORS.primary} />}
          <Text style={st.btnTestText}>{isTesting ? 'Menguji...' : 'Test Koneksi'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.btnSave} onPress={handleSave} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="save-outline" size={18} color="#fff" />}
          <Text style={st.btnSaveText}>{isSaving ? 'Menyimpan...' : 'Simpan URL'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.btnReset} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={16} color={COLORS.textDark} />
          <Text style={st.btnResetText}>Reset ke URL Default</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bgDark },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle:  { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  body:         { flex: 1, padding: SPACING.lg },
  infoBox:      { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.primary + '30' },
  infoText:     { flex: 1, fontSize: FONTS.sm, color: COLORS.textLight, lineHeight: 20 },
  card:         { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardTitle:    { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textWhite, marginBottom: SPACING.sm },
  step:         { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 22 },
  label:        { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium, marginBottom: 8 },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 52, marginBottom: SPACING.sm },
  input:        { flex: 1, color: COLORS.textWhite, fontSize: FONTS.sm },
  previewBox:   { backgroundColor: COLORS.bgMedium, borderRadius: RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  previewLabel: { fontSize: FONTS.xs, color: COLORS.textDark, marginBottom: 4 },
  previewValue: { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 18 },
  resultBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1 },
  resultText:   { flex: 1, fontSize: FONTS.sm },
  btnTest:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 13, marginBottom: SPACING.sm, backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  btnTestText:  { fontSize: FONTS.md, color: COLORS.primary, fontWeight: FONTS.bold },
  btnSave:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 14, marginBottom: SPACING.sm, backgroundColor: COLORS.primary },
  btnSaveText:  { fontSize: FONTS.md, color: '#fff', fontWeight: FONTS.bold },
  btnReset:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  btnResetText: { fontSize: FONTS.sm, color: COLORS.textDark },
});