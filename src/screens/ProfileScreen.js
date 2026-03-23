/**
 * src/screens/ProfileScreen.js — Profil & Menu
 * Sistem 2 role: isOwner = akses penuh, bukan owner = kasir (terbatas)
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL_KEY, DEFAULT_URL } from './ServerSettingsScreen';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, isOwner } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(SERVER_URL_KEY).then((s) => setServerUrl(s || DEFAULT_URL));
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

  // ── Menu groups ──────────────────────────────────────────
  const menuGroups = [
    // Owner: semua menu lengkap
    isOwner && {
      title: 'Manajemen Bisnis',
      items: [
        { label: 'Kelola Karyawan', icon: 'people-outline', color: COLORS.primary, screen: 'Users', desc: 'Tambah & atur akun karyawan' },
        { label: 'Laporan Penjualan', icon: 'bar-chart-outline', color: '#9C27B0', screen: 'Reports', desc: 'Ringkasan omzet & transaksi' },
        { label: 'Analytics & Grafik', icon: 'analytics-outline', color: COLORS.info, screen: 'Analytics', desc: 'Tren penjualan & jam tersibuk' },
      ],
    },
    isOwner && {
      title: 'Data & Stok',
      items: [
        { label: 'Data Pelanggan', icon: 'person-outline', color: COLORS.info, screen: 'Customers', desc: 'Daftar & riwayat pelanggan' },
        { label: 'Stok Masuk', icon: 'archive-outline', color: COLORS.success, screen: 'StockIn', desc: 'Catat penambahan stok' },
        { label: 'Data Supplier', icon: 'business-outline', color: COLORS.warning, screen: 'Suppliers', desc: 'Kelola pemasok produk' },
      ],
    },
    isOwner && {
      title: 'Pengaturan',
      items: [
        { label: 'Promo & Diskon', icon: 'pricetag-outline', color: COLORS.primary, screen: 'Promos', desc: 'Buat voucher & diskon' },
        { label: 'Kategori Produk', icon: 'grid-outline', color: COLORS.warning, screen: 'Categories', desc: 'Kelola kategori produk' },
        { label: 'Pengaturan Struk', icon: 'receipt-outline', color: COLORS.info, screen: 'ReceiptSettings', desc: 'Template & info toko di struk' },
      ],
    },

    // Kasir: hanya menu operasional terbatas
    !isOwner && {
      title: 'Menu',
      items: [
        { label: 'Data Pelanggan', icon: 'person-outline', color: COLORS.info, screen: 'Customers', desc: 'Daftar pelanggan' },
      ],
    },
  ].filter(Boolean);

  const roleLabel = isOwner ? 'Owner' : 'Kasir';
  const roleColor = isOwner ? COLORS.primary : COLORS.success;
  const shortUrl = (serverUrl).replace(/^https?:\/\//, '').split('/')[0];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Kartu Profil ── */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.userName}>{user?.name || '-'}</Text>
            {isOwner && user?.business_name ? (
              <Text style={s.bizName}>🏪 {user.business_name}</Text>
            ) : null}
            <Text style={s.userEmail}>{user?.email || '-'}</Text>
            {user?.phone ? <Text style={s.userPhone}>{user.phone}</Text> : null}
          </View>
          <View style={[s.roleBadge, { backgroundColor: roleColor + '22', borderColor: roleColor + '55' }]}>
            <Text style={[s.roleTxt, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* ── Info Server ── */}
        <TouchableOpacity
          style={s.serverCard}
          onPress={() => navigation.navigate('ServerSettings')}
          activeOpacity={0.7}
        >
          <Ionicons name="server-outline" size={13} color={COLORS.textDark} />
          <Text style={s.serverTxt} numberOfLines={1}>{shortUrl}</Text>
          <View style={s.dot} />
          <Text style={s.serverStatus}>Terhubung</Text>
          <Ionicons name="pencil-outline" size={13} color={COLORS.primary} />
        </TouchableOpacity>

        {/* ── Menu Groups ── */}
        {menuGroups.map((group) => (
          <View key={group.title}>
            <Text style={s.groupTitle}>{group.title}</Text>
            <View style={s.menuCard}>
              {group.items.map((item, idx, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.menuItem, idx < arr.length - 1 && s.menuBorder]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[s.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={s.menuText}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    {item.desc ? <Text style={s.menuDesc}>{item.desc}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={COLORS.textDark} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── Tentang ── */}
        <Text style={s.groupTitle}>Tentang Aplikasi</Text>
        <View style={s.menuCard}>
          {[
            { l: 'Aplikasi', v: 'KasirPOS' },
            { l: 'Versi', v: '1.0.0' },
            { l: 'Platform', v: 'React Native + Expo' },
          ].map((info, idx, arr) => (
            <View key={info.l} style={[s.infoItem, idx < arr.length - 1 && s.menuBorder]}>
              <Text style={s.infoLabel}>{info.l}</Text>
              <Text style={s.infoValue}>{info.v}</Text>
            </View>
          ))}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={s.logoutTxt}>{isLoggingOut ? 'Sedang keluar...' : 'Logout'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, margin: SPACING.lg, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: FONTS.xxl, fontWeight: FONTS.black, color: '#fff' },
  profileInfo: { flex: 1, gap: 2 },
  userName: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  bizName: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.medium },
  userEmail: { fontSize: FONTS.sm, color: COLORS.textMuted },
  userPhone: { fontSize: FONTS.xs, color: COLORS.textDark },
  roleBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, flexShrink: 0 },
  roleTxt: { fontSize: FONTS.xs, fontWeight: FONTS.bold },

  serverCard: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  serverTxt: { fontSize: FONTS.xs, color: COLORS.textDark, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, flexShrink: 0 },
  serverStatus: { fontSize: FONTS.xs, color: COLORS.success, fontWeight: FONTS.medium },

  groupTitle: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textDark, marginHorizontal: SPACING.xl, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  menuCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SPACING.lg, marginBottom: SPACING.xl, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOW.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.medium },
  menuDesc: { fontSize: FONTS.xs, color: COLORS.textDark, marginTop: 1 },

  infoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg },
  infoLabel: { fontSize: FONTS.md, color: COLORS.textMuted },
  infoValue: { fontSize: FONTS.sm, color: COLORS.textDark },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, backgroundColor: COLORS.danger + '15', borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.danger + '40' },
  logoutTxt: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.danger },
});