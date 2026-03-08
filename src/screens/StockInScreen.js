/**
 * src/screens/StockInScreen.js — Input Stok Masuk
 * ============================================================
 * Fitur:
 * - Pilih produk dari dropdown (search)
 * - Pilih supplier (opsional)
 * - Input jumlah stok masuk & harga beli
 * - Kirim ke API untuk update stok produk
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productsAPI, suppliersAPI, stockAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function StockInScreen({ navigation }) {
  const [products, setProducts]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [quantity, setQuantity]   = useState('');
  const [unitCost, setUnitCost]   = useState('');
  const [notes, setNotes]         = useState('');

  // Modal pilih produk
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
      product_id:  selectedProduct.id,
      supplier_id: selectedSupplier?.id || null,
      quantity:    parseInt(quantity),
      unit_cost:   parseFloat(unitCost) || 0,
      notes:       notes,
    });

    if (result.success) {
      Alert.alert('Sukses', `Stok ${selectedProduct.name} bertambah +${quantity}`, [
        { text: 'OK', onPress: () => {
          setSelectedProduct(null); setQuantity(''); setUnitCost(''); setNotes(''); setSelectedSupplier(null);
        }},
      ]);
    } else {
      Alert.alert('Gagal', result.error || 'Gagal menambah stok');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stok Masuk</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* Pilih Produk */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produk *</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowProductPicker(true)}>
            <Ionicons name="cube-outline" size={18} color={selectedProduct ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.selectorText, selectedProduct && styles.selectorTextSelected]}>
              {selectedProduct ? selectedProduct.name : 'Pilih produk...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          {selectedProduct && (
            <View style={styles.productInfo}>
              <Text style={styles.productInfoText}>
                Stok saat ini: {selectedProduct.stock} {selectedProduct.unit || 'pcs'}
              </Text>
              <Text style={styles.productInfoText}>
                HPP lama: {formatCurrency(selectedProduct.buying_price || 0)}
              </Text>
            </View>
          )}
        </View>

        {/* Pilih Supplier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier (Opsional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.supplierList}>
              <TouchableOpacity
                style={[styles.supplierChip, !selectedSupplier && styles.supplierChipActive]}
                onPress={() => setSelectedSupplier(null)}
              >
                <Text style={[styles.supplierChipText, !selectedSupplier && styles.supplierChipTextActive]}>
                  Tanpa Supplier
                </Text>
              </TouchableOpacity>
              {suppliers.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.supplierChip, selectedSupplier?.id === s.id && styles.supplierChipActive]}
                  onPress={() => setSelectedSupplier(s)}
                >
                  <Text style={[styles.supplierChipText, selectedSupplier?.id === s.id && styles.supplierChipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Jumlah & Harga Beli */}
        <View style={styles.row}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Jumlah Stok *</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textDark}
            />
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Harga Beli/Unit</Text>
            <TextInput
              style={styles.input}
              value={unitCost}
              onChangeText={setUnitCost}
              keyboardType="numeric"
              placeholder="Rp 0"
              placeholderTextColor={COLORS.textDark}
            />
          </View>
        </View>

        {/* Total biaya */}
        {totalCost > 0 && (
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Biaya Pembelian:</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalCost)}</Text>
          </View>
        )}

        {/* Catatan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Catatan tambahan (opsional)..."
            placeholderTextColor={COLORS.textDark}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Tombol Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isSaving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="archive-outline" size={20} color="#fff" />
                        <Text style={styles.submitText}>Simpan Stok Masuk</Text>
                      </>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Pilih Produk */}
      <Modal visible={showProductPicker} animationType="slide" onRequestClose={() => setShowProductPicker(false)}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Ionicons name="close" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Pilih Produk</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.pickerSearch}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Cari produk..."
              placeholderTextColor={COLORS.textDark}
              value={productSearch}
              onChangeText={setProductSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => { setSelectedProduct(item); setShowProductPicker(false); setProductSearch(''); }}
              >
                <View style={styles.pickerItemLeft}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemSub}>
                    Stok: {item.stock} • {formatCurrency(item.selling_price)}
                  </Text>
                </View>
                {selectedProduct?.id === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  loading: { flex: 1, backgroundColor: COLORS.bgDark, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgMedium,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  body: { flex: 1, padding: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium, marginBottom: 8 },
  row: { flexDirection: 'row', gap: SPACING.md },

  selector: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, height: 52,
  },
  selectorText: { flex: 1, fontSize: FONTS.md, color: COLORS.textMuted },
  selectorTextSelected: { color: COLORS.textWhite, fontWeight: FONTS.medium },

  productInfo: {
    backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.sm, gap: 3,
  },
  productInfoText: { fontSize: FONTS.xs, color: COLORS.primary },

  supplierList: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 },
  supplierChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  supplierChipActive: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  supplierChipText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.medium },
  supplierChipTextActive: { color: '#fff' },

  input: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textWhite, fontSize: FONTS.md,
    borderWidth: 1, borderColor: COLORS.border, height: 52,
  },
  notesInput: { height: 80, textAlignVertical: 'top' },

  totalBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.success + '15', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.success + '40',
  },
  totalLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  totalValue: { fontSize: FONTS.lg, color: COLORS.success, fontWeight: FONTS.bold },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingVertical: SPACING.md + 2, ...SHADOW.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: FONTS.md, fontWeight: FONTS.bold },

  pickerContainer: { flex: 1, backgroundColor: COLORS.bgDark },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgMedium,
  },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  pickerSearch: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    margin: SPACING.lg, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    height: 46, borderWidth: 1, borderColor: COLORS.border,
  },
  pickerSearchInput: { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  pickerItemLeft: { flex: 1 },
  pickerItemName: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.medium },
  pickerItemSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 3 },
});