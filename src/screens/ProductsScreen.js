/**
 * src/screens/ProductsScreen.js — Manajemen Produk (FIXED)
 * ─────────────────────────────────────────────────────────
 * FIX:
 *  - Kategori terpotong di atas → paddingTop ditambahkan di catContent
 *  - catBar juga perlu paddingTop agar chip tidak menempel di batas atas
 *  - key prop yang konsisten
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { productsAPI, categoriesAPI, getImageUrl } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function ProductsScreen({ navigation }) {
  const { isManager } = useAuth();
  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([{ id: 0, name: 'Semua' }]);
  const [filtered,    setFiltered]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [selectedCat, setSelectedCat] = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [pr, cr] = await Promise.all([productsAPI.getAll(), categoriesAPI.getAll()]);
    if (pr.success && Array.isArray(pr.data)) { setProducts(pr.data); setFiltered(pr.data); }
    if (cr.success && Array.isArray(cr.data)) setCategories([{ id: 0, name: 'Semua' }, ...cr.data]);
    setIsLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  React.useEffect(() => {
    let res = [...products];
    if (selectedCat !== 0) {
      const cat = categories.find(c => c.id === selectedCat);
      if (cat) res = res.filter(p => p.category_name === cat.name);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(p => p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q));
    }
    setFiltered(res);
  }, [search, selectedCat, products, categories]);

  const handleDelete = useCallback((product) => {
    Alert.alert('Hapus Produk', `Hapus "${product.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const r = await productsAPI.delete(product.id);
          if (r.success) loadData();
          else Alert.alert('Gagal', r.error || 'Gagal menghapus');
        },
      },
    ]);
  }, [loadData]);

  const renderItem = useCallback(({ item }) => {
    const imgUri   = getImageUrl(item);
    const lowStock = item.stock <= (item.min_stock || 5);
    const outStock = item.stock === 0;
    return (
      <View style={styles.card}>
        <View style={styles.imgBox}>
          {imgUri
            ? <Image source={{ uri: imgUri }} style={styles.img} />
            : <View style={styles.imgPlaceholder}><Ionicons name="cube-outline" size={22} color={COLORS.textDark} /></View>
          }
          {outStock && <View style={[styles.stockBadge, { backgroundColor: COLORS.danger }]}><Text style={styles.badgeTxt}>Habis</Text></View>}
          {!outStock && lowStock && <View style={[styles.stockBadge, { backgroundColor: COLORS.warning }]}><Text style={styles.badgeTxt}>Rendah</Text></View>}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.sub}>{item.category_name || 'Umum'} • {item.unit || 'pcs'}</Text>
          <Text style={styles.price}>{formatCurrency(item.selling_price)}</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.stock, outStock && { color: COLORS.danger }, !outStock && lowStock && { color: COLORS.warning }]}>
              Stok: {item.stock} {item.unit || 'pcs'}
            </Text>
            {item.barcode ? <Text style={styles.barcode}>#{item.barcode}</Text> : null}
          </View>
          {item.buying_price > 0 && (
            <Text style={styles.hpp}>HPP: {formatCurrency(item.buying_price)}</Text>
          )}
        </View>
        {isManager && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actBtn} onPress={() => navigation.navigate('ProductForm', { product: item })}>
              <Ionicons name="create-outline" size={18} color={COLORS.info} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [isManager, navigation, handleDelete]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Produk ({filtered.length})</Text>
        {isManager && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ProductForm', { product: null })}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama atau barcode..."
          placeholderTextColor={COLORS.textDark}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* FIX: paddingTop agar chip kategori tidak terpotong di atas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catBar}
        contentContainerStyle={styles.catContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={`pcat-${cat.id}`}
            style={[styles.catChip, selectedCat === cat.id && styles.catChipActive]}
            onPress={() => setSelectedCat(cat.id)}
          >
            <Text style={[styles.catText, selectedCat === cat.id && styles.catTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading
        ? <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        : <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => `pr-${item.id}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={COLORS.textDark} />
              <Text style={styles.emptyText}>
                {search ? `Tidak ada produk "${search}"` : 'Tidak ada produk'}
              </Text>
            </View>
          }
        />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginVertical: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 44, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },

  /* FIX kategori terpotong: paddingTop + paddingBottom */
  catBar: { backgroundColor: COLORS.bgMedium, flexGrow: 0, flexShrink: 0 },
  catContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,      // ← FIX: chip tidak terpotong di atas
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: '500' },
  catTextActive: { color: '#fff', fontWeight: '700' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 60 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', ...SHADOW.sm,
  },
  imgBox: { width: 80, height: 80, position: 'relative', backgroundColor: COLORS.bgMedium, flexShrink: 0 },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stockBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingVertical: 2 },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  info: { flex: 1, paddingVertical: SPACING.sm, paddingLeft: SPACING.sm, gap: 2 },
  name: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: '600' },
  sub: { fontSize: FONTS.xs, color: COLORS.textMuted },
  price: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stock: { fontSize: FONTS.xs, color: COLORS.success },
  barcode: { fontSize: FONTS.xs, color: COLORS.textDark },
  hpp: { fontSize: FONTS.xs, color: COLORS.textDark },
  actions: { flexDirection: 'column', gap: SPACING.sm, padding: SPACING.md },
  actBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgMedium },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.md },
});
