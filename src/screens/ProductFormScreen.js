/**
 * src/screens/ProductFormScreen.js — Form Tambah/Edit Produk (FIXED)
 * ─────────────────────────────────────────────────────────────────
 * FIX:
 *  1. keyboard tertutup tiap ketik 1 huruf → Field component dipindah
 *     ke LUAR dari fungsi komponen utama (tidak boleh didefinisikan di dalam)
 *  2. Upload foto via multipart/form-data (productsAPI.uploadPhoto)
 *  3. Backend photo endpoint handler
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Image, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { productsAPI, categoriesAPI, suppliersAPI, getImageUrl, getImageUrlAsync } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// ─────────────────────────────────────────────────────────────
// PENTING: Field & PickerRow harus di LUAR komponen utama
// Kalau di dalam, React akan buat ulang component setiap render
// sehingga TextInput kehilangan fokus dan keyboard menutup.
// ─────────────────────────────────────────────────────────────

const FormField = ({ label, value, onChangeText, keyboard = 'default', multiline = false, prefix, placeholder }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputRow, multiline && { height: 80, alignItems: 'flex-start' }]}>
      {prefix && <Text style={styles.prefix}>{prefix}</Text>}
      <TextInput
        style={[styles.input, multiline && { textAlignVertical: 'top', paddingTop: SPACING.sm }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard}
        placeholderTextColor={COLORS.textDark}
        placeholder={placeholder || `Masukkan ${label}`}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        // PENTING: blurOnSubmit=false agar keyboard tidak tutup di multiline
        blurOnSubmit={!multiline}
      />
    </View>
  </View>
);

const ChipPicker = ({ label, options, value, onChange, placeholder }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, !value && styles.chipActive]}
          onPress={() => onChange('')}
        >
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>{placeholder || 'Semua'}</Text>
        </TouchableOpacity>
        {options.map(opt => (
          <TouchableOpacity
            key={String(opt.id)}
            style={[styles.chip, String(value) === String(opt.id) && styles.chipActive]}
            onPress={() => onChange(String(opt.id))}
          >
            <Text style={[styles.chipText, String(value) === String(opt.id) && styles.chipTextActive]}>
              {opt.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </View>
);

// ─── Komponen Utama ───────────────────────────────────────────
export default function ProductFormScreen({ navigation, route }) {
  const editProduct = route.params?.product || null;
  const isEdit = !!editProduct;

  // State form — pakai useRef-based setter agar tidak trigger re-render berlebihan
  const [name,          setName]          = useState(editProduct?.name           || '');
  const [barcode,       setBarcode]       = useState(editProduct?.barcode        || '');
  const [sellingPrice,  setSellingPrice]  = useState(editProduct?.selling_price  ? String(editProduct.selling_price)  : '');
  const [buyingPrice,   setBuyingPrice]   = useState(editProduct?.buying_price   ? String(editProduct.buying_price)   : '');
  const [stock,         setStock]         = useState(editProduct?.stock          ? String(editProduct.stock)          : '0');
  const [minStock,      setMinStock]      = useState(editProduct?.min_stock      ? String(editProduct.min_stock)      : '5');
  const [unit,          setUnit]          = useState(editProduct?.unit           || 'pcs');
  const [description,   setDescription]  = useState(editProduct?.description    || '');
  const [categoryId,    setCategoryId]    = useState(editProduct?.category_id    ? String(editProduct.category_id)    : '');
  const [supplierId,    setSupplierId]    = useState(editProduct?.supplier_id    ? String(editProduct.supplier_id)    : '');

  const [categories,    setCategories]    = useState([]);
  const [suppliers,     setSuppliers]     = useState([]);
  const [photoUri,      setPhotoUri]      = useState(null);
  const [isSaving,      setIsSaving]      = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      const [cr, sr] = await Promise.all([categoriesAPI.getAll(), suppliersAPI.getAll()]);
      if (cr.success) setCategories(cr.data || []);
      if (sr.success) setSuppliers(sr.data  || []);
      // Load foto produk secara async agar pakai URL ngrok yang benar
      if (editProduct) {
        const imgUrl = await getImageUrlAsync(editProduct);
        if (imgUrl) setPhotoUri(imgUrl);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // ── Pilih Foto ──────────────────────────────────────────────
  const pickImage = useCallback(() => {
    Alert.alert('Pilih Sumber Foto', 'Pilih sumber foto produk', [
      {
        text: 'Kamera', onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('Izin diperlukan', 'Izinkan akses kamera di Pengaturan'); return; }
          const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7, allowsEditing: true, aspect: [1, 1],
          });
          if (!res.canceled && res.assets?.[0]) setPhotoUri(res.assets[0].uri);
        },
      },
      {
        text: 'Galeri', onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('Izin diperlukan', 'Izinkan akses galeri di Pengaturan'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7, allowsEditing: true, aspect: [1, 1],
          });
          if (!res.canceled && res.assets?.[0]) setPhotoUri(res.assets[0].uri);
        },
      },
      { text: 'Batal', style: 'cancel' },
    ]);
  }, []);

  // ── Simpan ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!name.trim())    { Alert.alert('Error', 'Nama produk wajib diisi');  return; }
    if (!sellingPrice)   { Alert.alert('Error', 'Harga jual wajib diisi');   return; }

    setIsSaving(true);

    const data = {
      name:          name.trim(),
      barcode:       barcode.trim(),
      selling_price: parseFloat(sellingPrice) || 0,
      buying_price:  parseFloat(buyingPrice)  || 0,
      stock:         parseInt(stock)          || 0,
      min_stock:     parseInt(minStock)       || 5,
      unit:          unit || 'pcs',
      description:   description,
      category_id:   parseInt(categoryId)     || null,
      supplier_id:   parseInt(supplierId)     || null,
    };

    let result;
    if (isEdit) {
      result = await productsAPI.update(editProduct.id, data);
    } else {
      result = await productsAPI.create(data);
    }

    if (!result.success) {
      Alert.alert('Gagal', result.error || 'Gagal menyimpan produk. Periksa koneksi dan coba lagi.');
      setIsSaving(false);
      return;
    }

    // Upload foto jika ada foto baru (URI lokal, bukan http)
    const productId = isEdit ? editProduct.id : result.data?.id;
    if (productId && photoUri && !photoUri.startsWith('http')) {
      const upRes = await productsAPI.uploadPhoto(productId, photoUri);
      if (!upRes.success) {
        // Produk tetap tersimpan, foto saja yang gagal
        Alert.alert(
          'Produk Tersimpan',
          'Data produk berhasil disimpan, tetapi foto gagal diupload: ' + (upRes.error || 'unknown'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    Alert.alert('Sukses', isEdit ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [name, barcode, sellingPrice, buyingPrice, stock, minStock, unit, description, categoryId, supplierId, photoUri, isEdit, editProduct]);

  // ── Kalkulasi Margin ────────────────────────────────────────
  const sp = parseFloat(sellingPrice) || 0;
  const bp = parseFloat(buyingPrice)  || 0;
  const margin     = sp - bp;
  const marginPct  = bp > 0 ? ((margin / bp) * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Simpan</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"  // ← PENTING: keyboard tidak tutup saat tap di dalam scroll
        >
          {/* ── Foto Produk ── */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoBox} onPress={pickImage} activeOpacity={0.8}>
              {photoUri
                ? <Image source={{ uri: photoUri }} style={styles.photoImg} />
                : <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={36} color={COLORS.textDark} />
                    <Text style={styles.photoHint}>Tap untuk tambah foto</Text>
                  </View>
              }
              <View style={styles.photoEditBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removePhotoBtn}>
                <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                <Text style={styles.removePhotoText}>Hapus Foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Field-field produk ── */}
          {/* PENTING: gunakan FormField komponen eksternal, bukan inline */}
          <FormField
            label="Nama Produk *"
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Indomie Goreng"
          />
          <FormField
            label="Barcode / SKU"
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Contoh: 8991234567890"
          />
          <FormField
            label="Harga Jual (Rp) *"
            value={sellingPrice}
            onChangeText={setSellingPrice}
            keyboard="numeric"
            prefix="Rp"
            placeholder="0"
          />
          <FormField
            label="Harga Beli / HPP (Rp)"
            value={buyingPrice}
            onChangeText={setBuyingPrice}
            keyboard="numeric"
            prefix="Rp"
            placeholder="0"
          />

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Stok Awal"
                value={stock}
                onChangeText={setStock}
                keyboard="numeric"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Min. Stok"
                value={minStock}
                onChangeText={setMinStock}
                keyboard="numeric"
                placeholder="5"
              />
            </View>
          </View>

          {/* Satuan */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Satuan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {['pcs', 'kg', 'gr', 'liter', 'ml', 'box', 'lusin', 'pak', 'dus', 'botol'].map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.chip, unit === u && styles.chipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Kategori */}
          <ChipPicker
            label="Kategori"
            options={categories}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Tanpa Kategori"
          />

          {/* Supplier */}
          <ChipPicker
            label="Supplier"
            options={suppliers}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="Tanpa Supplier"
          />

          {/* Deskripsi */}
          <FormField
            label="Deskripsi (opsional)"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Deskripsi produk..."
          />

          {/* Preview Margin */}
          {sp > 0 && bp > 0 && (
            <View style={[
              styles.marginPreview,
              { backgroundColor: margin >= 0 ? COLORS.success + '15' : COLORS.danger + '15' }
            ]}>
              <Ionicons
                name={margin >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                size={16}
                color={margin >= 0 ? COLORS.success : COLORS.danger}
              />
              <Text style={[styles.marginText, { color: margin >= 0 ? COLORS.success : COLORS.danger }]}>
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


const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bgDark },
  loadingCenter:{ flex: 1, backgroundColor: COLORS.bgDark, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  saveBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 8 },
  saveBtnText: { color: '#fff', fontSize: FONTS.sm, fontWeight: FONTS.bold },

  body: { flex: 1, padding: SPACING.lg },

  photoSection: { alignItems: 'center', marginBottom: SPACING.xl },
  photoBox: {
    width: 120, height: 120, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.bgCard, borderWidth: 2, borderColor: COLORS.border,
    borderStyle: 'dashed', overflow: 'hidden', position: 'relative',
  },
  photoImg:     { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  photoHint:    { fontSize: FONTS.xs, color: COLORS.textDark, textAlign: 'center' },
  photoEditBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: COLORS.primary, width: 26, height: 26,
    borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  removePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  removePhotoText:{ color: COLORS.danger, fontSize: FONTS.xs },

  fieldGroup: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: '500', marginBottom: 6 },
  inputRow:   {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 50,
  },
  prefix:  { fontSize: FONTS.sm, color: COLORS.textMuted, marginRight: 6 },
  input:   { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },

  rowFields: { flexDirection: 'row', gap: SPACING.md },

  chipRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 },
  chip:    {
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  marginPreview: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md,
  },
  marginText: { fontSize: FONTS.sm, fontWeight: '600' },
});