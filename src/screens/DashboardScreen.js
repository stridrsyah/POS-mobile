/**
 * src/screens/DashboardScreen.js — Beranda / Dashboard
 * ============================================================
 * Fitur:
 * - Statistik penjualan hari ini (omzet, jumlah transaksi)
 * - Info bulan ini (laba, margin)
 * - Daftar produk stok rendah
 * - Produk terlaris bulan ini
 * - Quick actions ke halaman lain
 * ============================================================
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function DashboardScreen({ navigation }) {
  const { user, isManager } = useAuth();
  const [stats, setStats]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Muat data dashboard dari API
   */
  const loadDashboard = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    const result = await dashboardAPI.getStats();
    if (result.success) {
      setStats(result.data);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  // Reload saat screen difokus
  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const today    = stats?.today || {};
  const month    = stats?.this_month?.profit_summary || {};
  const lowStock = stats?.low_stock || [];
  const topProds = stats?.top_products || [];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadDashboard(true)}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Halo, {user?.name?.split(' ')[0] || 'Kasir'} 👋
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* ── Statistik Hari Ini ── */}
      <Text style={styles.sectionTitle}>📊 Hari Ini</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
          <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
          <Text style={styles.statValue}>{formatCurrency(today.revenue || 0)}</Text>
          <Text style={styles.statLabel}>Omzet</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
          <Ionicons name="receipt-outline" size={24} color={COLORS.success} />
          <Text style={styles.statValue}>{today.transactions || 0}</Text>
          <Text style={styles.statLabel}>Transaksi</Text>
        </View>
      </View>

      {/* ── Statistik Bulan Ini (hanya manager/admin) ── */}
      {isManager && (
        <>
          <Text style={styles.sectionTitle}>📅 Bulan Ini</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: COLORS.info }]}>
              <MaterialCommunityIcons name="trending-up" size={24} color={COLORS.info} />
              <Text style={styles.statValue}>{formatCurrency(month.total_pendapatan || 0)}</Text>
              <Text style={styles.statLabel}>Pendapatan</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: COLORS.accent }]}>
              <MaterialCommunityIcons name="chart-line" size={24} color={COLORS.accent} />
              <Text style={styles.statValue}>{formatCurrency(month.laba_kotor || 0)}</Text>
              <Text style={styles.statLabel}>Laba</Text>
            </View>
          </View>
        </>
      )}

      {/* ── Quick Actions ── */}
      <Text style={styles.sectionTitle}>⚡ Aksi Cepat</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('POS')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '20' }]}>
            <MaterialCommunityIcons name="point-of-sale" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionLabel}>Kasir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Transactions')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.success + '20' }]}>
            <MaterialCommunityIcons name="invoice-text-outline" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.quickActionLabel}>Transaksi</Text>
        </TouchableOpacity>

        {isManager && (
          <>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Reports')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.info + '20' }]}>
                <Ionicons name="bar-chart-outline" size={24} color={COLORS.info} />
              </View>
              <Text style={styles.quickActionLabel}>Laporan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Analytics')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#9C27B0' + '20' }]}>
                <Ionicons name="analytics-outline" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.quickActionLabel}>Analytics</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Stok Rendah ── */}
      {lowStock.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚠️ Stok Rendah</Text>
            <Text style={styles.sectionBadge}>{lowStock.length}</Text>
          </View>
          <View style={styles.card}>
            {lowStock.slice(0, 5).map((item, idx) => (
              <View key={item.id || idx} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.listItemSub}>{item.category_name || 'Umum'}</Text>
                </View>
                <View style={[
                  styles.stockBadge,
                  { backgroundColor: item.stock === 0 ? COLORS.danger : COLORS.warning },
                ]}>
                  <Text style={styles.stockBadgeText}>
                    {item.stock === 0 ? 'Habis' : `${item.stock} ${item.unit || 'pcs'}`}
                  </Text>
                </View>
              </View>
            ))}
            {lowStock.length > 5 && (
              <Text style={styles.moreText}>+{lowStock.length - 5} produk lainnya</Text>
            )}
          </View>
        </>
      )}

      {/* ── Produk Terlaris ── */}
      {topProds.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏆 Produk Terlaris</Text>
          <View style={styles.card}>
            {topProds.map((item, idx) => (
              <View key={item.id || idx} style={styles.listItem}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.listItemSub}>Terjual: {item.total_qty} item</Text>
                </View>
                <Text style={styles.revenueText}>{formatCurrency(item.total_revenue || 0)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Jika tidak ada data */}
      {!stats && (
        <View style={styles.noData}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textDark} />
          <Text style={styles.noDataTitle}>Tidak ada data</Text>
          <Text style={styles.noDataText}>Pastikan server XAMPP aktif</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadDashboard()}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  content: { paddingBottom: 20 },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: { color: COLORS.textMuted, fontSize: FONTS.md },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.bgMedium,
  },
  greeting: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  date: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 4 },
  roleBadge: {
    backgroundColor: COLORS.primary + '22',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
  },
  roleText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },

  // Section
  sectionTitle: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.textLight,
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionBadge: {
    backgroundColor: COLORS.warning,
    color: '#fff',
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 2,
  },

  // Stat Cards
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginHorizontal: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    gap: 6,
    ...SHADOW.sm,
  },
  statValue: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginHorizontal: SPACING.xl,
  },
  quickAction: {
    alignItems: 'center',
    gap: SPACING.sm,
    width: '21%',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: FONTS.medium,
  },

  // Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.sm,
  },

  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.md,
  },
  listItemLeft: { flex: 1 },
  listItemName: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.medium },
  listItemSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },

  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  stockBadgeText: { fontSize: FONTS.xs, color: '#fff', fontWeight: FONTS.bold },

  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },

  revenueText: { fontSize: FONTS.sm, color: COLORS.success, fontWeight: FONTS.semibold },

  moreText: {
    fontSize: FONTS.xs,
    color: COLORS.textDark,
    textAlign: 'center',
    padding: SPACING.md,
  },

  // No data
  noData: {
    alignItems: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
    marginTop: SPACING.xxl,
  },
  noDataTitle: { fontSize: FONTS.lg, color: COLORS.textMuted, fontWeight: FONTS.semibold },
  noDataText: { fontSize: FONTS.md, color: COLORS.textDark, textAlign: 'center' },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  retryText: { color: '#fff', fontSize: FONTS.md, fontWeight: FONTS.bold },
});