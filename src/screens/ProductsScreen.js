/**
 * src/screens/ProductsScreen.js — v2.1
 * FIX: Tema terang konsisten, tidak ada warna gelap tersisa
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { productsAPI, categoriesAPI, getImageUrl } from '../services/api';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function ProductsScreen({ navigation }) {
  const { isManager } = useAuth();
  const { colors }    = useTheme();

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
      <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={[s.imgBox, { backgroundColor: colors.bgSurface }]}>
          {imgUri
            ? <Image source={{ uri: imgUri }} style={s.img} />
            : <View style={[s.imgPlaceholder, { backgroundColor: colors.bgSurface }]}>
                <Ionicons name="cube-outline" size={22} color={colors.textDark} />
              </View>
          }
          {outStock && (
            <View style={[s.stockBadge, { backgroundColor: colors.danger }]}>
              <Text style={s.badgeTxt}>Habis</Text>
            </View>
          )}
          {!outStock && lowStock && (
            <View style={[s.stockBadge, { backgroundColor: colors.warning }]}>
              <Text style={s.badgeTxt}>Rendah</Text>
            </View>
          )}
        </View>
        <View style={s.info}>
          <Text style={[s.name, { color: colors.textWhite }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[s.sub, { color: colors.textMuted }]}>{item.category_name || 'Umum'} • {item.unit || 'pcs'}</Text>
          <Text style={[s.price, { color: colors.primary }]}>{formatCurrency(item.selling_price)}</Text>
          <View style={s.infoRow}>
            <Text style={[s.stock, { color: outStock ? colors.danger : lowStock ? colors.warning : colors.success }]}>
              Stok: {item.stock} {item.unit || 'pcs'}
            </Text>
            {item.barcode ? <Text style={[s.barcode, { color: colors.textDark }]}>#{item.barcode}</Text> : null}
          </View>
          {item.buying_price > 0 && (
            <Text style={[s.hpp, { color: colors.textDark }]}>HPP: {formatCurrency(item.buying_price)}</Text>
          )}
        </View>
        {isManager && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actBtn, { backgroundColor: colors.bgSurface }]}
              onPress={() => navigation.navigate('ProductForm', { product: item })}
            >
              <Ionicons name="create-outline" size={18} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actBtn, { backgroundColor: colors.bgSurface }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [isManager, navigation, handleDelete, colors]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
        <Text style={[s.headerTitle, { color: colors.textWhite }]}>Produk ({filtered.length})</Text>
        {isManager && (
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('ProductForm', { product: null })}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.bgMedium }]}>
        <View style={[s.searchBar, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.textWhite }]}
            placeholder="Cari nama atau barcode..."
            placeholderTextColor={colors.textDark}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Kategori */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.catBar, { backgroundColor: colors.bgMedium }]}
        contentContainerStyle={[s.catContent, { borderBottomColor: colors.border }]}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={`pcat-${cat.id}`}
            style={[
              s.catChip,
              { backgroundColor: selectedCat === cat.id ? colors.primary : colors.bgCard, borderColor: selectedCat === cat.id ? colors.primary : colors.border },
            ]}
            onPress={() => setSelectedCat(cat.id)}
          >
            <Text style={[s.catText, { color: selectedCat === cat.id ? '#fff' : colors.textMuted }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => `pr-${item.id}`}
          contentContainerStyle={[s.list, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={48} color={colors.textDark} />
              <Text style={[s.emptyText, { color: colors.textMuted }]}>
                {search ? `Tidak ada produk "${search}"` : 'Tidak ada produk'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    height: 44, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FONTS.md },

  catBar:    { flexGrow: 0, flexShrink: 0 },
  catContent:{
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    paddingBottom: SPACING.md, gap: SPACING.sm,
    flexDirection: 'row', alignItems: 'center',
  },
  catChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  catText: { fontSize: FONTS.sm, fontWeight: '500' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: SPACING.lg },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, marginBottom: SPACING.md,
    borderWidth: 1, overflow: 'hidden', minHeight: 90, ...SHADOW.sm,
  },
  imgBox:      { width: 100, height: 100, position: 'relative', flexShrink: 0 },
  img:         { width: '100%', height: '105%', resizeMode: 'cover' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stockBadge:  { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingVertical: 2 },
  badgeTxt:    { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  info:        { flex: 1, paddingVertical: SPACING.sm, paddingLeft: SPACING.sm, gap: 2 },
  name:        { fontSize: FONTS.md, fontWeight: '600' },
  sub:         { fontSize: FONTS.xs },
  price:       { fontSize: FONTS.sm, fontWeight: 'bold' },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stock:       { fontSize: FONTS.xs },
  barcode:     { fontSize: FONTS.xs },
  hpp:         { fontSize: FONTS.xs },
  actions:     { flexDirection: 'column', gap: SPACING.sm, padding: SPACING.md },
  actBtn:      { padding: 8, borderRadius: RADIUS.sm },
  empty:       { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyText:   { fontSize: FONTS.md },
});
