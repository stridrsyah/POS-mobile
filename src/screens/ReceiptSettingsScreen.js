import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Switch, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { receiptSettingsAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const DEFAULT = {
  store_name:    'Toko Saya',
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

// Font size map untuk preview
const FONT_MAP = { small: { store: 12, info: 9, item: 9, divider: 8 }, normal: { store: 14, info: 11, item: 11, divider: 10 }, large: { store: 16, info: 13, item: 13, divider: 11 } };

export default function ReceiptSettingsScreen({ navigation }) {
  const [form,      setForm]      = useState(DEFAULT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true); setLoadError(null);
    try {
      const r = await receiptSettingsAPI.get();
      if (r.success && r.data) {
        setForm({
          ...DEFAULT, ...r.data,
          show_tax:      r.data.show_tax === 1 || r.data.show_tax === true || r.data.show_tax === '1',
          show_discount: r.data.show_discount !== 0 && r.data.show_discount !== false && r.data.show_discount !== '0',
        });
      } else {
        setLoadError('Endpoint belum tersedia. Menggunakan pengaturan default.');
      }
    } catch (e) { setLoadError('Gagal memuat: ' + e.message); }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.store_name?.trim()) { Alert.alert('Error', 'Nama toko wajib diisi'); return; }
    setIsSaving(true);
    const r = await receiptSettingsAPI.save({ ...form, show_tax: form.show_tax ? 1 : 0, show_discount: form.show_discount ? 1 : 0 });
    Alert.alert(r.success ? 'Sukses' : 'Gagal', r.success ? 'Pengaturan struk berhasil disimpan!' : (r.error || 'Terjadi kesalahan.'));
    setIsSaving(false);
  };

  const fs = FONT_MAP[form.font_size] || FONT_MAP.normal;
  const isMinimal  = form.template === 'minimal';
  const isDetail   = form.template === 'detail';
  const monoFont   = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  if (isLoading) return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.textWhite} /></TouchableOpacity>
        <Text style={st.headerTitle}>Pengaturan Struk</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={st.loadWrap}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={st.loadTxt}>Memuat...</Text></View>
    </SafeAreaView>
  );

  const textFields = [
    { key: 'store_name',    label: 'Nama Toko *',       multiline: false },
    { key: 'store_address', label: 'Alamat Toko',        multiline: true  },
    { key: 'store_phone',   label: 'No. Telepon',        multiline: false },
    { key: 'store_email',   label: 'Email Toko',         multiline: false },
    { key: 'store_website', label: 'Website / Kredit',   multiline: false },
    { key: 'footer_text',   label: 'Teks Footer Struk',  multiline: true  },
  ];

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.textWhite} /></TouchableOpacity>
        <Text style={st.headerTitle}>Pengaturan Struk</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={st.saveTouch}>
          {isSaving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={st.saveText}>Simpan</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={st.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {loadError && (
            <View style={st.warnBox}>
              <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
              <Text style={st.warnText}>{loadError}</Text>
            </View>
          )}

          {/* Info Toko */}
          <Text style={st.sec}>INFO TOKO</Text>
          {textFields.map(f => (
            <View key={f.key} style={st.fg}>
              <Text style={st.fl}>{f.label}</Text>
              <TextInput
                style={[st.fi, f.multiline && st.fim]}
                value={form[f.key] || ''}
                onChangeText={v => set(f.key, v)}
                multiline={f.multiline}
                numberOfLines={f.multiline ? 3 : 1}
                textAlignVertical={f.multiline ? 'top' : 'auto'}
                placeholderTextColor={COLORS.textDark}
                placeholder={`Contoh: ${f.label.replace(' *','')}`}
                blurOnSubmit={!f.multiline}
                keyboardType={f.key === 'store_email' ? 'email-address' : f.key === 'store_phone' ? 'phone-pad' : 'default'}
              />
            </View>
          ))}

          {/* Opsi */}
          <Text style={st.sec}>OPSI STRUK</Text>
          <View style={st.switchCard}>
            <View style={st.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.swLabel}>Tampilkan Diskon</Text>
                <Text style={st.swSub}>Tampilkan baris diskon di struk</Text>
              </View>
              <Switch value={!!form.show_discount} onValueChange={v => set('show_discount', v)} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
            </View>
            <View style={[st.switchRow, st.swBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={st.swLabel}>Tampilkan Pajak</Text>
                <Text style={st.swSub}>Tampilkan pajak (jika ada)</Text>
              </View>
              <Switch value={!!form.show_tax} onValueChange={v => set('show_tax', v)} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
            </View>
          </View>

          {/* Lebar Kertas */}
          <Text style={st.sec}>LEBAR KERTAS</Text>
          <View style={st.optRow}>
            {['58mm','80mm'].map(w => (
              <TouchableOpacity key={w} style={[st.optBtn, form.paper_width===w && st.optBtnA]} onPress={() => set('paper_width', w)}>
                <Ionicons name="print-outline" size={16} color={form.paper_width===w ? '#fff' : COLORS.textMuted} />
                <Text style={[st.optTxt, form.paper_width===w && st.optTxtA]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Template */}
          <Text style={st.sec}>TEMPLATE STRUK</Text>
          <View style={st.optRow}>
            {[{v:'standard',l:'Standard',i:'document-text-outline'},{v:'detail',l:'Detail',i:'list-outline'},{v:'minimal',l:'Minimal',i:'remove-outline'}].map(t => (
              <TouchableOpacity key={t.v} style={[st.optBtn, form.template===t.v && st.optBtnA]} onPress={() => set('template', t.v)}>
                <Ionicons name={t.i} size={16} color={form.template===t.v ? '#fff' : COLORS.textMuted} />
                <Text style={[st.optTxt, form.template===t.v && st.optTxtA]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Font Size */}
          <Text style={st.sec}>UKURAN FONT</Text>
          <View style={st.optRow}>
            {['small','normal','large'].map(f => (
              <TouchableOpacity key={f} style={[st.optBtn, form.font_size===f && st.optBtnA]} onPress={() => set('font_size', f)}>
                <Text style={[st.optTxt, form.font_size===f && st.optTxtA, { fontSize: f==='small'?10:f==='large'?16:13 }]}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview REAL-TIME */}
          <Text style={st.sec}>PREVIEW</Text>
          <View style={st.previewBox}>
            {/* Header toko */}
            {!isMinimal && <Text style={{ fontSize: fs.store, fontWeight: 'bold', textAlign: 'center', color: '#000', marginBottom: 3 }}>{form.store_name || 'Nama Toko'}</Text>}
            {isMinimal   && <Text style={{ fontSize: fs.store-2, fontWeight: 'bold', color: '#000' }}>{form.store_name || 'Nama Toko'}</Text>}
            {!isMinimal && form.store_address ? <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#555' }}>{form.store_address}</Text> : null}
            {!isMinimal && form.store_phone   ? <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#555' }}>Telp: {form.store_phone}</Text> : null}
            {!isMinimal && form.store_email   ? <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#555' }}>{form.store_email}</Text> : null}
            {!isMinimal && form.store_website ? <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#888', fontStyle:'italic' }}>{form.store_website}</Text> : null}

            <Text style={{ fontSize: fs.divider, color: '#999', textAlign: 'center', marginVertical: 5 }}>
              {isMinimal ? '---' : '- - - - - - - - - - - - - -'}
            </Text>

            {/* Items */}
            {isDetail ? (
              <>
                <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Produk A</Text>
                <Text style={{ fontSize: fs.item, color: '#555', fontFamily: monoFont }}>  1 x Rp 5.000         Rp 5.000</Text>
                <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont, marginTop: 3 }}>Produk B</Text>
                <Text style={{ fontSize: fs.item, color: '#555', fontFamily: monoFont }}>  2 x Rp 3.000         Rp 6.000</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Produk A  1x Rp5.000  Rp5.000</Text>
                <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Produk B  2x Rp3.000  Rp6.000</Text>
              </>
            )}

            <Text style={{ fontSize: fs.divider, color: '#999', textAlign: 'center', marginVertical: 5 }}>
              {isMinimal ? '---' : '- - - - - - - - - - - - - -'}
            </Text>

            {form.show_discount && <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Diskon            -Rp 1.000</Text>}
            {form.show_tax      && <Text style={{ fontSize: fs.item, color: '#333', fontFamily: monoFont }}>Pajak (10%)        Rp 1.100</Text>}
            <Text style={{ fontSize: fs.item+1, fontWeight: 'bold', color: '#000', fontFamily: monoFont }}>TOTAL              Rp 10.000</Text>

            {!isMinimal && (
              <>
                <Text style={{ fontSize: fs.divider, color: '#999', textAlign: 'center', marginVertical: 5 }}>- - - - - - - - - - - - - -</Text>
                <Text style={{ fontSize: fs.info, textAlign: 'center', color: '#555', fontStyle: 'italic', marginTop: 3 }}>
                  {form.footer_text || 'Terima kasih!'}
                </Text>
                {form.store_website ? <Text style={{ fontSize: fs.info-1, textAlign:'center', color:'#999', marginTop:2 }}>{form.store_website}</Text> : null}
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
  container:   { flex: 1, backgroundColor: COLORS.bgDark },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:SPACING.xl, paddingVertical:SPACING.md, backgroundColor:COLORS.bgMedium, borderBottomWidth:1, borderBottomColor:COLORS.border },
  headerTitle: { fontSize:FONTS.lg, fontWeight:FONTS.bold, color:COLORS.textWhite },
  saveTouch:   { paddingHorizontal:4, paddingVertical:4, minWidth:60, alignItems:'flex-end' },
  saveText:    { color:COLORS.primary, fontSize:FONTS.md, fontWeight:FONTS.bold },
  loadWrap:    { flex:1, alignItems:'center', justifyContent:'center', gap:12 },
  loadTxt:     { color:COLORS.textMuted, fontSize:FONTS.md },
  body:        { flex:1, padding:SPACING.lg },
  warnBox:     { flexDirection:'row', gap:SPACING.sm, alignItems:'flex-start', backgroundColor:COLORS.warning+'20', borderRadius:RADIUS.md, padding:SPACING.md, marginBottom:SPACING.lg, borderWidth:1, borderColor:COLORS.warning+'40' },
  warnText:    { flex:1, fontSize:FONTS.xs, color:COLORS.warning, lineHeight:18 },
  sec:         { fontSize:FONTS.xs, fontWeight:FONTS.bold, color:COLORS.textDark, textTransform:'uppercase', letterSpacing:0.8, marginTop:SPACING.lg, marginBottom:SPACING.sm },
  fg:          { marginBottom:SPACING.md },
  fl:          { fontSize:FONTS.sm, color:COLORS.textLight, marginBottom:6, fontWeight:FONTS.medium },
  fi:          { backgroundColor:COLORS.bgCard, borderRadius:RADIUS.md, padding:SPACING.md, color:COLORS.textWhite, fontSize:FONTS.md, borderWidth:1, borderColor:COLORS.border, height:50 },
  fim:         { height:80, textAlignVertical:'top' },
  switchCard:  { backgroundColor:COLORS.bgCard, borderRadius:RADIUS.lg, borderWidth:1, borderColor:COLORS.border, overflow:'hidden' },
  switchRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:SPACING.lg },
  swBorder:    { borderTopWidth:1, borderTopColor:COLORS.divider||COLORS.border },
  swLabel:     { fontSize:FONTS.md, color:COLORS.textWhite, fontWeight:FONTS.medium },
  swSub:       { fontSize:FONTS.xs, color:COLORS.textMuted, marginTop:2 },
  optRow:      { flexDirection:'row', gap:SPACING.sm, marginBottom:SPACING.sm },
  optBtn:      { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:12, borderRadius:RADIUS.md, backgroundColor:COLORS.bgCard, borderWidth:1, borderColor:COLORS.border },
  optBtnA:     { backgroundColor:COLORS.primary, borderColor:COLORS.primary },
  optTxt:      { fontSize:FONTS.sm, color:COLORS.textMuted, fontWeight:FONTS.medium },
  optTxtA:     { color:'#fff', fontWeight:FONTS.bold },
  previewBox:  { backgroundColor:'#fff', borderRadius:RADIUS.md, padding:SPACING.lg, borderWidth:1, borderColor:COLORS.border },
});