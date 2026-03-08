/**
 * src/screens/CategoriesScreen.js — Manajemen Kategori Produk
 * Role: Admin & Manager
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
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function CategoriesScreen({ navigation }) {
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
    Alert.alert('Hapus Kategori', `Hapus "${item.name}"? Produk dalam kategori ini tidak akan terhapus.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        const r = await categoriesAPI.delete(item.id);
        if (r.success) loadData();
        else Alert.alert('Gagal', r.error || 'Kategori mungkin masih digunakan');
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="grid-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        <Text style={styles.count}>{item.product_count || 0} produk</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openForm(item)}>
          <Ionicons name="create-outline" size={17} color={COLORS.info} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kategori Produk</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Belum ada kategori</Text>}
        />
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editItem ? 'Edit Kategori' : 'Tambah Kategori'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={COLORS.primary} size="small" />
                        : <Text style={styles.saveText}>Simpan</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: SPACING.lg }}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nama Kategori *</Text>
              <TextInput
                style={styles.formInput}
                value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))}
                placeholderTextColor={COLORS.textDark}
                placeholder="Contoh: Minuman, Makanan, Snack..."
                autoFocus
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Deskripsi (opsional)</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                placeholderTextColor={COLORS.textDark}
                placeholder="Deskripsi kategori..."
                multiline numberOfLines={3}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.semibold },
  desc: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  count: { fontSize: FONTS.xs, color: COLORS.primary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgMedium },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', padding: SPACING.xl },
  modal: { flex: 1, backgroundColor: COLORS.bgDark },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  saveText: { color: COLORS.primary, fontSize: FONTS.md, fontWeight: FONTS.bold },
  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONTS.sm, color: COLORS.textLight, marginBottom: 6, fontWeight: FONTS.medium },
  formInput: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textWhite, fontSize: FONTS.md, borderWidth: 1, borderColor: COLORS.border, height: 50 },
});