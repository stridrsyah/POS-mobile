/**
 * src/screens/SuppliersScreen.js — Data Supplier (Theme-Aware FIXED)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { suppliersAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

export default function SuppliersScreen({ navigation }) {
  const { colors, isDark } = useTheme();
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
    setForm(item
      ? { name: item.name || '', phone: item.phone || '', email: item.email || '', address: item.address || '' }
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
    <View style={[styles.card, {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      ...(!isDark && { shadowColor: '#00000012', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 }),
    }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.warning + '20' }]}>
        <Ionicons name="business-outline" size={22} color={colors.warning} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textWhite }]}>{item.name}</Text>
        {item.phone   ? <Text style={[styles.sub, { color: colors.textMuted }]}>📞 {item.phone}</Text>   : null}
        {item.email   ? <Text style={[styles.sub, { color: colors.textMuted }]}>✉️ {item.email}</Text>   : null}
        {item.address ? <Text style={[styles.sub, { color: colors.textMuted }]}>📍 {item.address}</Text> : null}
        {item.product_count != null && (
          <Text style={[styles.productCount, { color: colors.primary }]}>{item.product_count} produk</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgSurface }]} onPress={() => openForm(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgSurface }]} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
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
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>Supplier</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={suppliers}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 60 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={colors.textDark} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada supplier</Text>
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
              {editItem ? 'Edit Supplier' : 'Tambah Supplier'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={[styles.saveText, { color: colors.primary }]}>Simpan</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {[
              { key: 'name',    label: 'Nama Supplier *', keyboard: 'default' },
              { key: 'phone',   label: 'Telepon',         keyboard: 'phone-pad' },
              { key: 'email',   label: 'Email',           keyboard: 'email-address' },
              { key: 'address', label: 'Alamat',          keyboard: 'default' },
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
  loading:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: SPACING.lg },
  card:         { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1 },
  iconBox:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info:         { flex: 1, gap: 3 },
  name:         { fontSize: FONTS.md, fontWeight: '600' },
  sub:          { fontSize: FONTS.xs },
  productCount: { fontSize: FONTS.xs, marginTop: 2 },
  actions:      { flexDirection: 'row', gap: SPACING.sm, alignSelf: 'center' },
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
