/**
 * src/screens/DashboardScreen.js — Beranda v2
 * Offline support + Dark/Light theme + improved UI
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardAPI } from '../services/api';
import {
  offlineDashboard, isOnline, pendingTransactions, syncInfo,
} from '../services/offlineService';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';
import {
  StatCard, Card, SectionTitle, EmptyState, OfflineBanner,
  Skeleton,
} from '../components/UIComponents';

const QuickActionBtn = ({ icon, label, color, onPress, badge, colors, isDark }) => (
  <TouchableOpacity style={qaS.wrap} onPress={onPress} activeOpacity={0.8}>
    <View style={[
      qaS.iconBox,
      {
        backgroundColor: isDark ? color + '18' : color + '14',
        borderColor: isDark ? color + '25' : color + '20',
        borderWidth: 1,
      }
    ]}>
      <Ionicons name={icon} size={22} color={color} />
      {badge ? (
        <View style={[qaS.badge, { backgroundColor: colors.danger }]}>
          <Text style={qaS.badgeTxt}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </View>
    <Text style={[qaS.label, { color: colors.textMuted }]}>{label}</Text>
  </TouchableOpacity>
);

const qaS = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 7, flex: 1 },
  iconBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

const LowStockItem = ({ item, colors }) => (
  <View style={[lsS.item, { borderBottomColor: colors.divider }]}>
    <View style={lsS.left}>
      <Text style={[lsS.name, { color: colors.textWhite }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[lsS.cat, { color: colors.textDark }]}>{item.category_name || 'Umum'}</Text>
    </View>
    <View style={[
      lsS.badge,
      { backgroundColor: item.stock === 0 ? colors.danger + '20' : colors.warning + '20' }
    ]}>
      <Text style={[
        lsS.badgeText,
        { color: item.stock === 0 ? colors.danger : colors.warning }
      ]}>
        {item.stock === 0 ? 'Habis' : `${item.stock}`}
      </Text>
    </View>
  </View>
);

const lsS = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  left: { flex: 1, gap: 2 },
  name: { fontSize: FONTS.sm, fontWeight: '600' },
  cat: { fontSize: 11 },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

export default function DashboardScreen({ navigation }) {
  const { user, isOwner } = useAuth();
  const { colors, isDark } = useTheme();

  const [stats, setStats]           = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline]         = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [fromCache, setFromCache]   = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDashboard = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (!stats) setIsLoading(true);

    const isConn = isOnline();
    setOnline(isConn);
    const cnt = await pendingTransactions.count();
    setPendingCount(cnt);

    if (isConn) {
      const result = await dashboardAPI.getStats();
      if (result.success) {
        setStats(result.data);
        await offlineDashboard.save(result.data);
        await syncInfo.update();
        setFromCache(false);
      } else {
        const cached = await offlineDashboard.loadForce();
        if (cached) { setStats(cached); setFromCache(true); }
      }
    } else {
      const cached = await offlineDashboard.loadForce();
      if (cached) { setStats(cached); setFromCache(true); }
    }

    setIsLoading(false);
    setRefreshing(false);

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  };

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const today = stats?.today || {};
  const month = stats?.this_month?.profit_summary || {};
  const lowStock = stats?.low_stock || [];
  const topProds = stats?.top_products || [];

  const s = getStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.bgDark }]}>
      {!online && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#12121F', '#1A1A2E'] : ['#FFFFFF', '#F8F8FF']}
          style={s.header}
        >
          <View>
            <Text style={[s.greeting, { color: colors.textWhite }]}>
              Halo, {user?.name?.split(' ')[0] || 'Kasir'} 👋
            </Text>
            <Text style={[s.date, { color: colors.textMuted }]}>
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {fromCache && (
              <View style={[s.cacheBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
                <Ionicons name="cloud-offline-outline" size={11} color={colors.warning} />
                <Text style={[s.cacheTxt, { color: colors.warning }]}>Cache</Text>
              </View>
            )}
            <View style={[s.roleBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Text style={[s.roleTxt, { color: colors.primary }]}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Today Stats */}
          <View style={s.section}>
            <SectionTitle title="📊 Hari Ini" />
            {isLoading ? (
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <Skeleton height={100} style={{ flex: 1, borderRadius: RADIUS.lg }} />
                <Skeleton height={100} style={{ flex: 1, borderRadius: RADIUS.lg }} />
              </View>
            ) : (
              <View style={s.statsRow}>
                <StatCard
                  label="Omzet"
                  value={formatCurrency(today.revenue || 0)}
                  sub={`${today.transactions || 0} transaksi`}
                  icon="trending-up-outline"
                  color={colors.primary}
                />
                <StatCard
                  label="Transaksi"
                  value={String(today.transactions || 0)}
                  sub="hari ini"
                  icon="receipt-outline"
                  color={colors.success}
                />
              </View>
            )}
          </View>

          {/* Monthly Stats — owner only */}
          {isOwner && (
            <View style={s.section}>
              <SectionTitle
                title="📅 Bulan Ini"
                action={() => navigation.navigate('Reports')}
              />
              {isLoading ? (
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  <Skeleton height={100} style={{ flex: 1, borderRadius: RADIUS.lg }} />
                  <Skeleton height={100} style={{ flex: 1, borderRadius: RADIUS.lg }} />
                </View>
              ) : (
                <View style={s.statsRow}>
                  <StatCard
                    label="Pendapatan"
                    value={formatCurrency(month.total_pendapatan || 0)}
                    icon="cash-outline"
                    color={colors.info}
                  />
                  <StatCard
                    label="Laba"
                    value={formatCurrency(month.laba_kotor || 0)}
                    icon="trending-up-outline"
                    color={colors.warning}
                  />
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={s.section}>
            <SectionTitle title="⚡ Aksi Cepat" />
            <View style={[s.qaCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={s.qaRow}>
                <QuickActionBtn icon="point-of-sale" label="Kasir" color={colors.primary} onPress={() => navigation.navigate('POS')} colors={colors} isDark={isDark} />
                <QuickActionBtn icon="receipt-outline" label="Transaksi" color={colors.success} onPress={() => navigation.navigate('Transactions')} colors={colors} isDark={isDark} />
                <QuickActionBtn icon="cube-outline" label="Produk" color={colors.info} onPress={() => navigation.navigate('Products')} colors={colors} isDark={isDark} />
                {isOwner && <QuickActionBtn icon="bar-chart-outline" label="Laporan" color="#9C27B0" onPress={() => navigation.navigate('Reports')} colors={colors} isDark={isDark} />}
              </View>
              {isOwner && (
                <View style={[s.qaRow, { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: SPACING.md }]}>
                  <QuickActionBtn icon="analytics-outline" label="Analytics" color={colors.warning} onPress={() => navigation.navigate('Analytics')} colors={colors} isDark={isDark} />
                  <QuickActionBtn icon="people-outline" label="Karyawan" color="#E91E63" onPress={() => navigation.navigate('Users')} colors={colors} isDark={isDark} />
                  <QuickActionBtn icon="archive-outline" label="Stok Masuk" color={colors.success} onPress={() => navigation.navigate('StockIn')} colors={colors} isDark={isDark} />
                  <QuickActionBtn icon="pricetag-outline" label="Promo" color="#FF6584" onPress={() => navigation.navigate('Promos')} colors={colors} isDark={isDark} />
                </View>
              )}
            </View>
          </View>

          {/* Low Stock Warning */}
          {lowStock.length > 0 && (
            <View style={s.section}>
              <SectionTitle
                title={`⚠️ Stok Rendah (${lowStock.length})`}
                action={() => navigation.navigate('Products')}
              />
              <View style={[s.listCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {lowStock.slice(0, 5).map((item, idx) => (
                  <LowStockItem key={item.id || idx} item={item} colors={colors} />
                ))}
              </View>
            </View>
          )}

          {/* Top Products */}
          {topProds.length > 0 && (
            <View style={s.section}>
              <SectionTitle title="🏆 Produk Terlaris" action={() => navigation.navigate('Analytics')} />
              <View style={[s.listCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {topProds.slice(0, 5).map((item, idx) => (
                  <View key={item.id || idx} style={[s.topItem, { borderBottomColor: colors.divider }]}>
                    <View style={[s.rankBadge, {
                      backgroundColor: idx < 3
                        ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx] + '25'
                        : colors.bgSurface,
                    }]}>
                      <Text style={[s.rankTxt, {
                        color: idx < 3
                          ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx]
                          : colors.textDark,
                      }]}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.topName, { color: colors.textWhite }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[s.topSub, { color: colors.textDark }]}>
                        Terjual: {item.total_qty} unit
                      </Text>
                    </View>
                    <Text style={[s.topRev, { color: colors.success }]}>
                      {formatCurrency(item.total_revenue || 0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Empty state */}
          {!isLoading && !stats && (
            <View style={s.section}>
              <EmptyState
                icon="cloud-offline-outline"
                title="Tidak ada data"
                subtitle="Pastikan server aktif dan koneksi internet tersedia"
                actionLabel="Coba Lagi"
                onAction={() => loadDashboard(true)}
              />
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl,
  },
  greeting: { fontSize: FONTS.xl, fontWeight: '800', letterSpacing: -0.5 },
  date: { fontSize: FONTS.sm, marginTop: 3 },
  roleBadge: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  roleTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cacheBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  cacheTxt: { fontSize: 10, fontWeight: '600' },

  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },

  qaCard: { borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  qaRow: { flexDirection: 'row', gap: SPACING.md },

  listCard: { borderRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },

  topItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: 11, borderBottomWidth: 1,
  },
  rankBadge: { width: 30, height: 30, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  rankTxt: { fontSize: FONTS.sm, fontWeight: '800' },
  topName: { fontSize: FONTS.sm, fontWeight: '600' },
  topSub: { fontSize: 11 },
  topRev: { fontSize: FONTS.sm, fontWeight: '700' },
});
