/**
 * src/screens/ProfileScreen.js — Profil & Pengaturan v2
 * Dark/Light mode toggle + Offline settings + improved UI
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  isOnline, syncInfo, pendingTransactions,
  clearAllCache, getCacheSize,
} from '../services/offlineService';
import { SERVER_URL_KEY, DEFAULT_URL } from './ServerSettingsScreen';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { Avatar, Chip, Button } from '../components/UIComponents';

const ThemeToggle = ({ isDark, toggleTheme, colors }) => {
  const anim = React.useRef(new Animated.Value(isDark ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: isDark ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isDark]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#D0D0E8', '#6C63FF'],
  });

  return (
    <TouchableOpacity onPress={toggleTheme} activeOpacity={0.8}>
      <Animated.View style={[tgS.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[tgS.thumb, { transform: [{ translateX }] }]}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={12} color={isDark ? '#6C63FF' : '#F59E0B'} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const tgS = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
});

export default function ProfileScreen({ navigation }) {
  const { user, logout, isOwner } = useAuth();
  const { isDark, colors, toggleTheme, setTheme, themeMode } = useTheme();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [serverUrl, setServerUrl]     = useState('');
  const [online, setOnline]           = useState(true);
  const [lastSync, setLastSync]       = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [cacheSize, setCacheSize]     = useState('');
  const [isSyncing, setIsSyncing]     = useState(false);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
      setServerUrl(saved || DEFAULT_URL);
      setOnline(isOnline());
      const label = await syncInfo.getLabel();
      setLastSync(label);
      const cnt = await pendingTransactions.count();
      setPendingCount(cnt);
      const sz = await getCacheSize();
      setCacheSize(sz);
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert('Keluar dari Akun', 'Yakin ingin logout?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          await logout();
          setIsLoggingOut(false);
        },
      },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Hapus Cache',
      `Data offline (${cacheSize}) akan dihapus. Transaksi pending tidak akan terhapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            await clearAllCache();
            const sz = await getCacheSize();
            setCacheSize(sz);
            Alert.alert('Cache dihapus', 'Akan diunduh ulang saat online.');
          },
        },
      ]
    );
  };

  const roleLabel = isOwner ? 'Owner' : 'Kasir';
  const roleColor = isOwner ? colors.primary : colors.success;
  const shortUrl = (serverUrl).replace(/^https?:\/\//, '').split('/')[0];

  const menuGroups = [
    isOwner && {
      title: 'Manajemen Bisnis',
      items: [
        { label: 'Kelola Karyawan', icon: 'people-outline', color: colors.primary, screen: 'Users', desc: 'Tambah & atur akun karyawan' },
        { label: 'Laporan Penjualan', icon: 'bar-chart-outline', color: '#9C27B0', screen: 'Reports', desc: 'Ringkasan omzet & transaksi' },
        { label: 'Analytics & Grafik', icon: 'analytics-outline', color: colors.info, screen: 'Analytics', desc: 'Tren penjualan & jam tersibuk' },
      ],
    },
    isOwner && {
      title: 'Data & Stok',
      items: [
        { label: 'Data Pelanggan', icon: 'person-outline', color: colors.info, screen: 'Customers', desc: 'Daftar & riwayat pelanggan' },
        { label: 'Stok Masuk', icon: 'archive-outline', color: colors.success, screen: 'StockIn', desc: 'Catat penambahan stok' },
        { label: 'Data Supplier', icon: 'business-outline', color: colors.warning, screen: 'Suppliers', desc: 'Kelola pemasok produk' },
      ],
    },
    isOwner && {
      title: 'Pengaturan',
      items: [
        { label: 'Promo & Diskon', icon: 'pricetag-outline', color: colors.primary, screen: 'Promos', desc: 'Buat voucher & diskon' },
        { label: 'Kategori Produk', icon: 'grid-outline', color: colors.warning, screen: 'Categories', desc: 'Kelola kategori produk' },
        { label: 'Pengaturan Struk', icon: 'receipt-outline', color: colors.info, screen: 'ReceiptSettings', desc: 'Template & info toko' },
        { label: 'Printer Bluetooth', icon: 'print-outline', color: '#E91E63', screen: 'PrinterSettings', desc: 'Hubungkan printer thermal' },
      ],
    },
    !isOwner && {
      title: 'Menu',
      items: [
        { label: 'Data Pelanggan', icon: 'person-outline', color: colors.info, screen: 'Customers', desc: 'Daftar pelanggan' },
      ],
    },
  ].filter(Boolean);

  const s = getStyles(colors);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.textWhite }]}>Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Profile Card */}
        <LinearGradient
          colors={isDark
            ? ['#1A1A2E', '#252540']
            : ['#F8F8FF', '#FFFFFF']}
          style={[s.profileCard, { borderColor: colors.border }]}
        >
          <View style={[s.profileBg, { backgroundColor: colors.primary + '10' }]} />
          <View style={s.profileInner}>
            <View style={[s.avatarWrap, { backgroundColor: colors.primary }]}>
              <Text style={s.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={[s.userName, { color: colors.textWhite }]}>{user?.name || '-'}</Text>
              {isOwner && user?.business_name ? (
                <Text style={[s.bizName, { color: colors.primary }]}>🏪 {user.business_name}</Text>
              ) : null}
              <Text style={[s.userEmail, { color: colors.textMuted }]}>{user?.email || '-'}</Text>
            </View>
            <View style={[s.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor + '50' }]}>
              <Text style={[s.roleTxt, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>

          {/* Status row */}
          <View style={[s.statusRow, { borderTopColor: colors.border }]}>
            <View style={s.statusItem}>
              <View style={[s.statusDot, { backgroundColor: online ? colors.success : colors.warning }]} />
              <Text style={[s.statusTxt, { color: colors.textMuted }]}>
                {online ? 'Online' : 'Offline'}
              </Text>
            </View>
            {pendingCount > 0 && (
              <View style={s.statusItem}>
                <Ionicons name="cloud-upload-outline" size={13} color={colors.warning} />
                <Text style={[s.statusTxt, { color: colors.warning }]}>
                  {pendingCount} pending
                </Text>
              </View>
            )}
            <Text style={[s.statusTxt, { color: colors.textDark }]}>Sync: {lastSync}</Text>
          </View>
        </LinearGradient>

        {/* Appearance & Theme */}
        <Text style={[s.sectionLabel, { color: colors.textDark }]}>TAMPILAN</Text>
        <View style={[s.menuCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[s.menuItem, { borderBottomColor: colors.divider }]}>
            <View style={[s.menuIcon, { backgroundColor: '#6C63FF20' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primary} />
            </View>
            <View style={s.menuText}>
              <Text style={[s.menuLabel, { color: colors.textWhite }]}>Mode Tampilan</Text>
              <Text style={[s.menuDesc, { color: colors.textDark }]}>
                {isDark ? '🌙 Gelap' : '☀️ Terang'}
              </Text>
            </View>
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} colors={colors} />
          </View>
          <TouchableOpacity
            style={s.menuItem}
            onPress={() => navigation.navigate('ServerSettings')}
          >
            <View style={[s.menuIcon, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="server-outline" size={20} color={colors.info} />
            </View>
            <View style={s.menuText}>
              <Text style={[s.menuLabel, { color: colors.textWhite }]}>Server</Text>
              <Text style={[s.menuDesc, { color: colors.textDark }]} numberOfLines={1}>{shortUrl}</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Offline Settings */}
        <Text style={[s.sectionLabel, { color: colors.textDark }]}>OFFLINE & CACHE</Text>
        <View style={[s.menuCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[s.menuItem, { borderBottomColor: colors.divider }]}>
            <View style={[s.menuIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="cloud-done-outline" size={20} color={colors.success} />
            </View>
            <View style={s.menuText}>
              <Text style={[s.menuLabel, { color: colors.textWhite }]}>Cache Lokal</Text>
              <Text style={[s.menuDesc, { color: colors.textDark }]}>{cacheSize} tersimpan</Text>
            </View>
            <TouchableOpacity
              style={[s.smallBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40' }]}
              onPress={handleClearCache}
            >
              <Text style={{ fontSize: 11, color: colors.danger, fontWeight: '600' }}>Hapus</Text>
            </TouchableOpacity>
          </View>
          {pendingCount > 0 && (
            <View style={[s.menuItem, { borderBottomColor: colors.divider }]}>
              <View style={[s.menuIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.warning} />
              </View>
              <View style={s.menuText}>
                <Text style={[s.menuLabel, { color: colors.textWhite }]}>Transaksi Pending</Text>
                <Text style={[s.menuDesc, { color: colors.warning }]}>{pendingCount} menunggu sync</Text>
              </View>
            </View>
          )}
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: colors.textDark + '20' }]}>
              <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            </View>
            <View style={s.menuText}>
              <Text style={[s.menuLabel, { color: colors.textWhite }]}>Terakhir Sync</Text>
              <Text style={[s.menuDesc, { color: colors.textDark }]}>{lastSync}</Text>
            </View>
          </View>
        </View>

        {/* Menu Groups */}
        {menuGroups.map((group) => (
          <View key={group.title}>
            <Text style={[s.sectionLabel, { color: colors.textDark }]}>{group.title.toUpperCase()}</Text>
            <View style={[s.menuCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {group.items.map((item, idx, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.menuItem, idx < arr.length - 1 && { borderBottomColor: colors.divider }]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[s.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={s.menuText}>
                    <Text style={[s.menuLabel, { color: colors.textWhite }]}>{item.label}</Text>
                    {item.desc ? <Text style={[s.menuDesc, { color: colors.textDark }]}>{item.desc}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.textDark} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* About */}
        <Text style={[s.sectionLabel, { color: colors.textDark }]}>TENTANG</Text>
        <View style={[s.menuCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {[
            { l: 'Aplikasi', v: 'KasirPOS' },
            { l: 'Versi', v: '2.0.0' },
            { l: 'Developer', v: 'AprilTech' },
            { l: 'Platform', v: 'React Native + Expo' },
          ].map((info, idx, arr) => (
            <View
              key={info.l}
              style={[s.infoItem, idx < arr.length - 1 && { borderBottomColor: colors.divider }]}
            >
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>{info.l}</Text>
              <Text style={[s.infoValue, { color: info.l === 'Developer' ? colors.primary : colors.textDark }]}>
                {info.v}
              </Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[s.logoutBtn, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[s.logoutTxt, { color: colors.danger }]}>
            {isLoggingOut ? 'Sedang keluar...' : 'Logout'}
          </Text>
        </TouchableOpacity>

        {/* AprilTech footer watermark */}
        <View style={s.footerBrand}>
          <Text style={[s.footerText, { color: colors.textHint }]}>Powered by</Text>
          <Text style={[s.footerBrandName, { color: colors.primary + 'AA' }]}>AprilTech</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: FONTS.xl, fontWeight: '800' },

  profileCard: {
    margin: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1,
    overflow: 'hidden', position: 'relative',
  },
  profileBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
  profileInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, paddingTop: SPACING.xl },
  avatarWrap: {
    width: 58, height: 58, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt: { fontSize: 24, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1, gap: 2 },
  userName: { fontSize: FONTS.lg, fontWeight: '800' },
  bizName: { fontSize: FONTS.xs, fontWeight: '600' },
  userEmail: { fontSize: FONTS.sm },
  roleBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, flexShrink: 0 },
  roleTxt: { fontSize: FONTS.xs, fontWeight: '800', letterSpacing: 0.5 },

  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: SPACING.lg, paddingVertical: 10, borderTopWidth: 1,
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontSize: 11, fontWeight: '500' },

  sectionLabel: {
    fontSize: FONTS.xs, fontWeight: '700', marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm, marginTop: SPACING.xl,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  menuCard: {
    marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl,
    borderWidth: 1, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, gap: SPACING.md, borderBottomWidth: 1,
  },
  menuIcon: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: FONTS.md, fontWeight: '600' },
  menuDesc: { fontSize: FONTS.xs, marginTop: 1 },
  smallBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },

  infoItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1,
  },
  infoLabel: { fontSize: FONTS.md },
  infoValue: { fontSize: FONTS.sm, fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, marginHorizontal: SPACING.lg, marginTop: SPACING.xl,
    borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1,
  },
  logoutTxt: { fontSize: FONTS.md, fontWeight: '700' },

  footerBrand: { alignItems: 'center', paddingVertical: SPACING.xl, gap: 2 },
  footerText: { fontSize: 10, fontWeight: '500', letterSpacing: 1 },
  footerBrandName: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
