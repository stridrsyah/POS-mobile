/**
 * src/screens/ProductFormScreen.js — FIXED: Full Light Mode
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Image, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { productsAPI, categoriesAPI, suppliersAPI, getImageUrl, getImageUrlAsync } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// ── Field komponen DI LUAR ─────────────────────────────────
const FormField = ({ label, value, onChangeText, keyboard = 'default', multiline = false, prefix, placeholder, colors }) => (
  <View style={ff.group}>
    <Text style={[ff.label, { color: colors.textLight }]}>{label}</Text>
    <View style={[ff.inputRow, { backgroundColor: colors.bgCard, borderColor: colors.border }, multiline && { height: 80, alignItems: 'flex-start' }]}>
      {prefix && <Text style={[ff.prefix, { color: colors.textMuted }]}>{prefix}</Text>}
      <TextInput
        style={[ff.input, { color: colors.textWhite }, multiline && { textAlignVertical: 'top', paddingTop: SPACING.sm }]}
        value={value} onChangeText={onChangeText} keyboardType={keyboard}
        placeholderTextColor={colors.textDark}
        placeholder={placeholder || `Masukkan ${label}`}
        multiline={multiline} numberOfLines={multiline ? 3 : 1} blurOnSubmit={!multiline}
      />
    </View>
  </View>
);
const ff = StyleSheet.create({
  group: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sm, fontWeight: '500', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 50 },
  prefix: { fontSize: FONTS.sm, marginRight: 6 },
  input: { flex: 1, fontSize: FONTS.md },
});

const ChipPicker = ({ label, options, value, onChange, placeholder, colors }) => (
  <View style={ff.group}>
    <Text style={[ff.label, { color: colors.textLight }]}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 }}>
        <TouchableOpacity style={[cp.chip, !value && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border, backgroundColor: colors.bgCard }]} onPress={() => onChange('')}>
          <Text style={[cp.text, { color: !value ? '#fff' : colors.textMuted }, !value && { color: '#fff' }]}>{placeholder || 'Semua'}</Text>
        </TouchableOpacity>
        {options.map(opt => (
          <TouchableOpacity
            key={String(opt.id)}
            style={[cp.chip, { borderColor: String(value) === String(opt.id) ? colors.primary : colors.border, backgroundColor: String(value) === String(opt.id) ? colors.primary : colors.bgCard }]}
            onPress={() => onChange(String(opt.id))}
          >
            <Text style={[cp.text, { color: String(value) === String(opt.id) ? '#fff' : colors.textMuted }]}>{opt.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </View>
);
const cp = StyleSheet.create({
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1 },
  text: { fontSize: FONTS.sm, fontWeight: '500' },
});

export default function ProductFormScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const editProduct = route.params?.product || null;
  const isEdit = !!editProduct;

  const [name, setName]                   = useState(editProduct?.name || '');
  const [barcode, setBarcode]             = useState(editProduct?.barcode || '');
  const [sellingPrice, setSellingPrice]   = useState(editProduct?.selling_price ? String(editProduct.selling_price) : '');
  const [buyingPrice, setBuyingPrice]     = useState(editProduct?.buying_price ? String(editProduct.buying_price) : '');
  const [stock, setStock]                 = useState(editProduct?.stock ? String(editProduct.stock) : '0');
  const [minStock, setMinStock]           = useState(editProduct?.min_stock ? String(editProduct.min_stock) : '5');
  const [unit, setUnit]                   = useState(editProduct?.unit || 'pcs');
  const [description, setDescription]    = useState(editProduct?.description || '');
  const [categoryId, setCategoryId]       = useState(editProduct?.category_id ? String(editProduct.category_id) : '');
  const [supplierId, setSupplierId]       = useState(editProduct?.supplier_id ? String(editProduct.supplier_id) : '');
  const [categories, setCategories]       = useState([]);
  const [suppliers, setSuppliers]         = useState([]);
  const [photoUri, setPhotoUri]           = useState(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoading, setIsLoading]         = useState(true);

  useEffect(() => {
    const load = async () => {
      const [cr, sr] = await Promise.all([categoriesAPI.getAll(), suppliersAPI.getAll()]);
      if (cr.success) setCategories(cr.data || []);
      if (sr.success) setSuppliers(sr.data || []);
      if (editProduct) { const imgUrl = await getImageUrlAsync(editProduct); if (imgUrl) setPhotoUri(imgUrl); }
      setIsLoading(false);
    };
    load();
  }, []);

  const pickImage = useCallback(() => {
    Alert.alert('Pilih Sumber Foto', '', [
      { text: 'Kamera', onPress: async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Izin diperlukan', 'Izinkan akses kamera'); return; }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
        if (!res.canceled && res.assets?.[0]) setPhotoUri(res.assets[0].uri);
      }},
      { text: 'Galeri', onPress: async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Izin diperlukan', 'Izinkan akses galeri'); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
        if (!res.canceled && res.assets?.[0]) setPhotoUri(res.assets[0].uri);
      }},
      { text: 'Batal', style: 'cancel' },
    ]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { Alert.alert('Error', 'Nama produk wajib diisi'); return; }
    if (!sellingPrice) { Alert.alert('Error', 'Harga jual wajib diisi'); return; }
    setIsSaving(true);
    const data = { name: name.trim(), barcode: barcode.trim(), selling_price: parseFloat(sellingPrice) || 0, buying_price: parseFloat(buyingPrice) || 0, stock: parseInt(stock) || 0, min_stock: parseInt(minStock) || 5, unit: unit || 'pcs', description, category_id: parseInt(categoryId) || null, supplier_id: parseInt(supplierId) || null };
    let result = isEdit ? await productsAPI.update(editProduct.id, data) : await productsAPI.create(data);
    if (!result.success) { Alert.alert('Gagal', result.error || 'Gagal menyimpan'); setIsSaving(false); return; }
    const productId = isEdit ? editProduct.id : result.data?.id;
    if (productId && photoUri && !photoUri.startsWith('http')) {
      const upRes = await productsAPI.uploadPhoto(productId, photoUri);
      if (!upRes.success) { Alert.alert('Produk Tersimpan', 'Data tersimpan, foto gagal diupload.', [{ text: 'OK', onPress: () => navigation.goBack() }]); setIsSaving(false); return; }
    }
    setIsSaving(false);
    Alert.alert('Sukses', isEdit ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }, [name, barcode, sellingPrice, buyingPrice, stock, minStock, unit, description, categoryId, supplierId, photoUri, isEdit, editProduct]);

  const sp = parseFloat(sellingPrice) || 0;
  const bp = parseFloat(buyingPrice)  || 0;
  const margin = sp - bp;
  const marginPct = bp > 0 ? ((margin / bp) * 100).toFixed(1) : 0;

  if (isLoading) return <View style={[pf.loadingCenter, { backgroundColor: colors.bgDark }]}><ActivityIndicator size="large" color={colors.primary} /><Text style={{ color: colors.textMuted, marginTop: 12 }}>Memuat...</Text></View>;

  return (
    <SafeAreaView style={[pf.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={[pf.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border, borderBottomWidth: isDark ? 1 : 0.5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[pf.headerTitle, { color: colors.textWhite }]}>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</Text>
        <TouchableOpacity style={[pf.saveBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={pf.saveBtnText}>Simpan</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={pf.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Foto */}
          <View style={pf.photoSection}>
            <TouchableOpacity style={[pf.photoBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={pickImage} activeOpacity={0.8}>
              {photoUri ? <Image source={{ uri: photoUri }} style={pf.photoImg} /> : (
                <View style={[pf.photoPlaceholder]}>
                  <Ionicons name="camera-outline" size={36} color={colors.textDark} />
                  <Text style={[pf.photoHint, { color: colors.textDark }]}>Tap untuk tambah foto</Text>
                </View>
              )}
              <View style={[pf.photoEditBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={pf.removePhotoBtn}>
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={[pf.removePhotoText, { color: colors.danger }]}>Hapus Foto</Text>
              </TouchableOpacity>
            )}
          </View>

          <FormField label="Nama Produk *" value={name} onChangeText={setName} placeholder="Contoh: Indomie Goreng" colors={colors} />
          <FormField label="Barcode / SKU" value={barcode} onChangeText={setBarcode} placeholder="Contoh: 8991234567890" colors={colors} />
          <FormField label="Harga Jual (Rp) *" value={sellingPrice} onChangeText={setSellingPrice} keyboard="numeric" prefix="Rp" placeholder="0" colors={colors} />
          <FormField label="Harga Beli / HPP (Rp)" value={buyingPrice} onChangeText={setBuyingPrice} keyboard="numeric" prefix="Rp" placeholder="0" colors={colors} />

          <View style={pf.rowFields}>
            <View style={{ flex: 1 }}><FormField label="Stok Awal" value={stock} onChangeText={setStock} keyboard="numeric" placeholder="0" colors={colors} /></View>
            <View style={{ flex: 1 }}><FormField label="Min. Stok" value={minStock} onChangeText={setMinStock} keyboard="numeric" placeholder="5" colors={colors} /></View>
          </View>

          {/* Satuan */}
          <View style={ff.group}>
            <Text style={[ff.label, { color: colors.textLight }]}>Satuan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 }}>
                {['pcs', 'kg', 'gr', 'liter', 'ml', 'box', 'lusin', 'pak', 'dus', 'botol'].map(u => (
                  <TouchableOpacity key={u} style={[cp.chip, { borderColor: unit === u ? colors.primary : colors.border, backgroundColor: unit === u ? colors.primary : colors.bgCard }]} onPress={() => setUnit(u)}>
                    <Text style={[cp.text, { color: unit === u ? '#fff' : colors.textMuted }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <ChipPicker label="Kategori" options={categories} value={categoryId} onChange={setCategoryId} placeholder="Tanpa Kategori" colors={colors} />
          <ChipPicker label="Supplier" options={suppliers} value={supplierId} onChange={setSupplierId} placeholder="Tanpa Supplier" colors={colors} />
          <FormField label="Deskripsi (opsional)" value={description} onChangeText={setDescription} multiline placeholder="Deskripsi produk..." colors={colors} />

          {sp > 0 && bp > 0 && (
            <View style={[pf.marginPreview, { backgroundColor: margin >= 0 ? colors.success + '15' : colors.danger + '15' }]}>
              <Ionicons name={margin >= 0 ? 'trending-up-outline' : 'trending-down-outline'} size={16} color={margin >= 0 ? colors.success : colors.danger} />
              <Text style={[pf.marginText, { color: margin >= 0 ? colors.success : colors.danger }]}>
                Margin: {formatCurrency(margin)} ({marginPct}%)
              </Text>
            </View>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const pf = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  saveBtn: { borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 8 },
  saveBtnText: { color: '#fff', fontSize: FONTS.sm, fontWeight: '700' },
  body: { flex: 1, padding: SPACING.lg },
  photoSection: { alignItems: 'center', marginBottom: SPACING.xl },
  photoBox: { width: 120, height: 120, borderRadius: RADIUS.xl, borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  photoHint: { fontSize: FONTS.xs, textAlign: 'center' },
  photoEditBadge: { position: 'absolute', bottom: 6, right: 6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  removePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  removePhotoText: { fontSize: FONTS.xs },
  rowFields: { flexDirection: 'row', gap: SPACING.md },
  marginPreview: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  marginText: { fontSize: FONTS.sm, fontWeight: '600' },
});
