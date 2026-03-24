/**
 * src/screens/PosScreen.js — Kasir v2
 * Offline product cache + theme support + improved UI
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Dimensions,
  StyleSheet, ActivityIndicator, Image, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { productsAPI, categoriesAPI, getImageUrl } from '../services/api';
import {
  offlineProducts, offlineCategories, isOnline,
} from '../services/offlineService';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';
import { OfflineBanner, Skeleton } from '../components/UIComponents';

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = (SW - SPACING.lg * 2 - SPACING.md) / 2;

const DEMO_PRODUCTS = [
  { id: 1, name: 'Nasi Goreng Spesial', category_name: 'Makanan', selling_price: 25000, stock: 50, barcode: '001' },
  { id: 2, name: 'Mie Goreng', category_name: 'Makanan', selling_price: 20000, stock: 30, barcode: '002' },
  { id: 3, name: 'Es Teh Manis', category_name: 'Minuman', selling_price: 5000, stock: 100, barcode: '003' },
  { id: 4, name: 'Jus Alpukat', category_name: 'Minuman', selling_price: 15000, stock: 25, barcode: '004' },
  { id: 5, name: 'Sate Ayam 10pcs', category_name: 'Makanan', selling_price: 30000, stock: 20, barcode: '005' },
  { id: 6, name: 'Air Mineral 600ml', category_name: 'Minuman', selling_price: 4000, stock: 200, barcode: '007' },
  { id: 7, name: 'Kopi Hitam', category_name: 'Minuman', selling_price: 8000, stock: 60, barcode: '008' },
  { id: 8, name: 'Roti Bakar', category_name: 'Snack', selling_price: 18000, stock: 15, barcode: '009' },
];

const DEMO_CATEGORIES = [
  { id: 0, name: 'Semua' },
  { id: 1, name: 'Makanan' },
  { id: 2, name: 'Minuman' },
  { id: 3, name: 'Snack' },
];

const CategoryChip = ({ cat, active, onPress, colors }) => (
  <TouchableOpacity
    style={[
      ccS.chip,
      {
        backgroundColor: active ? colors.primary : colors.bgCard,
        borderColor: active ? colors.primary : colors.border,
      }
    ]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[ccS.txt, { color: active ? '#fff' : colors.textMuted }]}>{cat.name}</Text>
  </TouchableOpacity>
);

const ccS = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, marginRight: SPACING.sm },
  txt: { fontSize: FONTS.sm, fontWeight: '600' },
});

const ProductCard = ({ item, onPress, isAdded, colors, isDark }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const imageUri = getImageUrl(item);
  const outOfStock = item.stock <= 0;
  const lowStock = !outOfStock && item.stock <= 5;

  useEffect(() => {
    if (isAdded) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [isAdded]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          pcS.card,
          {
            backgroundColor: colors.bgCard,
            borderColor: isAdded ? colors.success : outOfStock ? colors.border : colors.border,
            borderWidth: isAdded ? 2 : 1,
            width: CARD_WIDTH,
          },
          SHADOW.sm,
        ]}
        onPress={() => onPress(item)}
        disabled={outOfStock}
        activeOpacity={0.82}
      >
        {/* Image */}
        <View style={pcS.imgWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={pcS.img} />
          ) : (
            <View style={[pcS.imgPlaceholder, { backgroundColor: colors.bgSurface || colors.bgMedium }]}>
              <Ionicons name="cube-outline" size={28} color={colors.textDark} />
            </View>
          )}

          {/* Overlay: out of stock */}
          {outOfStock && (
            <View style={pcS.soldOverlay}>
              <Text style={pcS.soldText}>Habis</Text>
            </View>
          )}

          {/* Badge: low stock */}
          {lowStock && !outOfStock && (
            <View style={[pcS.badge, { backgroundColor: colors.warning }]}>
              <Text style={pcS.badgeTxt}>Sisa {item.stock}</Text>
            </View>
          )}

          {/* Add feedback */}
          {isAdded && (
            <View style={[pcS.addedOverlay, { backgroundColor: colors.success + 'CC' }]}>
              <Ionicons name="checkmark" size={28} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={pcS.info}>
          <Text style={[pcS.name, { color: colors.textWhite }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[pcS.category, { color: colors.textDark }]}>{item.category_name || 'Umum'}</Text>
          <View style={pcS.priceRow}>
            <Text style={[pcS.price, { color: colors.primary }]}>{formatCurrency(item.selling_price)}</Text>
            <View style={[pcS.addBtn, { backgroundColor: outOfStock ? colors.textDark : colors.primary + '20' }]}>
              <Ionicons name="add" size={16} color={outOfStock ? colors.textDark : colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const pcS = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
  imgWrap: { height: 110, position: 'relative' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  soldText: { color: '#fff', fontWeight: '800', fontSize: FONTS.sm, letterSpacing: 0.5 },
  addedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 6, left: 6,
    borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  info: { padding: SPACING.sm, gap: 3 },
  name: { fontSize: FONTS.sm, fontWeight: '600', lineHeight: 18 },
  category: { fontSize: 11 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  price: { fontSize: FONTS.sm, fontWeight: '800' },
  addBtn: { width: 26, height: 26, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
});

export default function PosScreen({ navigation }) {
  const { addItem, totalItems } = useCart();
  const { colors, isDark } = useTheme();

  const [products, setProducts]             = useState([]);
  const [filteredProducts, setFiltered]     = useState([]);
  const [categories, setCategories]         = useState(DEMO_CATEGORIES);
  const [selectedCategory, setSelectedCat] = useState(0);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isLoading, setIsLoading]           = useState(true);
  const [isDemo, setIsDemo]                 = useState(false);
  const [addedFeedback, setAddedFeedback]   = useState({});
  const [online, setOnline]                 = useState(isOnline());

  const loadData = async () => {
    setIsLoading(true);
    const isConn = isOnline();
    setOnline(isConn);

    try {
      if (isConn) {
        const [prodResult, catResult] = await Promise.all([
          productsAPI.getAll(),
          categoriesAPI.getAll(),
        ]);

        if (prodResult.success && Array.isArray(prodResult.data)) {
          setProducts(prodResult.data);
          setFiltered(prodResult.data);
          await offlineProducts.save(prodResult.data);
          setIsDemo(false);
        } else {
          throw new Error('API failed');
        }

        if (catResult.success && Array.isArray(catResult.data)) {
          const cats = [{ id: 0, name: 'Semua' }, ...catResult.data];
          setCategories(cats);
          await offlineCategories.save(cats);
        }
      } else {
        // Load from cache
        const cachedProds = await offlineProducts.loadForce();
        const cachedCats = await offlineCategories.load();
        if (cachedProds) {
          setProducts(cachedProds);
          setFiltered(cachedProds);
          setIsDemo(false);
        } else {
          setProducts(DEMO_PRODUCTS);
          setFiltered(DEMO_PRODUCTS);
          setIsDemo(true);
        }
        if (cachedCats) setCategories(cachedCats);
      }
    } catch {
      // Try cache, fallback to demo
      const cached = await offlineProducts.loadForce();
      if (cached) {
        setProducts(cached);
        setFiltered(cached);
        setIsDemo(false);
      } else {
        setProducts(DEMO_PRODUCTS);
        setFiltered(DEMO_PRODUCTS);
        setIsDemo(true);
      }
    }

    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  useEffect(() => {
    let result = [...products];
    if (selectedCategory !== 0) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) result = result.filter(p => p.category_name?.toLowerCase() === cat.name.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
      );
    }
    setFiltered(result);
  }, [searchQuery, selectedCategory, products, categories]);

  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      Alert.alert('Stok Habis', `${product.name} sedang tidak tersedia.`);
      return;
    }
    addItem(product);
    setAddedFeedback(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedFeedback(prev => ({ ...prev, [product.id]: false }));
    }, 700);
  };

  const handleOpenScanner = () => {
    navigation.navigate('BarcodeScanner', {
      onScan: async (barcode) => {
        try {
          const result = await productsAPI.getByBarcode?.(barcode) || { success: false };
          if (result.success && result.data) {
            handleAddToCart(result.data);
          } else {
            const found = products.find(p => p.barcode === barcode || p.barcode === barcode.trim());
            if (found) handleAddToCart(found);
            else Alert.alert('❌ Tidak Ditemukan', `Barcode: ${barcode}`);
          }
        } catch {
          const found = products.find(p => p.barcode === barcode);
          if (found) handleAddToCart(found);
        }
      },
    });
  };

  const s = getStyles(colors, isDark);

  const renderProduct = ({ item }) => (
    <ProductCard
      item={item}
      onPress={handleAddToCart}
      isAdded={!!addedFeedback[item.id]}
      colors={colors}
      isDark={isDark}
    />
  );

  return (
    <View style={[s.container, { backgroundColor: colors.bgDark }]}>
      {!online && !isDemo && <OfflineBanner />}

      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#12121F', '#1A1A2E'] : ['#FFFFFF', '#F8F8FF']}
        style={s.header}
      >
        <View>
          <Text style={[s.headerTitle, { color: colors.textWhite }]}>Kasir</Text>
          {isDemo && <Text style={[s.demoLabel, { color: colors.warning }]}>⚠️ Demo Mode</Text>}
          {!online && !isDemo && <Text style={[s.demoLabel, { color: colors.warning }]}>📦 Dari cache</Text>}
        </View>

        <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
          <TouchableOpacity
            style={[s.scanButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}
            onPress={handleOpenScanner}
          >
            <Ionicons name="barcode-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.cartButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Cart')}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            {totalItems > 0 && (
              <View style={[s.cartBadge, { backgroundColor: colors.danger }]}>
                <Text style={s.cartBadgeTxt}>{totalItems > 9 ? '9+' : totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: isDark ? colors.bgMedium : '#FFFFFF', borderBottomColor: colors.border }]}>
        <View style={[s.searchBar, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.textWhite }]}
            placeholder="Cari produk..."
            placeholderTextColor={colors.textDark}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter */}
      <View style={[s.catWrap, { backgroundColor: isDark ? colors.bgMedium : '#FFFFFF', borderBottomColor: colors.border }]}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <CategoryChip
              cat={item}
              active={selectedCategory === item.id}
              onPress={() => setSelectedCat(item.id)}
              colors={colors}
            />
          )}
        />
      </View>

      {/* Result count */}
      <Text style={[s.resultCount, { color: colors.textDark }]}>
        {filteredProducts.length} produk
      </Text>

      {/* Product Grid */}
      {isLoading ? (
        <View style={s.skeletonGrid}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} height={200} width={CARD_WIDTH} style={{ borderRadius: RADIUS.lg }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.productList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="search-outline" size={48} color={colors.textDark} />
              <Text style={[s.emptyTitle, { color: colors.textMuted }]}>Produk Tidak Ditemukan</Text>
              <Text style={[s.emptyTxt, { color: colors.textDark }]}>Coba kata kunci berbeda</Text>
            </View>
          }
        />
      )}

      {/* Floating Cart */}
      {totalItems > 0 && (
        <TouchableOpacity
          style={s.floatingCart}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#6C63FF', '#8B85FF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.floatingInner}
          >
            <View style={[s.floatingBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={s.floatingBadgeTxt}>{totalItems}</Text>
            </View>
            <Text style={s.floatingTxt}>Lihat Keranjang</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.xl, fontWeight: '800', letterSpacing: -0.5 },
  demoLabel: { fontSize: FONTS.xs, fontWeight: '600', marginTop: 2 },

  scanButton: {
    width: 42, height: 42, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cartButton: {
    width: 42, height: 42, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  cartBadge: {
    position: 'absolute', top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.bgDark,
  },
  cartBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  searchWrap: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    height: 44, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FONTS.md },

  catWrap: { borderBottomWidth: 1 },

  resultCount: {
    fontSize: FONTS.xs, paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm, paddingBottom: 2,
  },

  skeletonGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: SPACING.md, padding: SPACING.lg,
  },

  row: { gap: SPACING.md, justifyContent: 'flex-start' },
  productList: { padding: SPACING.lg, paddingBottom: 100 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.lg, fontWeight: '700' },
  emptyTxt: { fontSize: FONTS.sm },

  floatingCart: {
    position: 'absolute', bottom: 20,
    left: SPACING.xl, right: SPACING.xl,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    elevation: 12, shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14,
  },
  floatingInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
  },
  floatingBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  floatingBadgeTxt: { color: '#fff', fontSize: FONTS.sm, fontWeight: '800' },
  floatingTxt: { flex: 1, color: '#fff', fontSize: FONTS.md, fontWeight: '700', textAlign: 'center' },
});
