/**
 * src/screens/CategoriesScreen.js — Manajemen Kategori Produk (Theme-Aware)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { categoriesAPI } from '../services/api';
import { FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

export default function CategoriesScreen({ navigation }) {
  const { colors } = useTheme();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [isSaving, setIsSaving]     = useState(false);
  const [form, setForm]             = useState({ name: '', description: '' });

  const loadData = async () => {
    setIsLoading(true);
    const r = await categoriesAPI.getAll();
    if (r.success && Array.isArray(r.data)) setCategories(r.data);
    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const openForm = (item = null) => {
    setEditItem(item);
    setForm(item ? { name: item.name || '', description: item.description || '' } : { name: '', description: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Nama kategori wajib diisi'); return; }
    setIsSaving(true);
    const r = editItem
      ? await categoriesAPI.update(editItem.id, form)
      : await categoriesAPI.create(form);
    if (r.success) { setShowForm(false); loadData(); }
    else Alert.alert('Gagal', r.error || 'Gagal menyimpan');
    setIsSaving(false);
  };

  const handleDelete = (item) => {
    Alert.alert('Hapus Kategori', `Hapus "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        const r = await categoriesAPI.delete(item.id);
        if (r.success) loadData();
        else Alert.alert('Gagal', r.error || 'Kategori mungkin masih digunakan');
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="grid-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.textWhite }]}>{item.name}</Text>
        {item.description ? <Text style={[styles.desc, { color: colors.textMuted }]}>{item.description}</Text> : null}
        <Text style={[styles.count, { color: colors.primary }]}>{item.product_count || 0} produk</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgMedium }]} onPress={() => openForm(item)}>
          <Ionicons name="create-outline" size={17} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgMedium }]} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>Kategori Produk</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada kategori</Text>}
        />
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.bgDark }]} edges={['top']}>
          <View style={[styles.modalHeader, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textWhite }]}>{editItem ? 'Edit Kategori' : 'Tambah Kategori'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={colors.primary} size="small" />
                        : <Text style={[styles.saveText, { color: colors.primary }]}>Simpan</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: SPACING.lg }}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textLight }]}>Nama Kategori *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))}
                placeholderTextColor={colors.textDark}
                placeholder="Contoh: Alat Tulis, Makanan, Minuman..."
                autoFocus
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textLight }]}>Deskripsi (opsional)</Text>
              <TextInput
                style={[styles.formInput, { height: 80, backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                placeholderTextColor={colors.textDark}
                placeholder="Deskripsi kategori..."
                multiline numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: 'bold' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1, ...SHADOW.sm },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: FONTS.md, fontWeight: '600' },
  desc: { fontSize: FONTS.xs, marginTop: 2 },
  count: { fontSize: FONTS.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: 8, borderRadius: RADIUS.sm },
  emptyText: { textAlign: 'center', padding: SPACING.xl },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: FONTS.lg, fontWeight: 'bold' },
  saveText: { fontSize: FONTS.md, fontWeight: 'bold' },
  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONTS.sm, marginBottom: 6, fontWeight: '500' },
  formInput: { borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md, borderWidth: 1, height: 50 },
});
