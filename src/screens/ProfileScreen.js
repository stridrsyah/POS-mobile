/**
 * src/screens/ProfileScreen.js — Profil & Menu Role-based
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
  const { user, logout, isAdmin, isManager } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [serverUrl,    setServerUrl]    = useState('');

  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(SERVER_URL_KEY).then(saved => {
        setServerUrl(saved || DEFAULT_URL);
      });
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const roleColor = { admin: COLORS.danger, manager: COLORS.warning, kasir: COLORS.success }[user?.role] || COLORS.success;

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        setIsLoggingOut(true);
        await logout();
        setIsLoggingOut(false);
      }},
    ]);
  };

  const menuGroups = [
    {
      title: 'Laporan & Data',
      items: [
        { label: 'Laporan Penjualan',  icon: 'bar-chart-outline',   color: COLORS.primary, screen: 'Reports',   visible: isAdmin || isManager },
        { label: 'Analytics & Grafik', icon: 'analytics-outline',   color: '#9C27B0',      screen: 'Analytics', visible: isAdmin || isManager },
        { label: 'Data Pelanggan',     icon: 'people-outline',      color: COLORS.info,    screen: 'Customers', visible: true },
        { label: 'Stok Masuk',         icon: 'archive-outline',     color: COLORS.success, screen: 'StockIn',   visible: isAdmin || isManager },
        { label: 'Data Supplier',      icon: 'business-outline',    color: COLORS.warning, screen: 'Suppliers', visible: isAdmin || isManager },
      ].filter(i => i.visible),
    },
    {
      title: 'Pengaturan (Admin & Manager)',
      items: [
        { label: 'Promo & Diskon',     icon: 'pricetag-outline',       color: COLORS.primary, screen: 'Promos',          visible: isAdmin || isManager },
        { label: 'Manajemen User',     icon: 'people-circle-outline',  color: COLORS.danger,  screen: 'Users',           visible: isAdmin },
        { label: 'Pengaturan Struk',   icon: 'receipt-outline',        color: COLORS.info,    screen: 'ReceiptSettings', visible: isAdmin },
        { label: 'Manajemen Kategori', icon: 'grid-outline',           color: COLORS.warning, screen: 'Categories',      visible: isAdmin || isManager },
      ].filter(i => i.visible),
    },
  ].filter(g => g.items.length > 0);

  const shortUrl = serverUrl.replace('https://', '').replace('http://', '');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Kartu Profil */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || '-'}</Text>
            <Text style={styles.userEmail}>{user?.email || '-'}</Text>
            {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor + '50' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Server card — bisa diklik untuk ganti URL */}
        <TouchableOpacity
          style={styles.serverCard}
          onPress={() => navigation.navigate('ServerSettings')}
          activeOpacity={0.7}
        >
          <Ionicons name="server-outline" size={14} color={COLORS.textDark} />
          <Text style={styles.serverText} numberOfLines={1}>{shortUrl}</Text>
          <View style={styles.serverDot} />
          <Text style={styles.serverStatus}>Aktif</Text>
          <Ionicons name="pencil-outline" size={13} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Menu Groups */}
        {menuGroups.map(group => (
          <View key={group.title}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.menuCard}>
              {group.items.map((item, idx, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, idx < arr.length - 1 && styles.menuItemBorder]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textDark} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Tentang */}
        <Text style={styles.groupTitle}>Tentang</Text>
        <View style={styles.menuCard}>
          {[
            { l: 'Versi Aplikasi', v: '1.0.0' },
            { l: 'SDK',            v: 'Expo SDK 52' },
            { l: 'Backend',        v: 'PHP + XAMPP' },
          ].map((info, idx, arr) => (
            <View key={info.l} style={[styles.infoItem, idx < arr.length - 1 && styles.menuItemBorder]}>
              <Text style={styles.infoLabel}>{info.l}</Text>
              <Text style={styles.infoValue}>{info.v}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>{isLoggingOut ? 'Keluar...' : 'Logout'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bgDark },
  header:      { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, margin: SPACING.lg,
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  avatarCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: FONTS.xxl, fontWeight: FONTS.black, color: '#fff' },
  profileInfo:  { flex: 1, gap: 2 },
  userName:     { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  userEmail:    { fontSize: FONTS.sm, color: COLORS.textMuted },
  userPhone:    { fontSize: FONTS.sm, color: COLORS.textDark },
  roleBadge:    { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  roleText:     { fontSize: FONTS.xs, fontWeight: FONTS.bold },

  serverCard:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  serverText:   { fontSize: FONTS.xs, color: COLORS.textDark, flex: 1 },
  serverDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  serverStatus: { fontSize: FONTS.xs, color: COLORS.success, fontWeight: FONTS.medium },

  groupTitle:     { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textDark, marginHorizontal: SPACING.xl, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard:       { backgroundColor: COLORS.bgCard, marginHorizontal: SPACING.lg, marginBottom: SPACING.xl, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOW.sm },
  menuItem:       { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuIcon:       { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel:      { flex: 1, fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.medium },

  infoItem:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg },
  infoLabel:  { fontSize: FONTS.md, color: COLORS.textMuted },
  infoValue:  { fontSize: FONTS.sm, color: COLORS.textDark },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, backgroundColor: COLORS.danger + '15', borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.danger + '40' },
  logoutText: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.danger },
});