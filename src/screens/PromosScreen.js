/**
 * src/screens/PromosScreen.js — Manajemen Promo / Diskon (Theme-Aware FIXED)
 * FIX: Full light mode + keyboard tidak menutup (Field di luar komponen)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { promosAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function PromosScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [promos,    setPromos]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [isSaving,  setIsSaving]  = useState(false);

  const [fName,        setFName]        = useState('');
  const [fCode,        setFCode]        = useState('');
  const [fType,        setFType]        = useState('percent');
  const [fValue,       setFValue]       = useState('');
  const [fMinPurchase, setFMinPurchase] = useState('');
  const [fMaxDiscount, setFMaxDiscount] = useState('');
  const [fStartDate,   setFStartDate]   = useState('');
  const [fEndDate,     setFEndDate]     = useState('');
  const [fIsActive,    setFIsActive]    = useState('1');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const r = await promosAPI.getAll();
    if (r.success && Array.isArray(r.data)) setPromos(r.data);
    else if (r.success && r.data && typeof r.data === 'object') {
      const arr = Object.values(r.data);
      if (Array.isArray(arr)) setPromos(arr);
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openForm = useCallback((item = null) => {
    setEditItem(item);
    const today = new Date().toISOString().slice(0, 10);
    const next  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    if (item) {
      setFName(item.name || '');
      setFCode(item.code || '');
      setFType(item.type || 'percent');
      setFValue(String(item.value || ''));
      setFMinPurchase(String(item.min_purchase || ''));
      setFMaxDiscount(String(item.max_discount || ''));
      setFStartDate(item.start_date || today);
      setFEndDate(item.end_date || next);
      setFIsActive(String(item.is_active ?? '1'));
    } else {
      setFName(''); setFCode(''); setFType('percent'); setFValue('');
      setFMinPurchase(''); setFMaxDiscount('');
      setFStartDate(today); setFEndDate(next); setFIsActive('1');
    }
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!fName.trim())  { Alert.alert('Error', 'Nama promo wajib diisi'); return; }
    if (!fValue)        { Alert.alert('Error', 'Nilai diskon wajib diisi'); return; }
    if (!fStartDate || !fEndDate) { Alert.alert('Error', 'Tanggal mulai dan akhir wajib diisi'); return; }
    setIsSaving(true);
    const data = {
      name: fName.trim(), code: fCode.trim(), type: fType,
      value: parseFloat(fValue) || 0,
      min_purchase: parseFloat(fMinPurchase) || 0,
      max_discount: parseFloat(fMaxDiscount) || 0,
      start_date: fStartDate, end_date: fEndDate,
      is_active: parseInt(fIsActive),
    };
    const r = editItem
      ? await promosAPI.update(editItem.id, data)
      : await promosAPI.create(data);
    if (r.success) { setShowForm(false); loadData(); }
    else Alert.alert('Gagal', r.error || 'Gagal menyimpan promo');
    setIsSaving(false);
  }, [fName, fCode, fType, fValue, fMinPurchase, fMaxDiscount, fStartDate, fEndDate, fIsActive, editItem, loadData]);

  const handleDelete = useCallback((item) => {
    Alert.alert('Hapus Promo', `Hapus "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        const r = await promosAPI.delete(item.id);
        if (r.success) loadData();
        else Alert.alert('Gagal', r.error || 'Gagal menghapus');
      }},
    ]);
  }, [loadData]);

  const renderItem = useCallback(({ item }) => {
    const isActive  = item.is_active === 1 || item.is_active === '1' || item.is_active === true;
    const isPercent = item.type === 'percent';
    const now       = new Date().toISOString().slice(0, 10);
    const isExpired = item.end_date && item.end_date < now;

    return (
      <View style={[styles.card, {
        backgroundColor: colors.bgCard,
        borderColor: colors.border,
        ...(!isDark && { shadowColor: '#00000012', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 }),
        ...( (!isActive || isExpired) && { opacity: 0.55 }),
      }]}>
        <View style={[styles.promoIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="pricetag" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
            <Text style={[styles.promoName, { color: colors.textWhite }]}>{item.name}</Text>
            <View style={[styles.badge, {
              backgroundColor: isActive && !isExpired ? colors.success + '20' : colors.danger + '20',
            }]}>
              <Text style={[styles.badgeText, {
                color: isActive && !isExpired ? colors.success : colors.danger,
              }]}>
                {!isActive ? 'Nonaktif' : isExpired ? 'Expired' : 'Aktif'}
              </Text>
            </View>
          </View>
          {item.code ? <Text style={[styles.promoCode, { color: colors.textMuted }]}>Kode: {item.code}</Text> : null}
          <Text style={[styles.promoValue, { color: colors.primary }]}>
            {isPercent ? `Diskon ${item.value}%` : `Diskon ${formatCurrency(item.value)}`}
            {item.min_purchase > 0 ? ` • min ${formatCurrency(item.min_purchase)}` : ''}
          </Text>
          <Text style={[styles.promoDate, { color: colors.textDark }]}>
            {item.start_date} — {item.end_date}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgSurface }]} onPress={() => openForm(item)}>
            <Ionicons name="create-outline" size={17} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bgSurface }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [openForm, handleDelete, colors, isDark]);

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
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>Promo & Diskon ({promos.length})</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={promos}
          renderItem={renderItem}
          keyExtractor={item => `promo-${item.id}`}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textDark} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada promo</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => openForm()}>
                <Text style={styles.emptyBtnText}>Tambah Promo Pertama</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal Form */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bgDark }]} edges={['top']}>
          <View style={[styles.modalHeader, {
            backgroundColor: colors.bgMedium,
            borderBottomColor: colors.border,
            borderBottomWidth: isDark ? 1 : 0.5,
          }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textWhite }]}>
              {editItem ? 'Edit Promo' : 'Tambah Promo'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={[styles.saveText, { color: colors.primary }]}>Simpan</Text>}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={{ padding: SPACING.lg }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Nama Promo */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Nama Promo *</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fName} onChangeText={setFName}
                  placeholder="Contoh: Diskon Hari Raya"
                  placeholderTextColor={colors.textDark} blurOnSubmit={false}
                />
              </View>

              {/* Kode Promo */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Kode Promo (opsional)</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fCode} onChangeText={setFCode}
                  placeholder="Contoh: LEBARAN20"
                  placeholderTextColor={colors.textDark} blurOnSubmit={false}
                  autoCapitalize="characters"
                />
              </View>

              {/* Tipe Diskon */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Tipe Diskon</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  {[['percent', 'Persen (%)'], ['nominal', 'Nominal (Rp)']].map(([v, l]) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.typeChip, {
                        backgroundColor: fType === v ? colors.primary : colors.bgCard,
                        borderColor: fType === v ? colors.primary : colors.border,
                      }]}
                      onPress={() => setFType(v)}
                    >
                      <Text style={[styles.typeChipText, { color: fType === v ? '#fff' : colors.textMuted }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Nilai */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>
                  {fType === 'percent' ? 'Nilai Diskon (%)' : 'Nilai Diskon (Rp)'}
                </Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fValue} onChangeText={setFValue}
                  placeholder={fType === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
                  placeholderTextColor={colors.textDark}
                  keyboardType="numeric" blurOnSubmit={false}
                />
              </View>

              {/* Min Pembelian */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Min. Pembelian (Rp)</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fMinPurchase} onChangeText={setFMinPurchase}
                  placeholder="0 = tidak ada batas"
                  placeholderTextColor={colors.textDark}
                  keyboardType="numeric" blurOnSubmit={false}
                />
              </View>

              {/* Maks Diskon */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Maks. Diskon (Rp)</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fMaxDiscount} onChangeText={setFMaxDiscount}
                  placeholder="0 = tidak ada batas"
                  placeholderTextColor={colors.textDark}
                  keyboardType="numeric" blurOnSubmit={false}
                />
              </View>

              {/* Tanggal */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Tanggal Mulai (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fStartDate} onChangeText={setFStartDate}
                  placeholder="2025-01-01"
                  placeholderTextColor={colors.textDark} blurOnSubmit={false}
                />
              </View>
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Tanggal Akhir (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.fi, { backgroundColor: colors.bgCard, color: colors.textWhite, borderColor: colors.border }]}
                  value={fEndDate} onChangeText={setFEndDate}
                  placeholder="2025-12-31"
                  placeholderTextColor={colors.textDark} blurOnSubmit={false}
                />
              </View>

              {/* Status */}
              <View style={styles.fg}>
                <Text style={[styles.fl, { color: colors.textLight }]}>Status</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  {[['1', 'Aktif'], ['0', 'Nonaktif']].map(([v, l]) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.typeChip, {
                        backgroundColor: fIsActive === v ? colors.primary : colors.bgCard,
                        borderColor: fIsActive === v ? colors.primary : colors.border,
                      }]}
                      onPress={() => setFIsActive(v)}
                    >
                      <Text style={[styles.typeChipText, { color: fIsActive === v ? '#fff' : colors.textMuted }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 60 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  headerTitle:    { fontSize: FONTS.lg, fontWeight: '700' },
  addBtn:         { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  loading:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:           { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md, padding: SPACING.md, borderWidth: 1 },
  promoIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  promoName:      { fontSize: FONTS.md, fontWeight: '600' },
  badge:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  badgeText:      { fontSize: 10, fontWeight: '700' },
  promoCode:      { fontSize: FONTS.xs },
  promoValue:     { fontSize: FONTS.sm, fontWeight: '500' },
  promoDate:      { fontSize: FONTS.xs },
  actions:        { flexDirection: 'column', gap: SPACING.sm },
  actionBtn:      { padding: 8, borderRadius: RADIUS.sm },
  empty:          { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyText:      { fontSize: FONTS.md },
  emptyBtn:       { borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  emptyBtnText:   { color: '#fff', fontWeight: '700' },
  modalContainer: { flex: 1 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  modalTitle:     { fontSize: FONTS.lg, fontWeight: '700' },
  saveText:       { fontSize: FONTS.md, fontWeight: '700' },
  fg:             { marginBottom: SPACING.md },
  fl:             { fontSize: FONTS.sm, marginBottom: 6, fontWeight: '500' },
  fi:             { borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md, borderWidth: 1, height: 50 },
  typeChip:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1 },
  typeChipText:   { fontSize: FONTS.sm, fontWeight: '500' },
});
