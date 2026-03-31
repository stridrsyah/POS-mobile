/**
 * src/screens/CustomersScreen.js — Data Pelanggan (Theme-Aware FIXED)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { customersAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function CustomersScreen({ navigation, route }) {
  const { selectMode } = route.params || {};
  const { setCustomer } = useCart();
  const { colors, isDark } = useTheme();

  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState({ name: '', phone: '', email: '', address: '' });
  const [isSaving, setIsSaving]   = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const result = await customersAPI.getAll();
    if (result.success && Array.isArray(result.data)) {
      setCustomers(result.data);
      setFiltered(result.data);
    }
    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  React.useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      setFiltered(customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q)));
    } else {
      setFiltered(customers);
    }
  }, [search, customers]);

  const openForm = (item = null) => {
    setEditItem(item);
    setForm(item
      ? { name: item.name || '', phone: item.phone || '', email: item.email || '', address: item.address || '' }
      : { name: '', phone: '', email: '', address: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Nama pelanggan wajib diisi'); return; }
    setIsSaving(true);
    const result = editItem
      ? await customersAPI.update(editItem.id, form)
      : await customersAPI.create(form);
    if (result.success) { setShowForm(false); loadData(); }
    else Alert.alert('Gagal', result.error || 'Gagal menyimpan');
    setIsSaving(false);
  };

  const handleDelete = (item) => {
    Alert.alert('Hapus Pelanggan', `Hapus "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        const r = await customersAPI.remove(item.id);
        if (r.success) loadData();
        else Alert.alert('Gagal', r.error);
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.bgCard,
        borderColor: colors.border,
        ...(!isDark && { shadowColor: '#00000012', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 }),
      }]}
      onPress={() => {
        if (selectMode) { setCustomer(item); navigation.goBack(); }
      }}
      activeOpacity={selectMode ? 0.7 : 1}
    >
      <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '22' }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textWhite }]}>{item.name}</Text>
        {item.phone ? <Text style={[styles.sub, { color: colors.textMuted }]}>{item.phone}</Text> : null}
        {item.email ? <Text style={[styles.sub, { color: colors.textMuted }]}>{item.email}</Text> : null}
      </View>
      {!selectMode && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgSurface }]} onPress={() => openForm(item)}>
            <Ionicons name="create-outline" size={18} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgSurface }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}
      {selectMode && <Ionicons name="chevron-forward" size={18} color={colors.textDark} />}
    </TouchableOpacity>
  );

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
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>
          {selectMode ? 'Pilih Pelanggan' : 'Pelanggan'}
        </Text>
        {!selectMode && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => openForm()}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        {selectMode && <View style={{ width: 24 }} />}
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.bgMedium }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textWhite }]}
            placeholder="Cari nama atau telepon..."
            placeholderTextColor={colors.textDark}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 60 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDark} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada pelanggan</Text>
            </View>
          }
        />
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.bgDark }]} edges={['top']}>
          <View style={[styles.modalHeader, {
            backgroundColor: colors.bgMedium,
            borderBottomColor: colors.border,
            borderBottomWidth: isDark ? 1 : 0.5,
          }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textWhite }]}>
              {editItem ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={[styles.saveText, { color: colors.primary }]}>Simpan</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {[
              { key: 'name',    label: 'Nama *',    keyboard: 'default' },
              { key: 'phone',   label: 'Telepon',   keyboard: 'phone-pad' },
              { key: 'email',   label: 'Email',     keyboard: 'email-address' },
              { key: 'address', label: 'Alamat',    keyboard: 'default' },
            ].map(f => (
              <View key={f.key} style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textLight }]}>{f.label}</Text>
                <TextInput
                  style={[styles.formInput, {
                    backgroundColor: colors.bgCard,
                    color: colors.textWhite,
                    borderColor: colors.border,
                  }]}
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard}
                  placeholderTextColor={colors.textDark}
                  placeholder={`Masukkan ${f.label.replace(' *', '')}`}
                />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  headerTitle:  { fontSize: FONTS.lg, fontWeight: '700' },
  addBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchSection:{ padding: SPACING.lg },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 44, borderWidth: 1 },
  searchInput:  { flex: 1, fontSize: FONTS.md },
  loading:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: SPACING.lg },
  card:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1 },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: FONTS.lg, fontWeight: '700' },
  info:         { flex: 1 },
  name:         { fontSize: FONTS.md, fontWeight: '600' },
  sub:          { fontSize: FONTS.xs, marginTop: 2 },
  actions:      { flexDirection: 'row', gap: SPACING.sm },
  actionBtn:    { padding: 8, borderRadius: RADIUS.sm },
  empty:        { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyText:    { fontSize: FONTS.md },
  modal:        { flex: 1 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  modalTitle:   { fontSize: FONTS.lg, fontWeight: '700' },
  saveText:     { fontSize: FONTS.md, fontWeight: '700' },
  modalBody:    { padding: SPACING.lg },
  formGroup:    { marginBottom: SPACING.md },
  formLabel:    { fontSize: FONTS.sm, marginBottom: 6, fontWeight: '500' },
  formInput:    { borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md, borderWidth: 1, height: 50 },
});
