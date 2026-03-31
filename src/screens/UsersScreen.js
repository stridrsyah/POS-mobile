/**
 * src/screens/UsersScreen.js — Kelola User & Karyawan (Theme-Aware FIXED)
 * FIX: Full light mode + keyboard tidak menutup (Field di luar komponen)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usersAPI, staffAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

// ── Label & warna role ──────────────────────────────────────
const ROLE_META = {
  owner:   { label: 'Owner',   color: '#6C63FF' },
  admin:   { label: 'Admin',   color: '#DC2626' },
  manager: { label: 'Manager', color: '#D97706' },
  kasir:   { label: 'Kasir',   color: '#059669' },
  cashier: { label: 'Kasir',   color: '#059669' },
};
const getRoleMeta = (role) =>
  ROLE_META[role] || { label: (role || '').toUpperCase(), color: '#888' };

export default function UsersScreen({ navigation }) {
  const { user: currentUser, isOwner } = useAuth();
  const { colors, isDark } = useTheme();
  const ownerMode = isOwner && currentUser?.role === 'owner';

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [fName, setFName]     = useState('');
  const [fEmail, setFEmail]   = useState('');
  const [fPhone, setFPhone]   = useState('');
  const [fPass, setFPass]     = useState('');
  const [fRole, setFRole]     = useState('kasir');
  const [fActive, setFActive] = useState('1');
  const [showPass, setShowPass] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const r = ownerMode ? await staffAPI.getAll() : await usersAPI.getAll();
    if (r.success && Array.isArray(r.data)) setUsers(r.data);
    else setUsers([]);
    setIsLoading(false);
  }, [ownerMode]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openForm = (item = null) => {
    setEditItem(item);
    setFName(item?.name || '');
    setFEmail(item?.email || '');
    setFPhone(item?.phone || '');
    setFRole(item?.role || 'kasir');
    setFActive(String(item?.is_active ?? '1'));
    setFPass('');
    setShowPass(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fName.trim())  { Alert.alert('Validasi', 'Nama wajib diisi'); return; }
    if (!fEmail.trim()) { Alert.alert('Validasi', 'Email wajib diisi'); return; }
    if (!editItem && !fPass.trim()) { Alert.alert('Validasi', 'Password wajib diisi'); return; }
    if (fPass && fPass.length < 6) { Alert.alert('Validasi', 'Password minimal 6 karakter'); return; }
    setIsSaving(true);
    const data = {
      name: fName.trim(), email: fEmail.trim().toLowerCase(),
      phone: fPhone.trim(), role: ownerMode ? 'kasir' : fRole,
      is_active: parseInt(fActive),
    };
    if (fPass.trim()) data.password = fPass;
    const r = editItem
      ? (ownerMode ? await staffAPI.update(editItem.id, data) : await usersAPI.update(editItem.id, data))
      : (ownerMode ? await staffAPI.create(data) : await usersAPI.create(data));
    if (r.success) { setShowForm(false); loadData(); }
    else Alert.alert('Gagal', r.error || 'Gagal menyimpan');
    setIsSaving(false);
  };

  const handleDeactivate = (item) => {
    if (item.id === currentUser?.id) {
      Alert.alert('Tidak Bisa', 'Tidak bisa menonaktifkan akun sendiri');
      return;
    }
    Alert.alert('Nonaktifkan Akun', `Nonaktifkan "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Nonaktifkan', style: 'destructive', onPress: async () => {
        const r = ownerMode ? await staffAPI.remove(item.id) : await usersAPI.delete(item.id);
        if (r.success) loadData();
        else Alert.alert('Gagal', r.error);
      }},
    ]);
  };

  const renderItem = ({ item }) => {
    const isActive = item.is_active !== 0 && item.is_active !== '0' && item.is_active !== false;
    const { label: rLabel, color: rColor } = getRoleMeta(item.role);
    const isSelf = item.id === currentUser?.id;
    return (
      <View style={[styles.card, {
        backgroundColor: colors.bgCard,
        borderColor: colors.border,
        ...(!isActive && { opacity: 0.5 }),
        ...(!isDark && { shadowColor: '#00000012', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 }),
      }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
          <Text style={[styles.avatarTxt, { color: colors.primary }]}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textWhite }]} numberOfLines={1}>{item.name}</Text>
            {isSelf && (
              <View style={[styles.selfBadge, { backgroundColor: colors.primary + '22' }]}>
                <Text style={[styles.selfTxt, { color: colors.primary }]}>Saya</Text>
              </View>
            )}
          </View>
          <Text style={[styles.email, { color: colors.textMuted }]}>{item.email}</Text>
          {item.phone ? <Text style={[styles.phone, { color: colors.textDark }]}>{item.phone}</Text> : null}
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: rColor + '22' }]}>
              <Text style={[styles.tagTxt, { color: rColor }]}>{rLabel}</Text>
            </View>
            {!isActive && (
              <View style={[styles.tag, { backgroundColor: colors.textDark + '22' }]}>
                <Text style={[styles.tagTxt, { color: colors.textDark }]}>Nonaktif</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.acts}>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.bgSurface }]} onPress={() => openForm(item)}>
            <Ionicons name="create-outline" size={17} color={colors.info} />
          </TouchableOpacity>
          {!isSelf && isActive && (
            <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.bgSurface }]} onPress={() => handleDeactivate(item)}>
              <Ionicons name="person-remove-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const ROLE_OPTIONS = ownerMode ? [] : [
    { key: 'kasir', label: 'Kasir' },
    { key: 'manager', label: 'Manager' },
    { key: 'admin', label: 'Admin' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={[styles.header, {
        backgroundColor: colors.bgMedium,
        borderBottomColor: colors.border,
        borderBottomWidth: isDark ? 1 : 0.5,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={[styles.headerTitle, { color: colors.textWhite }]}>
            {ownerMode ? 'Kelola Karyawan' : 'Manajemen User'}
          </Text>
          {ownerMode && currentUser?.business_name ? (
            <Text style={[styles.headerBiz, { color: colors.primary }]}>{currentUser.business_name}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => openForm()}>
          <Ionicons name="person-add-outline" size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      {ownerMode && (
        <View style={[styles.banner, { backgroundColor: colors.primary + '10', borderBottomColor: colors.primary + '20' }]}>
          <Ionicons name="people-outline" size={14} color={colors.primary} />
          <Text style={[styles.bannerTxt, { color: colors.textDark }]}>
            Karyawan dapat login dan menggunakan kasir. Akses laporan & pengaturan terbatas.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => `u-${item.id}`}
          contentContainerStyle={[styles.list, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={colors.textDark} />
              <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
                {ownerMode ? 'Belum Ada Karyawan' : 'Belum Ada User'}
              </Text>
              <Text style={[styles.emptyTxt, { color: colors.textDark }]}>
                {ownerMode ? 'Tambahkan karyawan agar bisa login dan pakai kasir.' : 'Belum ada user yang terdaftar.'}
              </Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => openForm()}>
                <Ionicons name="person-add-outline" size={15} color="#fff" />
                <Text style={styles.emptyBtnTxt}>{ownerMode ? 'Tambah Karyawan' : 'Tambah User'}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal Form */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.bgDark }]} edges={['top']}>
          <View style={[styles.modalHdr, {
            backgroundColor: colors.bgMedium,
            borderBottomColor: colors.border,
            borderBottomWidth: isDark ? 1 : 0.5,
          }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textWhite }]}>
              {editItem ? (ownerMode ? 'Edit Karyawan' : 'Edit User') : (ownerMode ? 'Tambah Karyawan' : 'Tambah User')}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.saveText, { color: colors.primary }]}>Simpan</Text>}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Nama */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Nama Lengkap *</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fName} onChangeText={setFName}
                  placeholder="Contoh: Siti Rahayu" placeholderTextColor={colors.textDark}
                  blurOnSubmit={false}
                />
              </View>

              {/* Email */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Email *</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fEmail} onChangeText={setFEmail}
                  placeholder="email@contoh.com" placeholderTextColor={colors.textDark}
                  keyboardType="email-address" autoCapitalize="none" blurOnSubmit={false}
                />
              </View>

              {/* HP */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Nomor HP</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fPhone} onChangeText={setFPhone}
                  placeholder="08xxxxxxxxxx" placeholderTextColor={colors.textDark}
                  keyboardType="phone-pad" blurOnSubmit={false}
                />
              </View>

              {/* Password */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>
                  {editItem ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
                </Text>
                <View style={[styles.fiRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.fiInner, { color: colors.textWhite }]}
                    value={fPass} onChangeText={setFPass}
                    placeholder="Minimal 6 karakter" placeholderTextColor={colors.textDark}
                    secureTextEntry={!showPass} autoCapitalize="none" blurOnSubmit={false}
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 8 }}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Role */}
              {ROLE_OPTIONS.length > 0 && (
                <View style={styles.fg}>
                  <Text style={[styles.fl, { color: colors.textLight }]}>Role</Text>
                  <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    {ROLE_OPTIONS.map(({ key, label }) => {
                      const meta = getRoleMeta(key);
                      const active = fRole === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.roleChip, {
                            backgroundColor: active ? meta.color : colors.bgCard,
                            borderColor: active ? meta.color : colors.border,
                          }]}
                          onPress={() => setFRole(key)}
                        >
                          <Text style={[styles.roleChipTxt, { color: active ? '#fff' : colors.textMuted }]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Status */}
              {editItem && (
                <View style={styles.fg}>
                  <Text style={[styles.fl, { color: colors.textLight }]}>Status Akun</Text>
                  <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    {[['1', 'Aktif', colors.success], ['0', 'Nonaktif', colors.danger]].map(([v, l, c]) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.roleChip, {
                          backgroundColor: fActive === v ? c : colors.bgCard,
                          borderColor: fActive === v ? c : colors.border,
                        }]}
                        onPress={() => setFActive(v)}
                      >
                        <Text style={[styles.roleChipTxt, { color: fActive === v ? '#fff' : colors.textMuted }]}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Info akses karyawan */}
              {ownerMode && (
                <View style={[styles.accessCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <Text style={[styles.accessTitle, { color: colors.textLight }]}>Akses yang diberikan ke karyawan:</Text>
                  {[
                    [true, 'Kasir & transaksi POS'],
                    [true, 'Lihat & kelola produk dan stok'],
                    [true, 'Laporan penjualan hari ini'],
                    [false, 'Laporan keuangan & analytics'],
                    [false, 'Kelola karyawan & pengaturan'],
                  ].map(([allowed, text]) => (
                    <View key={text} style={styles.accessRow}>
                      <Ionicons name={allowed ? 'checkmark-circle' : 'close-circle'} size={14} color={allowed ? colors.success : colors.textDark} />
                      <Text style={[styles.accessTxt, { color: allowed ? colors.textLight : colors.textDark }]}>{text}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.md },
  headerMid:    { flex: 1 },
  headerTitle:  { fontSize: FONTS.lg, fontWeight: '700' },
  headerBiz:    { fontSize: FONTS.xs, marginTop: 1 },
  addBtn:       { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  banner:       { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  bannerTxt:    { flex: 1, fontSize: FONTS.xs, lineHeight: 17 },
  loading:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: SPACING.lg },
  card:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1 },
  avatar:       { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt:    { fontSize: FONTS.xl, fontWeight: '800' },
  info:         { flex: 1, gap: 3 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:         { fontSize: FONTS.md, fontWeight: '600', flex: 1 },
  selfBadge:    { borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1 },
  selfTxt:      { fontSize: 9, fontWeight: '700' },
  email:        { fontSize: FONTS.xs },
  phone:        { fontSize: FONTS.xs },
  tagRow:       { flexDirection: 'row', gap: 6, marginTop: 2 },
  tag:          { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  tagTxt:       { fontSize: 10, fontWeight: '700' },
  acts:         { flexDirection: 'column', gap: SPACING.sm, flexShrink: 0 },
  actBtn:       { padding: 9, borderRadius: RADIUS.sm },
  empty:        { alignItems: 'center', paddingTop: 60, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyTitle:   { fontSize: FONTS.lg, fontWeight: '600' },
  emptyTxt:     { fontSize: FONTS.sm, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  emptyBtnTxt:  { color: '#fff', fontSize: FONTS.sm, fontWeight: '700' },
  modal:        { flex: 1 },
  modalHdr:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  modalTitle:   { fontSize: FONTS.lg, fontWeight: '700' },
  saveText:     { fontSize: FONTS.md, fontWeight: '700' },
  modalBody:    { flex: 1, padding: SPACING.lg },
  fg:           { marginBottom: SPACING.md },
  fl:           { fontSize: FONTS.sm, marginBottom: 6, fontWeight: '500' },
  fi:           { borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md, borderWidth: 1, height: 50 },
  fiRow:        { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 50 },
  fiInner:      { flex: 1, fontSize: FONTS.md },
  roleChip:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1 },
  roleChipTxt:  { fontSize: FONTS.sm },
  accessCard:   { borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, marginTop: SPACING.sm, gap: SPACING.sm },
  accessTitle:  { fontSize: FONTS.sm, fontWeight: '500', marginBottom: 4 },
  accessRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accessTxt:    { fontSize: FONTS.xs, lineHeight: 18 },
});
