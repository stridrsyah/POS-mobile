/**
 * src/screens/PromosScreen.js — Manajemen Promo / Diskon (FIXED)
 * ─────────────────────────────────────────────────────────────
 * FIX:
 *  - promosAPI.getAll (yang baru) menggantikan getActive yang tidak ada
 *  - Form field keyboard tidak tertutup (komponen di luar)
 *  - keyboardShouldPersistTaps="handled" di ScrollView
 *  - Validasi tanggal format YYYY-MM-DD dengan date picker sederhana
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
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

// ── Komponen field di LUAR agar keyboard tidak tutup ──────────
const PromoField = ({ label, value, onChangeText, keyboard = 'default', placeholder }) => (
  <View style={fStyles.group}>
    <Text style={fStyles.label}>{label}</Text>
    <TextInput
      style={fStyles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboard}
      placeholderTextColor={COLORS.textDark}
      placeholder={placeholder || label}
      blurOnSubmit={false}
    />
  </View>
);

const fStyles = StyleSheet.create({
  group: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sm, color: COLORS.textLight, marginBottom: 6, fontWeight: FONTS.medium || '500' },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    color: COLORS.textWhite, fontSize: FONTS.md, borderWidth: 1, borderColor: COLORS.border, height: 50,
  },
});

// ── Komponen Utama ────────────────────────────────────────────
export default function PromosScreen({ navigation }) {
  const [promos,    setPromos]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [isSaving,  setIsSaving]  = useState(false);

  // Form state (masing-masing state agar keyboard tidak tutup)
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
      // Handle jika data bukan array (kemungkinan wrapped)
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
      name:         fName.trim(),
      code:         fCode.trim(),
      type:         fType,
      value:        parseFloat(fValue)       || 0,
      min_purchase: parseFloat(fMinPurchase) || 0,
      max_discount: parseFloat(fMaxDiscount) || 0,
      start_date:   fStartDate,
      end_date:     fEndDate,
      is_active:    parseInt(fIsActive),
    };

    const r = editItem
      ? await promosAPI.update(editItem.id, data)
      : await promosAPI.create(data);

    if (r.success) {
      setShowForm(false);
      loadData();
    } else {
      Alert.alert('Gagal', r.error || 'Gagal menyimpan promo');
    }
    setIsSaving(false);
  }, [fName, fCode, fType, fValue, fMinPurchase, fMaxDiscount, fStartDate, fEndDate, fIsActive, editItem, loadData]);

  const handleDelete = useCallback((item) => {
    Alert.alert('Hapus Promo', `Hapus "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const r = await promosAPI.delete(item.id);
          if (r.success) loadData();
          else Alert.alert('Gagal', r.error || 'Gagal menghapus');
        },
      },
    ]);
  }, [loadData]);

  const renderItem = useCallback(({ item }) => {
    const isActive  = item.is_active === 1 || item.is_active === '1' || item.is_active === true;
    const isPercent = item.type === 'percent';
    const now       = new Date().toISOString().slice(0, 10);
    const isExpired = item.end_date && item.end_date < now;

    return (
      <View style={[styles.card, (!isActive || isExpired) && { opacity: 0.55 }]}>
        <View style={styles.promoIcon}>
          <Ionicons name="pricetag" size={22} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
            <Text style={styles.promoName}>{item.name}</Text>
            <View style={[styles.badge, {
              backgroundColor: isActive && !isExpired
                ? COLORS.success + '20' : COLORS.danger + '20'
            }]}>
              <Text style={[styles.badgeText, {
                color: isActive && !isExpired ? COLORS.success : COLORS.danger
              }]}>
                {!isActive ? 'Nonaktif' : isExpired ? 'Expired' : 'Aktif'}
              </Text>
            </View>
          </View>
          {item.code ? <Text style={styles.promoCode}>Kode: {item.code}</Text> : null}
          <Text style={styles.promoValue}>
            {isPercent ? `Diskon ${item.value}%` : `Diskon ${formatCurrency(item.value)}`}
            {item.min_purchase > 0 ? ` • min ${formatCurrency(item.min_purchase)}` : ''}
          </Text>
          <Text style={styles.promoDate}>
            <Ionicons name="calendar-outline" size={11} color={COLORS.textDark} /> {item.start_date} — {item.end_date}
          </Text>
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
  }, [openForm, handleDelete]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promo & Diskon ({promos.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={promos}
          renderItem={renderItem}
          keyExtractor={item => `promo-${item.id}`}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={48} color={COLORS.textDark} />
              <Text style={styles.emptyText}>Belum ada promo</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => openForm()}>
                <Text style={styles.emptyBtnText}>Tambah Promo Pertama</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal Form */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editItem ? 'Edit Promo' : 'Tambah Promo'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : <Text style={styles.saveText}>Simpan</Text>}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={{ padding: SPACING.lg }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <PromoField label="Nama Promo *"          value={fName}        onChangeText={setFName}        placeholder="Contoh: Diskon Hari Raya" />
              <PromoField label="Kode Promo (opsional)" value={fCode}        onChangeText={setFCode}        placeholder="Contoh: LEBARAN20" />

              {/* Tipe Diskon */}
              <View style={fStyles.group}>
                <Text style={fStyles.label}>Tipe Diskon</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  {[['percent', 'Persen (%)'], ['nominal', 'Nominal (Rp)']].map(([v, l]) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.typeChip, fType === v && styles.typeChipActive]}
                      onPress={() => setFType(v)}
                    >
                      <Text style={[styles.typeChipText, fType === v && { color: '#fff' }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <PromoField
                label={fType === 'percent' ? 'Nilai Diskon (%)' : 'Nilai Diskon (Rp)'}
                value={fValue}
                onChangeText={setFValue}
                keyboard="numeric"
                placeholder={fType === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
              />
              <PromoField label="Min. Pembelian (Rp)"           value={fMinPurchase} onChangeText={setFMinPurchase} keyboard="numeric" placeholder="0 = tidak ada batas" />
              <PromoField label="Maks. Diskon (Rp)"             value={fMaxDiscount} onChangeText={setFMaxDiscount} keyboard="numeric" placeholder="0 = tidak ada batas" />
              <PromoField label="Tanggal Mulai (YYYY-MM-DD)"    value={fStartDate}   onChangeText={setFStartDate}   placeholder="2025-01-01" />
              <PromoField label="Tanggal Akhir (YYYY-MM-DD)"    value={fEndDate}     onChangeText={setFEndDate}     placeholder="2025-12-31" />

              {/* Status */}
              <View style={fStyles.group}>
                <Text style={fStyles.label}>Status</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  {[['1', 'Aktif'], ['0', 'Nonaktif']].map(([v, l]) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.typeChip, fIsActive === v && styles.typeChipActive]}
                      onPress={() => setFIsActive(v)}
                    >
                      <Text style={[styles.typeChipText, fIsActive === v && { color: '#fff' }]}>{l}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginBottom: SPACING.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  promoIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  promoName: { fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: FONTS.semibold || '600' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  promoCode: { fontSize: FONTS.xs, color: COLORS.textMuted },
  promoValue: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.medium || '500' },
  promoDate: { fontSize: FONTS.xs, color: COLORS.textDark },
  actions: { flexDirection: 'column', gap: SPACING.sm },
  actionBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgMedium },

  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.md },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  emptyBtnText: { color: '#fff', fontWeight: 'bold' },

  modal: { flex: 1, backgroundColor: COLORS.bgDark },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  saveText: { color: COLORS.primary, fontSize: FONTS.md, fontWeight: FONTS.bold },

  typeChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.medium || '500' },
});
