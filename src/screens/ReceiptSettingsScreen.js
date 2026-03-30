/**
 * src/screens/ReceiptSettingsScreen.js — v2.1
 * FIX:
 * - Auto-load data bisnis dari register (saat pertama kali)
 * - Tema terang konsisten
 * - Tidak ada garis hitam
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Switch, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { receiptSettingsAPI } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

const DEFAULT = {
  store_name:    '',
  store_address: '',
  store_phone:   '',
  store_email:   '',
  store_website: '',
  footer_text:   'Terima kasih atas kunjungan Anda!',
  show_tax:      false,
  show_discount: true,
  paper_width:   '58mm',
  font_size:     'normal',
  template:      'standard',
};

const FONT_MAP = {
  small:  { store: 12, info: 9,  item: 9,  divider: 8  },
  normal: { store: 14, info: 11, item: 11, divider: 10 },
  large:  { store: 16, info: 13, item: 13, divider: 11 },
};

export default function ReceiptSettingsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [form,      setForm]      = useState(DEFAULT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true); setLoadError(null);
    try {
      // 1. Coba load dari server
      const r = await receiptSettingsAPI.get();
      if (r.success && r.data && r.data.store_name) {
        setForm({
          ...DEFAULT, ...r.data,
          show_tax:      r.data.show_tax      === 1 || r.data.show_tax      === true  || r.data.show_tax      === '1',
          show_discount: r.data.show_discount !== 0 && r.data.show_discount !== false && r.data.show_discount !== '0',
        });
      } else {
        // 2. Fallback: coba data bisnis dari register (disimpan lokal)
        const localStr = await AsyncStorage.getItem('receipt_settings_local');
        if (localStr) {
          const local = JSON.parse(localStr);
          setForm({ ...DEFAULT, ...local });
          setLoadError('Menggunakan data bisnis dari pendaftaran. Simpan untuk sinkronisasi ke server.');
        } else {
          setLoadError('Endpoint belum tersedia. Isi data toko Anda di bawah ini.');
        }
      }
    } catch (e) {
      setLoadError('Gagal memuat: ' + e.message);
      // Coba load lokal
      try {
        const localStr = await AsyncStorage.getItem('receipt_settings_local');
        if (localStr) setForm({ ...DEFAULT, ...JSON.parse(localStr) });
      } catch {}
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.store_name?.trim()) { Alert.alert('Error', 'Nama toko wajib diisi'); return; }
    setIsSaving(true);
    const payload = { ...form, show_tax: form.show_tax ? 1 : 0, show_discount: form.show_discount ? 1 : 0 };
    // Simpan lokal dulu
    await AsyncStorage.setItem('receipt_settings_local', JSON.stringify(payload));
    // Kirim ke server
    const r = await receiptSettingsAPI.save(payload);
    Alert.alert(r.success ? 'Sukses' : 'Info', r.success ? 'Pengaturan struk berhasil disimpan!' : 'Disimpan lokal. Server belum tersedia.');
    if (r.success) setLoadError(null);
    setIsSaving(false);
  };

  const fs         = FONT_MAP[form.font_size] || FONT_MAP.normal;
  const isMinimal  = form.template === 'minimal';
  const isDetail   = form.template === 'detail';
  const monoFont   = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  if (isLoading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['top']}>
      <View style={[st.header, { backgroundColor: colors.bgMedium }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.textWhite }]}>Pengaturan Struk</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={st.loadWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[st.loadTxt, { color: colors.textMuted }]}>Memuat...</Text>
      </View>
    </SafeAreaView>
  );

  const textFields = [
    { key: 'store_name',    label: 'Nama Toko *',      multiline: false },
    { key: 'store_address', label: 'Alamat Toko',       multiline: true  },
    { key: 'store_phone',   label: 'No. Telepon',       multiline: false },
    { key: 'store_email',   label: 'Email Toko',        multiline: false },
    { key: 'store_website', label: 'Website / Kredit',  multiline: false },
    { key: 'footer_text',   label: 'Teks Footer Struk', multiline: true  },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['top']}>
      <View style={[st.header, { backgroundColor: colors.bgMedium }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.textWhite }]}>Pengaturan Struk</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={st.saveTouch}>
          {isSaving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[st.saveText, { color: colors.primary }]}>Simpan</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1, padding: SPACING.lg, backgroundColor: colors.bgDark }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loadError && (
            <View style={[st.warnBox, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
              <Text style={[st.warnText, { color: colors.warning }]}>{loadError}</Text>
            </View>
          )}

          {/* Info Toko */}
          <Text style={[st.sec, { color: colors.textDark }]}>INFO TOKO</Text>
          {textFields.map(f => (
            <View key={f.key} style={st.fg}>
              <Text style={[st.fl, { color: colors.textLight }]}>{f.label}</Text>
              <TextInput
                style={[st.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }, f.multiline && st.fim]}
                value={form[f.key] || ''}
                onChangeText={v => set(f.key, v)}
                multiline={f.multiline}
                numberOfLines={f.multiline ? 3 : 1}
                textAlignVertical={f.multiline ? 'top' : 'auto'}
                placeholderTextColor={colors.textDark}
                placeholder={`Contoh: ${f.label.replace(' *','')}`}
                blurOnSubmit={!f.multiline}
                keyboardType={f.key === 'store_email' ? 'email-address' : f.key === 'store_phone' ? 'phone-pad' : 'default'}
              />
            </View>
          ))}

          {/* Opsi */}
          <Text style={[st.sec, { color: colors.textDark }]}>OPSI STRUK</Text>
          <View style={[st.switchCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[st.switchRow, { borderBottomColor: colors.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[st.swLabel, { color: colors.textWhite }]}>Tampilkan Diskon</Text>
                <Text style={[st.swSub,   { color: colors.textDark }]}>Tampilkan baris diskon di struk</Text>
              </View>
              <Switch value={!!form.show_discount} onValueChange={v => set('show_discount', v)}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
            <View style={st.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[st.swLabel, { color: colors.textWhite }]}>Tampilkan Pajak</Text>
                <Text style={[st.swSub,   { color: colors.textDark }]}>Tampilkan pajak (jika ada)</Text>
              </View>
              <Switch value={!!form.show_tax} onValueChange={v => set('show_tax', v)}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
          </View>

          {/* Lebar Kertas */}
          <Text style={[st.sec, { color: colors.textDark }]}>LEBAR KERTAS</Text>
          <View style={st.optRow}>
            {['58mm','80mm'].map(w => (
              <TouchableOpacity
                key={w}
                style={[st.optBtn, { backgroundColor: form.paper_width === w ? colors.primary : colors.bgCard, borderColor: form.paper_width === w ? colors.primary : colors.border }]}
                onPress={() => set('paper_width', w)}
              >
                <Ionicons name="print-outline" size={16} color={form.paper_width === w ? '#fff' : colors.textMuted} />
                <Text style={[st.optTxt, { color: form.paper_width === w ? '#fff' : colors.textMuted }]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Template */}
          <Text style={[st.sec, { color: colors.textDark }]}>TEMPLATE</Text>
          <View style={st.optRow}>
            {[{v:'standard',l:'Standard',i:'document-text-outline'},{v:'detail',l:'Detail',i:'list-outline'},{v:'minimal',l:'Minimal',i:'remove-outline'}].map(t => (
              <TouchableOpacity
                key={t.v}
                style={[st.optBtn, { backgroundColor: form.template === t.v ? colors.primary : colors.bgCard, borderColor: form.template === t.v ? colors.primary : colors.border }]}
                onPress={() => set('template', t.v)}
              >
                <Ionicons name={t.i} size={16} color={form.template === t.v ? '#fff' : colors.textMuted} />
                <Text style={[st.optTxt, { color: form.template === t.v ? '#fff' : colors.textMuted }]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Font Size */}
          <Text style={[st.sec, { color: colors.textDark }]}>UKURAN FONT</Text>
          <View style={st.optRow}>
            {['small','normal','large'].map(f => (
              <TouchableOpacity
                key={f}
                style={[st.optBtn, { backgroundColor: form.font_size === f ? colors.primary : colors.bgCard, borderColor: form.font_size === f ? colors.primary : colors.border }]}
                onPress={() => set('font_size', f)}
              >
                <Text style={[st.optTxt, { color: form.font_size === f ? '#fff' : colors.textMuted, fontSize: f==='small'?10:f==='large'?16:13 }]}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview */}
          <Text style={[st.sec, { color: colors.textDark }]}>PREVIEW</Text>
          <View style={[st.previewBox, { backgroundColor: '#fff', borderColor: colors.border }]}>
            {!isMinimal && <Text style={{ fontSize: fs.store, fontWeight: 'bold', textAlign: 'center', color: '#000', marginBottom: 3 }}>{form.store_name || 'Nama Toko'}</Text>}
            {isMinimal   && <Text style={{ fontSize: fs.store-2, fontWeight: 'bold', color: '#000' }}>{form.store_name || 'Nama Toko'}</Text>}
            {!isMinimal && form.store_address ? <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#555' }}>{form.store_address}</Text> : null}
            {!isMinimal && form.store_phone   ? <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#555' }}>Telp: {form.store_phone}</Text> : null}
            <Text style={{ fontSize: fs.divider, color: '#999', textAlign: 'center', marginVertical: 5 }}>
              {isMinimal ? '---' : '- - - - - - - - - - - - - -'}
            </Text>
            {isDetail ? (
              <>
                <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Produk A</Text>
                <Text style={{ fontSize: fs.item, color: '#555', fontFamily: monoFont }}>  1 x Rp 5.000         Rp 5.000</Text>
              </>
            ) : (
              <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Produk A  1x Rp5.000  Rp5.000</Text>
            )}
            <Text style={{ fontSize: fs.divider, color: '#999', textAlign: 'center', marginVertical: 5 }}>
              {isMinimal ? '---' : '- - - - - - - - - - - - - -'}
            </Text>
            {form.show_discount && <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Diskon            -Rp 1.000</Text>}
            <Text style={{ fontSize: fs.item+1, fontWeight: 'bold', color: '#000', fontFamily: monoFont }}>TOTAL              Rp 10.000</Text>
            {!isMinimal && (
              <>
                <Text style={{ fontSize: fs.divider, color: '#999', textAlign: 'center', marginVertical: 5 }}>- - - - - - - - - - - - - -</Text>
                <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#555', fontStyle: 'italic', marginTop: 3 }}>
                  {form.footer_text || 'Terima kasih!'}
                </Text>
              </>
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  headerTitle:{ fontSize: FONTS.lg, fontWeight: '700' },
  saveTouch: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 60, alignItems: 'flex-end' },
  saveText:  { fontSize: FONTS.md, fontWeight: '700' },
  loadWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt:   { fontSize: FONTS.md },
  warnBox:   { flexDirection:'row', gap: SPACING.sm, alignItems:'flex-start', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1 },
  warnText:  { flex: 1, fontSize: FONTS.xs, lineHeight: 18 },
  sec:       { fontSize: FONTS.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  fg:        { marginBottom: SPACING.md },
  fl:        { fontSize: FONTS.sm, marginBottom: 6, fontWeight: '500' },
  fi:        { borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md, borderWidth: 1, height: 50 },
  fim:       { height: 80, textAlignVertical: 'top' },
  switchCard:{ borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  switchRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding: SPACING.lg, borderBottomWidth: 1 },
  swLabel:   { fontSize: FONTS.md, fontWeight: '500' },
  swSub:     { fontSize: FONTS.xs, marginTop: 2 },
  optRow:    { flexDirection:'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  optBtn:    { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1 },
  optTxt:    { fontSize: FONTS.sm, fontWeight: '500' },
  previewBox:{ borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1 },
});
