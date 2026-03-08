/**
 * src/screens/CustomersScreen.js — Data Pelanggan
 * ============================================================
 * Fitur:
 * - Daftar pelanggan dengan search
 * - Tambah/Edit/Hapus pelanggan
 * - Mode pilih pelanggan (dari CartScreen)
 * ============================================================
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { customersAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function CustomersScreen({ navigation, route }) {
  // selectMode: dipakai saat dipanggil dari CartScreen untuk pilih pelanggan
  const { selectMode } = route.params || {};
  const { setCustomer } = useCart(); // Gunakan context langsung, bukan callback di params

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
    setForm(item ? { name: item.name || '', phone: item.phone || '', email: item.email || '', address: item.address || '' }
                 : { name: '', phone: '', email: '', address: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Nama pelanggan wajib diisi'); return; }
    setIsSaving(true);
    const result = editItem
      ? await customersAPI.update(editItem.id, form)
      : await customersAPI.create(form);
    if (result.success) {
      setShowForm(false);
      loadData();
    } else {
      Alert.alert('Gagal', result.error || 'Gagal menyimpan');
    }
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
      style={styles.card}
      onPress={() => {
        if (selectMode) { setCustomer(item); navigation.goBack(); }
      }}
      activeOpacity={selectMode ? 0.7 : 1}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.phone ? <Text style={styles.sub}>{item.phone}</Text> : null}
        {item.email ? <Text style={styles.sub}>{item.email}</Text> : null}
      </View>
      {!selectMode && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openForm(item)}>
            <Ionicons name="create-outline" size={18} color={COLORS.info} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}
      {selectMode && <Ionicons name="chevron-forward" size={18} color={COLORS.textDark} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectMode ? 'Pilih Pelanggan' : 'Pelanggan'}</Text>
        {!selectMode && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        {selectMode && <View style={{ width: 24 }} />}
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau telepon..."
            placeholderTextColor={COLORS.textDark}
            value={search} onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.textDark} />
              <Text style={styles.emptyText}>Belum ada pelanggan</Text>
            </View>
          }
        />
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editItem ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={COLORS.primary} size="small" />
                        : <Text style={styles.saveText}>Simpan</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {[
              { key: 'name',    label: 'Nama *',    keyboard: 'default' },
              { key: 'phone',   label: 'Telepon',   keyboard: 'phone-pad' },
              { key: 'email',   label: 'Email',     keyboard: 'email-address' },
              { key: 'address', label: 'Alamat',    keyboard: 'default' },
            ].map(f => (
              <View key={f.key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  style={styles.formInput}
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard}
                  placeholderTextColor={COLORS.textDark}
                  placeholder={`Masukkan ${f.label.replace(' *', '')}`}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgMedium,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  searchSection: { padding: SPACING.lg, backgroundColor: COLORS.bgMedium },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 44, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textWhite, fontSize: FONTS.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 60 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    marginBottom: SPACING.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.primary },
  info: { flex: 1 },
  name: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.semibold },
  sub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgMedium },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.md },
  modal: { flex: 1, backgroundColor: COLORS.bgDark },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 50, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgMedium,
  },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  saveText: { color: COLORS.primary, fontSize: FONTS.md, fontWeight: FONTS.bold },
  modalBody: { padding: SPACING.lg },
  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONTS.sm, color: COLORS.textLight, marginBottom: 6, fontWeight: FONTS.medium },
  formInput: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textWhite, fontSize: FONTS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
});