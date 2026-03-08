/**
 * src/screens/UsersScreen.js — Manajemen User (Admin Only)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

const ROLES = ['kasir', 'manager', 'admin'];
const ROLE_COLORS = { admin: COLORS.danger, manager: COLORS.warning, kasir: COLORS.success };

export default function UsersScreen({ navigation }) {
  const { user: currentUser } = useAuth();

  const [users, setUsers]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'kasir', phone: '', is_active: '1' });

  const loadData = async () => {
    setIsLoading(true);
    const r = await usersAPI.getAll();
    if (r.success && Array.isArray(r.data)) setUsers(r.data);
    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const openForm = (item = null) => {
    setEditItem(item);
    if (item) {
      setForm({ name: item.name||'', email: item.email||'', password: '', role: item.role||'kasir', phone: item.phone||'', is_active: String(item.is_active ?? '1') });
    } else {
      setForm({ name: '', email: '', password: '', role: 'kasir', phone: '', is_active: '1' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim())  { Alert.alert('Error', 'Nama wajib diisi'); return; }
    if (!form.email.trim()) { Alert.alert('Error', 'Email wajib diisi'); return; }
    if (!editItem && !form.password.trim()) { Alert.alert('Error', 'Password wajib diisi untuk user baru'); return; }

    setIsSaving(true);
    const data = { name: form.name, email: form.email, role: form.role, phone: form.phone, is_active: parseInt(form.is_active) };
    if (form.password.trim()) data.password = form.password;

    const r = editItem ? await usersAPI.update(editItem.id, data) : await usersAPI.create(data);
    if (r.success) { setShowForm(false); loadData(); }
    else Alert.alert('Gagal', r.error || 'Gagal menyimpan');
    setIsSaving(false);
  };

  const handleDelete = (item) => {
    if (item.id === currentUser?.id) { Alert.alert('Error', 'Tidak bisa menonaktifkan akun sendiri'); return; }
    Alert.alert('Nonaktifkan User', `Nonaktifkan "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Nonaktifkan', style: 'destructive', onPress: async () => {
        const r = await usersAPI.delete(item.id);
        if (r.success) loadData();
        else Alert.alert('Gagal', r.error);
      }},
    ]);
  };

  const renderItem = ({ item }) => {
    const rColor = ROLE_COLORS[item.role] || COLORS.textMuted;
    const isInactive = item.is_active === 0 || item.is_active === '0';
    return (
      <View style={[styles.card, isInactive && { opacity: 0.5 }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: rColor + '20' }]}>
              <Text style={[styles.roleText, { color: rColor }]}>{item.role?.toUpperCase()}</Text>
            </View>
            {isInactive && <Text style={styles.inactiveBadge}>NONAKTIF</Text>}
          </View>
          <Text style={styles.sub}>{item.email}</Text>
          {item.phone ? <Text style={styles.sub}>{item.phone}</Text> : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openForm(item)}>
            <Ionicons name="create-outline" size={17} color={COLORS.info} />
          </TouchableOpacity>
          {item.id !== currentUser?.id && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="person-remove-outline" size={17} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen User</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada user</Text>}
        />
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editItem ? 'Edit User' : 'Tambah User'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={COLORS.primary} size="small" />
                        : <Text style={styles.saveText}>Simpan</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: SPACING.lg }}>
            {[
              { key: 'name',     label: 'Nama Lengkap *',  keyboard: 'default' },
              { key: 'email',    label: 'Email *',          keyboard: 'email-address' },
              { key: 'password', label: editItem ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *', keyboard: 'default', secure: true },
              { key: 'phone',    label: 'No. Telepon',      keyboard: 'phone-pad' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: SPACING.md }}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  style={styles.formInput}
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard}
                  secureTextEntry={f.secure}
                  placeholderTextColor={COLORS.textDark}
                  placeholder={`Masukkan ${f.label.replace(' *', '').split('(')[0].trim().toLowerCase()}`}
                />
              </View>
            ))}

            <Text style={styles.formLabel}>Role</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, form.role === r && { backgroundColor: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] }]}
                  onPress={() => setForm(p => ({ ...p, role: r }))}
                >
                  <Text style={[styles.roleChipText, form.role === r && { color: '#fff' }]}>{r.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {editItem && (
              <>
                <Text style={styles.formLabel}>Status</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
                  {[['1','Aktif'],['0','Nonaktif']].map(([v,l]) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.roleChip, form.is_active === v && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                      onPress={() => setForm(p => ({ ...p, is_active: v }))}
                    >
                      <Text style={[styles.roleChipText, form.is_active === v && { color: '#fff' }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const S = { container: { flex: 1, backgroundColor: COLORS.bgDark }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border }, headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite }, addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm }, avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.primary }, name: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.semibold }, sub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 }, roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full }, roleText: { fontSize: 10, fontWeight: 'bold' }, inactiveBadge: { fontSize: 9, color: COLORS.textDark, fontWeight: 'bold' }, actions: { flexDirection: 'row', gap: SPACING.sm }, actionBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgMedium }, emptyText: { color: COLORS.textMuted, textAlign: 'center', padding: SPACING.xl }, modal: { flex: 1, backgroundColor: COLORS.bgDark }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border }, modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite }, saveText: { color: COLORS.primary, fontSize: FONTS.md, fontWeight: FONTS.bold }, formLabel: { fontSize: FONTS.sm, color: COLORS.textLight, marginBottom: 6, fontWeight: FONTS.medium }, formInput: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textWhite, fontSize: FONTS.md, borderWidth: 1, borderColor: COLORS.border, height: 50 }, roleChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border }, roleChipText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.medium } };
const styles = StyleSheet.create(S);