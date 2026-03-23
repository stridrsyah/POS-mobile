/**
 * src/screens/PosScreen.js — Halaman Kasir (Point of Sale)
 * ============================================================
 * Fitur:
 * - Grid produk 2 kolom dengan filter kategori
 * - Search produk berdasarkan nama
 * - 📷 Scan Barcode via kamera (buka BarcodeScannerScreen)
 * - Tambah produk ke keranjang dengan feedback visual
 * - Badge jumlah item di tombol keranjang
 * - Floating button keranjang saat ada item
 * - Demo data jika server tidak tersedia
 * ============================================================
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Dimensions,
  StyleSheet, ActivityIndicator, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { productsAPI, categoriesAPI, getImageUrl } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// ── Data Demo (fallback jika server tidak tersedia) ──────────
const DEMO_PRODUCTS = [
  { id: 1, name: 'Nasi Goreng Spesial', category_name: 'Makanan', selling_price: 25000, stock: 50, barcode: '001' },
  { id: 2, name: 'Mie Goreng', category_name: 'Makanan', selling_price: 20000, stock: 30, barcode: '002' },
  { id: 3, name: 'Es Teh Manis', category_name: 'Minuman', selling_price: 5000, stock: 100, barcode: '003' },
  { id: 4, name: 'Jus Alpukat', category_name: 'Minuman', selling_price: 15000, stock: 25, barcode: '004' },
  { id: 5, name: 'Sate Ayam 10pcs', category_name: 'Makanan', selling_price: 30000, stock: 20, barcode: '005' },
  { id: 6, name: 'Bakso Kuah', category_name: 'Makanan', selling_price: 22000, stock: 40, barcode: '006' },
  { id: 7, name: 'Air Mineral 600ml', category_name: 'Minuman', selling_price: 4000, stock: 200, barcode: '007' },
  { id: 8, name: 'Kopi Hitam', category_name: 'Minuman', selling_price: 8000, stock: 60, barcode: '008' },
  { id: 9, name: 'Roti Bakar', category_name: 'Snack', selling_price: 18000, stock: 15, barcode: '009' },
  { id: 10, name: 'Keripik Singkong', category_name: 'Snack', selling_price: 10000, stock: 45, barcode: '010' },
];

const DEMO_CATEGORIES = [
  { id: 0, name: 'Semua' },
  { id: 1, name: 'Makanan' },
  { id: 2, name: 'Minuman' },
  { id: 3, name: 'Snack' },
];

export default function PosScreen({ navigation }) {
  const { addItem, totalItems } = useCart();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(0); // 0 = Semua
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false); // Apakah pakai data demo?
  const [addedFeedback, setAddedFeedback] = useState({}); // Animasi saat tambah ke cart

  /**
   * Muat produk dan kategori dari API
   */
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Muat produk dan kategori secara paralel
      const [prodResult, catResult] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);

      if (prodResult.success && Array.isArray(prodResult.data)) {
        setProducts(prodResult.data);
        setFilteredProducts(prodResult.data);
        setIsDemo(false);
      } else {
        // Fallback ke data demo jika API gagal
        setProducts(DEMO_PRODUCTS);
        setFilteredProducts(DEMO_PRODUCTS);
        setIsDemo(true);
      }

      if (catResult.success && Array.isArray(catResult.data)) {
        setCategories([{ id: 0, name: 'Semua' }, ...catResult.data]);
      }
    } catch {
      setProducts(DEMO_PRODUCTS);
      setFilteredProducts(DEMO_PRODUCTS);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload saat halaman difokus (misal setelah kembali dari cart)
  useFocusEffect(useCallback(() => { loadData(); }, []));

  /**
   * Filter produk saat searchQuery atau selectedCategory berubah
   */
  useEffect(() => {
    let result = [...products];

    // Filter berdasarkan kategori
    if (selectedCategory !== 0) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        result = result.filter(p =>
          p.category_name?.toLowerCase() === cat.name.toLowerCase()
        );
      }
    }

    // Filter berdasarkan teks
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
      );
    }

    setFilteredProducts(result);
  }, [searchQuery, selectedCategory, products, categories]);

  /**
   * Tambahkan produk ke keranjang dengan feedback visual
   */
  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      Alert.alert('Stok Habis', `${product.name} sedang tidak tersedia.`);
      return;
    }

    addItem(product);

    // Tampilkan tanda centang ✓ selama 800ms di kartu produk
    setAddedFeedback(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedFeedback(prev => ({ ...prev, [product.id]: false }));
    }, 800);
  };

  /**
   * Buka scanner barcode kamera
   * Callback onScan akan dipanggil saat barcode berhasil terdeteksi
   */
  const handleOpenScanner = () => {
    navigation.navigate('BarcodeScanner', {
      onScan: async (barcode) => {
        // Cari produk berdasarkan barcode yang di-scan
        try {
          const result = await productsAPI.searchByBarcode(barcode);
          if (result.success && result.data) {
            // Produk ditemukan → langsung tambah ke cart
            handleAddToCart(result.data);
            Alert.alert(
              '✅ Produk Ditambahkan',
              `${result.data.name}\n${formatCurrency(result.data.selling_price)}`,
              [{ text: 'OK' }]
            );
          } else {
            // Coba cari secara manual di produk yang sudah dimuat
            const found = products.find(p =>
              p.barcode === barcode || p.barcode === barcode.trim()
            );
            if (found) {
              handleAddToCart(found);
            } else {
              Alert.alert(
                '❌ Barcode Tidak Ditemukan',
                `Barcode: ${barcode}\n\nProduk dengan barcode ini tidak ada di database.`,
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          // Jika API error, cari lokal
          const found = products.find(p => p.barcode === barcode);
          if (found) {
            handleAddToCart(found);
          } else {
            Alert.alert('Error', `Tidak bisa mencari barcode: ${barcode}`);
          }
        }
      },
    });
  };

  /**
   * Render kartu produk di grid
   */
  const renderProduct = ({ item }) => {
    const isJustAdded = addedFeedback[item.id];
    const isOutOfStock = item.stock <= 0;
    const imageUri = getImageUrl(item);

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isOutOfStock && styles.productCardDisabled,
          isJustAdded && styles.productCardAdded,
        ]}
        onPress={() => handleAddToCart(item)}
        disabled={isOutOfStock}
        activeOpacity={0.8}
      >
        {/* Foto produk atau placeholder */}
        <View style={styles.productImageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={28} color={COLORS.textDark} />
            </View>
          )}

          {/* Badge stok habis */}
          {isOutOfStock && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>Habis</Text>
            </View>
          )}

          {/* Badge stok sedikit */}
          {!isOutOfStock && item.stock <= 5 && (
            <View style={[styles.stockBadge, { backgroundColor: COLORS.warning }]}>
              <Text style={styles.stockBadgeText}>Sisa {item.stock}</Text>
            </View>
          )}
        </View>

        {/* Info produk */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category_name || 'Umum'}</Text>
          <Text style={styles.productPrice}>{formatCurrency(item.selling_price)}</Text>
        </View>

        {/* Tombol tambah / centang feedback */}
        <View style={[styles.addButton, isJustAdded && styles.addButtonSuccess]}>
          <Ionicons
            name={isJustAdded ? 'checkmark' : 'add'}
            size={18}
            color={COLORS.textWhite}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kasir</Text>
          {isDemo && (
            <Text style={styles.demoLabel}>⚠️ Mode Demo (Server offline)</Text>
          )}
        </View>
        {/* Tombol keranjang dengan badge */}
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Ionicons name="cart" size={22} color="#fff" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search Bar + Tombol Scanner ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama produk..."
            placeholderTextColor={COLORS.textDark}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tombol buka kamera scan barcode */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleOpenScanner}
          activeOpacity={0.8}
        >
          <Ionicons name="barcode-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Filter Kategori ── */}
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.categoryList}
        style={styles.categoryScroll}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item.id)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === item.id && styles.categoryChipTextActive,
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Jumlah hasil pencarian */}
      <Text style={styles.resultCount}>
        {filteredProducts.length} produk ditemukan
      </Text>

      {/* ── Grid Produk ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat produk...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={COLORS.textDark} />
              <Text style={styles.emptyTitle}>Produk Tidak Ditemukan</Text>
              <Text style={styles.emptyText}>
                Coba kata kunci berbeda atau scan barcode produk
              </Text>
            </View>
          }
        />
      )}

      {/* ── Floating Button Keranjang ── */}
      {totalItems > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.9}
        >
          <View style={styles.floatingCartBadge}>
            <Text style={styles.floatingCartBadgeText}>{totalItems}</Text>
          </View>
          <Text style={styles.floatingCartText}>Lihat Keranjang</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgMedium,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textWhite,
  },
  demoLabel: {
    fontSize: FONTS.xs,
    color: COLORS.warning,
    marginTop: 2,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.bgMedium,
  },
  cartBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },

  // ── Search ──
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgMedium,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: FONTS.md,
  },
  // Tombol scan barcode (kotak ungu di sebelah search)
  scanButton: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },

  // ── Kategori ──
  categoryScroll: {
    backgroundColor: COLORS.bgMedium,
    maxHeight: 60,
    flexShrink: 0,
  },
  categoryList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  resultCount: {
    fontSize: FONTS.xs,
    color: COLORS.textDark,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: 4,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONTS.md,
  },

  // ── Grid Produk ──
  productList: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  row: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
    justifyContent: 'flex-start',
  },
  productCard: {
    width: (Dimensions.get('window').width - (SPACING.lg * 2) - SPACING.md) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productCardAdded: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },
  productImageContainer: {
    height: 100,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.bgMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stockBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  productInfo: {
    padding: SPACING.sm,
    gap: 2,
  },
  productName: {
    fontSize: FONTS.sm,
    color: COLORS.textWhite,
    fontWeight: FONTS.semibold,
    lineHeight: 18,
  },
  productCategory: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  productPrice: {
    fontSize: FONTS.md,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
    marginTop: 2,
  },
  addButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonSuccess: {
    backgroundColor: COLORS.success,
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.lg,
    fontWeight: FONTS.semibold,
  },
  emptyText: {
    color: COLORS.textDark,
    fontSize: FONTS.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // ── Floating Cart Button ──
  floatingCart: {
    position: 'absolute',
    bottom: 20,
    left: SPACING.xl,
    right: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOW.lg,
  },
  floatingCartBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  floatingCartBadgeText: {
    color: '#fff',
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
  },
  floatingCartText: {
    flex: 1,
    color: '#fff',
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
    textAlign: 'center',
  },
});