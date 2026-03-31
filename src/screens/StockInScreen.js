/**
 * src/screens/StockInScreen.js — FIXED: Full Light Mode
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { productsAPI, suppliersAPI, stockAPI } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function StockInScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [products, setProducts]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [selectedProduct, setSelectedProduct]   = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [quantity, setQuantity]   = useState('');
  const [unitCost, setUnitCost]   = useState('');
  const [notes, setNotes]         = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch]         = useState('');

  useEffect(() => {
    const load = async () => {
      const [pr, sr] = await Promise.all([productsAPI.getAll(), suppliersAPI.getAll()]);
      if (pr.success && Array.isArray(pr.data)) setProducts(pr.data);
      if (sr.success && Array.isArray(sr.data)) setSuppliers(sr.data);
      setIsLoading(false);
    };
    load();
  }, []);

  const filteredProducts = productSearch.trim()
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  const totalCost = (parseFloat(unitCost) || 0) * (parseInt(quantity) || 0);

  const handleSubmit = async () => {
    if (!selectedProduct) { Alert.alert('Error', 'Pilih produk terlebih dahulu'); return; }
    if (!quantity || parseInt(quantity) <= 0) { Alert.alert('Error', 'Jumlah stok harus lebih dari 0'); return; }
    setIsSaving(true);
    const result = await stockAPI.addIn({
      product_id: selectedProduct.id, supplier_id: selectedSupplier?.id || null,
      quantity: parseInt(quantity), unit_cost: parseFloat(unitCost) || 0, notes,
    });
    if (result.success) {
      Alert.alert('Sukses', `Stok ${selectedProduct.name} bertambah +${quantity}`, [
        { text: 'OK', onPress: () => { setSelectedProduct(null); setQuantity(''); setUnitCost(''); setNotes(''); setSelectedSupplier(null); } },
      ]);
    } else Alert.alert('Gagal', result.error || 'Gagal menambah stok');
    setIsSaving(false);
  };

  if (isLoading) return <View style={[s.loading, { backgroundColor: colors.bgDark }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[s.container, { backgroundColor: colors.bgDark }]}>
      <View style={[s.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border, borderBottomWidth: isDark ? 1 : 0.5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textWhite }]}>Stok Masuk</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {/* Pilih Produk */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textLight }]}>Produk *</Text>
          <TouchableOpacity style={[s.selector, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => setShowProductPicker(true)}>
            <Ionicons name="cube-outline" size={18} color={selectedProduct ? colors.primary : colors.textMuted} />
            <Text style={[s.selectorText, { color: selectedProduct ? colors.textWhite : colors.textMuted }]}>
              {selectedProduct ? selectedProduct.name : 'Pilih produk...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {selectedProduct && (
            <View style={[s.productInfo, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[s.productInfoText, { color: colors.primary }]}>Stok saat ini: {selectedProduct.stock} {selectedProduct.unit || 'pcs'}</Text>
              <Text style={[s.productInfoText, { color: colors.primary }]}>HPP lama: {formatCurrency(selectedProduct.buying_price || 0)}</Text>
            </View>
          )}
        </View>

        {/* Supplier */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textLight }]}>Supplier (Opsional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.supplierList}>
              <TouchableOpacity
                style={[s.supplierChip, { backgroundColor: !selectedSupplier ? colors.warning : colors.bgCard, borderColor: !selectedSupplier ? colors.warning : colors.border }]}
                onPress={() => setSelectedSupplier(null)}
              >
                <Text style={[s.supplierChipText, { color: !selectedSupplier ? '#fff' : colors.textMuted }]}>Tanpa Supplier</Text>
              </TouchableOpacity>
              {suppliers.map(sup => (
                <TouchableOpacity
                  key={sup.id}
                  style={[s.supplierChip, { backgroundColor: selectedSupplier?.id === sup.id ? colors.warning : colors.bgCard, borderColor: selectedSupplier?.id === sup.id ? colors.warning : colors.border }]}
                  onPress={() => setSelectedSupplier(sup)}
                >
                  <Text style={[s.supplierChipText, { color: selectedSupplier?.id === sup.id ? '#fff' : colors.textMuted }]}>{sup.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Qty & Harga */}
        <View style={s.row}>
          <View style={[s.section, { flex: 1 }]}>
            <Text style={[s.sectionTitle, { color: colors.textLight }]}>Jumlah Stok *</Text>
            <TextInput style={[s.input, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textDark} />
          </View>
          <View style={[s.section, { flex: 1 }]}>
            <Text style={[s.sectionTitle, { color: colors.textLight }]}>Harga Beli/Unit</Text>
            <TextInput style={[s.input, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]} value={unitCost} onChangeText={setUnitCost} keyboardType="numeric" placeholder="Rp 0" placeholderTextColor={colors.textDark} />
          </View>
        </View>

        {totalCost > 0 && (
          <View style={[s.totalBox, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
            <Text style={[s.totalLabel, { color: colors.textMuted }]}>Total Biaya Pembelian:</Text>
            <Text style={[s.totalValue, { color: colors.success }]}>{formatCurrency(totalCost)}</Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textLight }]}>Catatan</Text>
          <TextInput style={[s.input, s.notesInput, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]} value={notes} onChangeText={setNotes} placeholder="Catatan tambahan (opsional)..." placeholderTextColor={colors.textDark} multiline numberOfLines={3} />
        </View>

        <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="archive-outline" size={20} color="#fff" /><Text style={s.submitText}>Simpan Stok Masuk</Text></>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Pilih Produk */}
      <Modal visible={showProductPicker} animationType="slide" onRequestClose={() => setShowProductPicker(false)}>
        <View style={[s.pickerContainer, { backgroundColor: colors.bgDark }]}>
          <View style={[s.pickerHeader, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Ionicons name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            <Text style={[s.pickerTitle, { color: colors.textWhite }]}>Pilih Produk</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={[s.pickerSearch, { backgroundColor: colors.bgCard, margin: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginLeft: SPACING.sm }} />
            <TextInput style={[s.pickerSearchInput, { color: colors.textWhite }]} placeholder="Cari produk..." placeholderTextColor={colors.textDark} value={productSearch} onChangeText={setProductSearch} autoFocus />
          </View>
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.pickerItem, { borderBottomColor: colors.divider }]}
                onPress={() => { setSelectedProduct(item); setShowProductPicker(false); setProductSearch(''); }}
              >
                <View style={s.pickerItemLeft}>
                  <Text style={[s.pickerItemName, { color: colors.textWhite }]}>{item.name}</Text>
                  <Text style={[s.pickerItemSub, { color: colors.textMuted }]}>Stok: {item.stock} • {formatCurrency(item.selling_price)}</Text>
                </View>
                {selectedProduct?.id === item.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  body: { flex: 1, padding: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sm, fontWeight: '500', marginBottom: 8 },
  row: { flexDirection: 'row', gap: SPACING.md },
  selector: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, height: 52 },
  selectorText: { flex: 1, fontSize: FONTS.md },
  productInfo: { borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm, gap: 3 },
  productInfoText: { fontSize: FONTS.xs },
  supplierList: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 },
  supplierChip: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  supplierChipText: { fontSize: FONTS.sm, fontWeight: '500' },
  input: { borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md, borderWidth: 1, height: 52 },
  notesInput: { height: 80, textAlignVertical: 'top' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1 },
  totalLabel: { fontSize: FONTS.sm },
  totalValue: { fontSize: FONTS.lg, fontWeight: '700' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, paddingVertical: SPACING.md + 2 },
  submitText: { color: '#fff', fontSize: FONTS.md, fontWeight: '700' },
  pickerContainer: { flex: 1 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1 },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', height: 46 },
  pickerSearchInput: { flex: 1, fontSize: FONTS.md, paddingHorizontal: SPACING.sm },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1 },
  pickerItemLeft: { flex: 1 },
  pickerItemName: { fontSize: FONTS.md, fontWeight: '500' },
  pickerItemSub: { fontSize: FONTS.xs, marginTop: 3 },
});
