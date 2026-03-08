/**
 * src/screens/SuppliersScreen.js — Data Supplier
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { suppliersAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function SuppliersScreen({ navigation }) {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState({ name: '', phone: '', email: '', address: '' });
  const [isSaving, setIsSaving]   = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const result = await suppliersAPI.getAll();
    if (result.success && Array.isArray(result.data)) setSuppliers(result.data);
    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const openForm = (item = null) => {
    setEditItem(item);
    setForm(item ? { name: item.name || '', phone: item.phone || '', email: item.email || '', address: item.address || '' }
                 : { name: '', phone: '', email: '', address: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Nama supplier wajib diisi'); return; }
    setIsSaving(true);
    const result = editItem
      ? await suppliersAPI.update(editItem.id, form)
      : await suppliersAPI.create(form);
    if (result.success) { setShowForm(false); loadData(); }
    else Alert.alert('Gagal', result.error || 'Gagal menyimpan');
    setIsSaving(false);
  };

  const handleDelete = (item) => {
    Alert.alert('Hapus Supplier', `Hapus "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        const r = await suppliersAPI.delete(item.id);
        if (r.success) loadData();
        else Alert.alert('Gagal', r.error);
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="business-outline" size={22} color={COLORS.warning} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.phone   ? <Text style={styles.sub}>📞 {item.phone}</Text>   : null}
        {item.email   ? <Text style={styles.sub}>✉️ {item.email}</Text>   : null}
        {item.address ? <Text style={styles.sub}>📍 {item.address}</Text> : null}
        {item.product_count != null && (
          <Text style={styles.productCount}>{item.product_count} produk</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openForm(item)}>
          <Ionicons name="create-outline" size={18} color={COLORS.info} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supplier</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={suppliers}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={COLORS.textDark} />
              <Text style={styles.emptyText}>Belum ada supplier</Text>
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
            <Text style={styles.modalTitle}>{editItem ? 'Edit Supplier' : 'Tambah Supplier'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={COLORS.primary} size="small" />
                        : <Text style={styles.saveText}>Simpan</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {[
              { key: 'name',    label: 'Nama Supplier *', keyboard: 'default' },
              { key: 'phone',   label: 'Telepon',         keyboard: 'phone-pad' },
              { key: 'email',   label: 'Email',           keyboard: 'email-address' },
              { key: 'address', label: 'Alamat',          keyboard: 'default' },
            ].map(f => (
              <View key={f.key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  style={styles.formInput}
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard}
                  placeholderTextColor={COLORS.textDark}
                  placeholder={`Masukkan ${f.label.replace(' *','')}`}
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 60 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    marginBottom: SPACING.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.warning + '20', alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  name: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.semibold },
  sub: { fontSize: FONTS.xs, color: COLORS.textMuted },
  productCount: { fontSize: FONTS.xs, color: COLORS.primary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SPACING.sm, alignSelf: 'center' },
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