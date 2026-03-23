/**
 * src/screens/UsersScreen.js — Kelola User & Karyawan
 *
 * Sistem 2 role:
 *   OWNER MODE  → header nama bisnis, load /staff, hanya tambah kasir
 *   ADMIN MODE  → load /users, bisa pilih role (kasir/manager/admin)
 *     (admin mode untuk backward compat dengan akun lama)
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
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

// ── Field form (di luar agar keyboard tidak menutup) ────────
const Field = ({ label, value, onChangeText, keyboard = 'default', placeholder, secure, showToggle, toggleState, onToggle }) => (
  <View style={fs.group}>
    <Text style={fs.label}>{label}</Text>
    <View style={fs.row}>
      <TextInput
        style={fs.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDark}
        secureTextEntry={secure && !toggleState}
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={{ padding: 8 }}>
          <Ionicons
            name={toggleState ? 'eye-off-outline' : 'eye-outline'}
            size={17} color={COLORS.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);
const fs = StyleSheet.create({
  group: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sm, color: COLORS.textLight, marginBottom: 6, fontWeight: '500' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 50,
  },
  input: { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },
});

// ── Label & warna role ──────────────────────────────────────
const ROLE_META = {
  owner: { label: 'Owner', color: COLORS.primary },
  admin: { label: 'Admin', color: COLORS.danger },
  manager: { label: 'Manager', color: COLORS.warning },
  kasir: { label: 'Kasir', color: COLORS.success },
  cashier: { label: 'Kasir', color: COLORS.success },
};
const getRoleMeta = (role) =>
  ROLE_META[role] || { label: (role || '').toUpperCase(), color: COLORS.textMuted };

// ── Komponen Utama ──────────────────────────────────────────
export default function UsersScreen({ navigation }) {
  const { user: currentUser, isOwner } = useAuth();

  // Owner murni pakai mode terbatas
  // Admin/manager lama (backward compat) pakai mode penuh
  const ownerMode = isOwner && currentUser?.role === 'owner';

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fPass, setFPass] = useState('');
  const [fRole, setFRole] = useState('kasir');
  const [fActive, setFActive] = useState('1');
  const [showPass, setShowPass] = useState(false);

  // ── Load ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const r = ownerMode ? await staffAPI.getAll() : await usersAPI.getAll();
    if (r.success && Array.isArray(r.data)) setUsers(r.data);
    else setUsers([]);
    setIsLoading(false);
  }, [ownerMode]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Buka form ────────────────────────────────────────────
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

  // ── Simpan ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!fName.trim()) { Alert.alert('Validasi', 'Nama wajib diisi'); return; }
    if (!fEmail.trim()) { Alert.alert('Validasi', 'Email wajib diisi'); return; }
    if (!editItem && !fPass.trim()) { Alert.alert('Validasi', 'Password wajib diisi'); return; }
    if (fPass && fPass.length < 6) { Alert.alert('Validasi', 'Password minimal 6 karakter'); return; }

    setIsSaving(true);
    const data = {
      name: fName.trim(),
      email: fEmail.trim().toLowerCase(),
      phone: fPhone.trim(),
      role: ownerMode ? 'kasir' : fRole,
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

  // ── Nonaktifkan ──────────────────────────────────────────
  const handleDeactivate = (item) => {
    if (item.id === currentUser?.id) {
      Alert.alert('Tidak Bisa', 'Tidak bisa menonaktifkan akun sendiri');
      return;
    }
    Alert.alert(
      'Nonaktifkan Akun',
      `Nonaktifkan "${item.name}"? Data transaksi tetap tersimpan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Nonaktifkan', style: 'destructive',
          onPress: async () => {
            const r = ownerMode
              ? await staffAPI.remove(item.id)
              : await usersAPI.delete(item.id);
            if (r.success) loadData();
            else Alert.alert('Gagal', r.error);
          },
        },
      ]
    );
  };

  // ── Render item ──────────────────────────────────────────
  const renderItem = ({ item }) => {
    const isActive = item.is_active !== 0 && item.is_active !== '0' && item.is_active !== false;
    const { label: rLabel, color: rColor } = getRoleMeta(item.role);
    const isSelf = item.id === currentUser?.id;

    return (
      <View style={[styles.card, !isActive && styles.cardDim]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {isSelf && <View style={styles.selfBadge}><Text style={styles.selfTxt}>Saya</Text></View>}
          </View>
          <Text style={styles.email}>{item.email}</Text>
          {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: rColor + '22' }]}>
              <Text style={[styles.tagTxt, { color: rColor }]}>{rLabel}</Text>
            </View>
            {!isActive && (
              <View style={[styles.tag, { backgroundColor: COLORS.textDark + '22' }]}>
                <Text style={[styles.tagTxt, { color: COLORS.textDark }]}>Nonaktif</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.acts}>
          <TouchableOpacity style={styles.actBtn} onPress={() => openForm(item)}>
            <Ionicons name="create-outline" size={17} color={COLORS.info} />
          </TouchableOpacity>
          {!isSelf && isActive && (
            <TouchableOpacity style={styles.actBtn} onPress={() => handleDeactivate(item)}>
              <Ionicons name="person-remove-outline" size={17} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── Role chips — hanya tampil di admin mode ───────────────
  const ROLE_OPTIONS = ownerMode
    ? []
    : [
      { key: 'kasir', label: 'Kasir' },
      { key: 'manager', label: 'Manager' },
      { key: 'admin', label: 'Admin' },
    ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>
            {ownerMode ? 'Kelola Karyawan' : 'Manajemen User'}
          </Text>
          {ownerMode && currentUser?.business_name ? (
            <Text style={styles.headerBiz}>{currentUser.business_name}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
          <Ionicons name="person-add-outline" size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Banner owner mode */}
      {ownerMode && (
        <View style={styles.banner}>
          <Ionicons name="people-outline" size={14} color={COLORS.primary} />
          <Text style={styles.bannerTxt}>
            Karyawan dapat login dan menggunakan kasir. Akses laporan & pengaturan terbatas.
          </Text>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => `u-${item.id}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={COLORS.textDark} />
              <Text style={styles.emptyTitle}>
                {ownerMode ? 'Belum Ada Karyawan' : 'Belum Ada User'}
              </Text>
              <Text style={styles.emptyTxt}>
                {ownerMode
                  ? 'Tambahkan karyawan agar bisa login dan pakai kasir.'
                  : 'Belum ada user yang terdaftar.'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => openForm()}>
                <Ionicons name="person-add-outline" size={15} color="#fff" />
                <Text style={styles.emptyBtnTxt}>
                  {ownerMode ? 'Tambah Karyawan' : 'Tambah User'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal Form */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHdr}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editItem
                ? (ownerMode ? 'Edit Karyawan' : 'Edit User')
                : (ownerMode ? 'Tambah Karyawan' : 'Tambah User')}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.saveText}>Simpan</Text>}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Field label="Nama Lengkap *" value={fName} onChangeText={setFName} placeholder="Contoh: Siti Rahayu" />
              <Field label="Email *" value={fEmail} onChangeText={setFEmail} placeholder="email@contoh.com" keyboard="email-address" />
              <Field label="Nomor HP" value={fPhone} onChangeText={setFPhone} placeholder="08xxxxxxxxxx" keyboard="phone-pad" />
              <Field
                label={editItem ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
                value={fPass} onChangeText={setFPass}
                placeholder="Minimal 6 karakter"
                secure showToggle toggleState={showPass}
                onToggle={() => setShowPass((v) => !v)}
              />

              {/* Pilihan role — hanya admin mode & non-edit atau edit tanpa owner */}
              {ROLE_OPTIONS.length > 0 && (
                <View style={fs.group}>
                  <Text style={fs.label}>Role</Text>
                  <View style={styles.roleRow}>
                    {ROLE_OPTIONS.map(({ key, label }) => {
                      const meta = getRoleMeta(key);
                      const active = fRole === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.roleChip,
                            active && { backgroundColor: meta.color, borderColor: meta.color },
                          ]}
                          onPress={() => setFRole(key)}
                        >
                          <Text style={[styles.roleChipTxt, active && { color: '#fff', fontWeight: FONTS.bold }]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Status — hanya saat edit */}
              {editItem && (
                <View style={fs.group}>
                  <Text style={fs.label}>Status Akun</Text>
                  <View style={styles.roleRow}>
                    {[['1', 'Aktif', COLORS.success], ['0', 'Nonaktif', COLORS.danger]].map(([v, l, c]) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.roleChip, fActive === v && { backgroundColor: c, borderColor: c }]}
                        onPress={() => setFActive(v)}
                      >
                        <Text style={[styles.roleChipTxt, fActive === v && { color: '#fff', fontWeight: FONTS.bold }]}>
                          {l}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Info akses karyawan (owner mode) */}
              {ownerMode && (
                <View style={styles.accessCard}>
                  <Text style={styles.accessTitle}>Akses yang diberikan ke karyawan:</Text>
                  {[
                    [true, 'Kasir & transaksi POS'],
                    [true, 'Lihat & kelola produk dan stok'],
                    [true, 'Laporan penjualan hari ini'],
                    [false, 'Laporan keuangan & analytics'],
                    [false, 'Kelola karyawan & pengaturan'],
                  ].map(([allowed, text]) => (
                    <View key={text} style={styles.accessRow}>
                      <Ionicons
                        name={allowed ? 'checkmark-circle' : 'close-circle'}
                        size={14}
                        color={allowed ? COLORS.success : COLORS.textDark}
                      />
                      <Text style={[styles.accessTxt, { color: allowed ? COLORS.textLight : COLORS.textDark }]}>
                        {text}
                      </Text>
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
  container: { flex: 1, backgroundColor: COLORS.bgDark },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.md },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  headerBiz: { fontSize: FONTS.xs, color: COLORS.primary, marginTop: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  banner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: COLORS.primary + '10', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.primary + '20' },
  bannerTxt: { flex: 1, fontSize: FONTS.xs, color: COLORS.textDark, lineHeight: 17 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 60 },

  card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  cardDim: { opacity: 0.5 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.primary },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.semibold, flex: 1 },
  selfBadge: { backgroundColor: COLORS.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1 },
  selfTxt: { fontSize: 9, color: COLORS.primary, fontWeight: FONTS.bold },
  email: { fontSize: FONTS.xs, color: COLORS.textMuted },
  phone: { fontSize: FONTS.xs, color: COLORS.textDark },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  tagTxt: { fontSize: 10, fontWeight: FONTS.bold },
  acts: { flexDirection: 'column', gap: SPACING.sm, flexShrink: 0 },
  actBtn: { padding: 9, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgMedium },

  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.lg, color: COLORS.textMuted, fontWeight: FONTS.semibold },
  emptyTxt: { fontSize: FONTS.sm, color: COLORS.textDark, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  emptyBtnTxt: { color: '#fff', fontSize: FONTS.sm, fontWeight: FONTS.bold },

  modal: { flex: 1, backgroundColor: COLORS.bgDark },
  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  saveText: { color: COLORS.primary, fontSize: FONTS.md, fontWeight: FONTS.bold },
  modalBody: { flex: 1, padding: SPACING.lg },

  roleRow: { flexDirection: 'row', gap: SPACING.sm },
  roleChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  roleChipTxt: { fontSize: FONTS.sm, color: COLORS.textMuted },

  accessCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.sm, gap: SPACING.sm },
  accessTitle: { fontSize: FONTS.sm, color: COLORS.textLight, fontWeight: FONTS.medium, marginBottom: 4 },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accessTxt: { fontSize: FONTS.xs, lineHeight: 18 },
});