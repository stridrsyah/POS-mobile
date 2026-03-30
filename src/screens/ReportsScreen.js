/**
 * src/screens/ReportsScreen.js — Laporan Lengkap (Theme-Aware)
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';
import { reportsAPI } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, toApiDate } from '../utils/helpers';

const today      = () => toApiDate();
const ago        = (n) => toApiDate(new Date(Date.now() - n * 86400000));
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };

const PRESETS = [
  { label: 'Hari Ini',  start: today,       end: today },
  { label: 'Kemarin',   start: ()=>ago(1),  end: ()=>ago(1) },
  { label: '7 Hari',    start: ()=>ago(6),  end: today },
  { label: 'Bulan Ini', start: monthStart,  end: today },
];

const TABS      = ['Penjualan', 'Laba Rugi', 'Per Supplier'];
const TAB_ICONS = ['receipt-outline', 'cash-outline', 'business-outline'];

export default function ReportsScreen({ navigation }) {
  const { colors } = useTheme();
  const [activeTab,    setActiveTab]    = useState(0);
  const [activePreset, setActivePreset] = useState(0);
  const [startDate,    setStartDate]    = useState(today());
  const [endDate,      setEndDate]      = useState(today());
  const [isLoading,    setIsLoading]    = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [salesData,    setSalesData]    = useState(null);
  const [profitData,   setProfitData]   = useState(null);
  const [supplierData, setSupplierData] = useState(null);

  const applyPreset = (i) => {
    const p = PRESETS[i];
    setActivePreset(i);
    setStartDate(p.start());
    setEndDate(p.end());
  };

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    if (activeTab === 0) {
      const r = await reportsAPI.sales(startDate, endDate);
      if (r.success) setSalesData(r.data);
    } else if (activeTab === 1) {
      const r = await reportsAPI.profit(startDate, endDate);
      if (r.success) setProfitData(r.data);
    } else {
      const r = await reportsAPI.salesBySupplier(startDate, endDate);
      if (r.success) setSupplierData(Array.isArray(r.data) ? r.data : []);
    }
    setIsLoading(false);
  }, [activeTab, startDate, endDate]);

  React.useEffect(() => { loadReport(); }, [loadReport]);

  const exportPDF = async () => {
    setExporting(true);
    const css = `<style>
      body{font-family:sans-serif;padding:20px}h2{color:#6C63FF;text-align:center;margin-bottom:4px}
      .sub{color:#888;text-align:center;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#6C63FF;color:#fff;padding:7px 8px;text-align:left}
      td{padding:5px 8px;border-bottom:1px solid #eee}
      .g{color:#4CAF50;font-weight:bold}.r{color:#F44336;font-weight:bold}
    </style>`;
    let html = '';

    if (activeTab === 0 && salesData) {
      const trxs = salesData.transactions || [];
      html = css + `<h2>Laporan Penjualan</h2>
        <p class="sub">${startDate} s/d ${endDate} | Total: ${formatCurrency(salesData.total||0)}</p>
        <table><tr><th>No</th><th>Invoice</th><th>Tanggal</th><th>Kasir</th><th>Total</th><th>Metode</th></tr>
        ${trxs.map((t,i) => `<tr><td>${i+1}</td><td>${t.invoice_number}</td><td>${(t.transaction_date||'').slice(0,10)}</td>
          <td>${t.cashier_name||'-'}</td><td>${formatCurrency(t.total)}</td><td>${t.payment_method||'-'}</td></tr>`).join('')}
        </table>`;
    } else if (activeTab === 1 && profitData) {
      const sm = profitData.summary || {};
      html = css + `<h2>Laporan Laba Rugi</h2>
        <p class="sub">${startDate} s/d ${endDate}</p>
        <p>Pendapatan: ${formatCurrency(sm.total_revenue||0)} | HPP: ${formatCurrency(sm.total_cost||0)} | Laba: ${formatCurrency(sm.total_profit||0)}</p>`;
    }

    if (!html) { Alert.alert('Info','Tidak ada data'); setExporting(false); return; }
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType:'application/pdf', dialogTitle:`Export ${TABS[activeTab]}` });
    } catch(e) { Alert.alert('Gagal','Gagal buat PDF: '+e.message); }
    setExporting(false);
  };

  const renderSales = () => {
    if (!salesData) return <Text style={[s.noData, { color: colors.textDark }]}>Tidak ada data</Text>;
    const trxs = salesData.transactions || [];
    const LMAP = { cash:'CASH', transfer:'TRANSFER', qris:'QRIS', card:'KARTU' };
    const normM = (m) => m ? String(m).toLowerCase().trim() : null;
    const byMethod = {};
    trxs.forEach(t => {
      const raw = normM(t.payment_method);
      const key = raw ? (LMAP[raw] || raw.toUpperCase()) : 'LAINNYA';
      byMethod[key] = (byMethod[key]||0) + Number(t.total||0);
    });
    return (
      <View>
        <View style={s.cardRow}>
          <View style={[s.statCard, s.statCardWide, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: colors.primary }]}>
            <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
            <Text style={[s.statLbl, { color: colors.textMuted }]}>Total Penjualan</Text>
            <Text style={[s.statVal, { color: colors.primary }]}>{formatCurrency(salesData.total||0)}</Text>
          </View>
        </View>
        <View style={s.cardRow}>
          <View style={[s.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: colors.warning }]}>
            <Ionicons name="receipt-outline" size={16} color={colors.warning} />
            <Text style={[s.statLbl, { color: colors.textMuted }]}>Transaksi</Text>
            <Text style={[s.statVal, { color: colors.warning }]}>{String(trxs.length)}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: colors.success }]}>
            <Ionicons name="stats-chart-outline" size={16} color={colors.success} />
            <Text style={[s.statLbl, { color: colors.textMuted }]}>Rata-rata</Text>
            <Text style={[s.statVal, { color: colors.success }]}>{formatCurrency(trxs.length>0?(salesData.total||0)/trxs.length:0)}</Text>
          </View>
        </View>
        {Object.keys(byMethod).length > 0 && (
          <View style={[s.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.sTitle, { color: colors.textMuted }]}>Per Metode Pembayaran</Text>
            {Object.entries(byMethod).map(([k,v])=>(
              <View key={k} style={[s.dRow, { borderBottomColor: colors.divider }]}>
                <Text style={[s.dLabel, { color: colors.textLight }]}>{k}</Text>
                <Text style={[s.dValue, { color: colors.primary }]}>{formatCurrency(v)}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={[s.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[s.sTitle, { color: colors.textMuted }]}>Daftar Transaksi ({trxs.length})</Text>
          {trxs.length === 0
            ? <Text style={[s.noData, { color: colors.textDark }]}>Belum ada transaksi</Text>
            : trxs.map((t,i) => {
                const raw = normM(t.payment_method);
                const lbl = raw ? (LMAP[raw]||raw.toUpperCase()) : null;
                return (
                  <View key={`trx-${t.id||i}`} style={[s.trxRow, { borderBottomColor: colors.divider }]}>
                    <View style={s.trxL}>
                      <Text style={[s.trxInv, { color: colors.textWhite }]}>{t.invoice_number}</Text>
                      <Text style={[s.trxSub, { color: colors.textDark }]}>{(t.transaction_date||'').slice(0,16).replace('T',' ')} • {t.cashier_name||'-'}</Text>
                    </View>
                    <View style={s.trxR}>
                      <Text style={[s.trxTotal, { color: colors.primary }]}>{formatCurrency(t.total)}</Text>
                      {lbl ? <Text style={[s.trxMethod, { color: colors.textDark }]}>{lbl}</Text> : null}
                    </View>
                  </View>
                );
              })
          }
        </View>
      </View>
    );
  };

  const renderProfit = () => {
    if (!profitData) return <Text style={[s.noData, { color: colors.textDark }]}>Tidak ada data</Text>;
    const sm     = profitData.summary || {};
    const daily  = profitData.daily   || [];
    const byProd = profitData.by_product || [];
    const margin = (sm.total_revenue||0) > 0
      ? (((sm.total_profit||0)/(sm.total_revenue))*100).toFixed(1) : '0.0';
    return (
      <View>
        <View style={s.cardRow}>
          <View style={[s.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: colors.primary }]}>
            <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
            <Text style={[s.statLbl, { color: colors.textMuted }]}>Pendapatan</Text>
            <Text style={[s.statVal, { color: colors.primary }]}>{formatCurrency(sm.total_revenue||0)}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: colors.warning }]}>
            <Ionicons name="cart-outline" size={16} color={colors.warning} />
            <Text style={[s.statLbl, { color: colors.textMuted }]}>HPP (Modal)</Text>
            <Text style={[s.statVal, { color: colors.warning }]}>{formatCurrency(sm.total_cost||0)}</Text>
          </View>
        </View>
        <View style={s.cardRow}>
          <View style={[s.statCard, s.statCardWide, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: colors.success }]}>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
            <Text style={[s.statLbl, { color: colors.textMuted }]}>Laba Bersih</Text>
            <Text style={[s.statVal, { color: colors.success }]}>{formatCurrency(sm.total_profit||0)}</Text>
          </View>
        </View>
        <View style={[s.section, { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[s.dLabel, { color: colors.textMuted }]}>Margin Keuntungan</Text>
          <Text style={[s.dValue, { fontSize: FONTS.xl, color: Number(margin)>=20 ? colors.success : colors.warning }]}>{margin}%</Text>
        </View>
        {daily.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.sTitle, { color: colors.textMuted }]}>Laba Harian</Text>
            <View style={[s.tHead, { backgroundColor: colors.bgMedium }]}>
              {['Tanggal','Pendapatan','HPP','Laba'].map(h=><Text key={h} style={[s.th, { color: colors.textMuted }]}>{h}</Text>)}
            </View>
            {daily.map((d,i)=>(
              <View key={`day-${i}`} style={[s.tRow, { borderBottomColor: colors.divider }, i%2===0 && { backgroundColor: colors.bgSurface + '40' }]}>
                <Text style={[s.td, { color: colors.textLight }]}>{(d.date||'-').slice(5)}</Text>
                <Text style={[s.td, { color: colors.textLight }]}>{formatCurrency(d.revenue||0)}</Text>
                <Text style={[s.td, { color: colors.textLight }]}>{formatCurrency(d.cost||0)}</Text>
                <Text style={[s.td, { color:(d.profit||0)>=0 ? colors.success : colors.danger }]}>{formatCurrency(d.profit||0)}</Text>
              </View>
            ))}
          </View>
        )}
        {byProd.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.sTitle, { color: colors.textMuted }]}>Laba Per Produk (Top 10)</Text>
            {byProd.slice(0,10).map((p,i)=>(
              <View key={`bp-${i}`} style={[s.dRow, { borderBottomColor: colors.divider }]}>
                <View style={{flex:1}}>
                  <Text style={[s.dLabel, { color: colors.textLight }]} numberOfLines={1}>{p.product_name}</Text>
                  <Text style={{ fontSize: FONTS.xs, color: colors.textDark }}>Qty: {p.total_qty}</Text>
                </View>
                <Text style={[s.dValue, { color:(p.profit||0)>=0 ? colors.success : colors.danger }]}>{formatCurrency(p.profit||0)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSupplier = () => {
    if (!supplierData) return <Text style={[s.noData, { color: colors.textDark }]}>Tidak ada data</Text>;
    if (supplierData.length === 0) return <Text style={[s.noData, { color: colors.textDark }]}>Tidak ada penjualan di periode ini</Text>;
    const totalRev = supplierData.reduce((a,x)=>a+Number(x.total_revenue||0),0);
    const totalQty = supplierData.reduce((a,x)=>a+Number(x.total_qty||0),0);
    return (
      <View>
        <View style={s.cardRow}>
          <View style={[s.statCard, s.statCardWide, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: colors.primary }]}>
            <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
            <Text style={[s.statLbl, { color: colors.textMuted }]}>Total Penjualan</Text>
            <Text style={[s.statVal, { color: colors.primary }]}>{formatCurrency(totalRev)}</Text>
          </View>
        </View>
        {supplierData.map((sup,si)=>{
          const pct = totalRev>0?((Number(sup.total_revenue||0)/totalRev)*100).toFixed(1):'0';
          return (
            <View key={`sup-${si}`} style={[s.supCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={s.supHeader}>
                <View style={{flex:1}}>
                  <Text style={[s.supName, { color: colors.textWhite }]}>🏢 {sup.supplier_name}</Text>
                  <Text style={{ fontSize: FONTS.xs, color: colors.textDark, marginTop:2 }}>
                    {sup.total_transaksi||0} transaksi • {sup.total_qty||0} unit
                  </Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={[s.supRev, { color: colors.primary }]}>{formatCurrency(sup.total_revenue||0)}</Text>
                  <Text style={{ fontSize: FONTS.xs, color: colors.textDark }}>{pct}%</Text>
                </View>
              </View>
              <View style={{ height:4, backgroundColor: colors.border, borderRadius:2, marginVertical:8 }}>
                <View style={{ height:4, width:`${Math.min(100,Number(pct))}%`, backgroundColor: colors.primary, borderRadius:2 }}/>
              </View>
              {(sup.products||[]).length > 0 && (
                <View>
                  <View style={[s.tHead, { backgroundColor: colors.bgMedium }]}>
                    <Text style={[s.th, { flex:2, color: colors.textMuted }]}>Produk</Text>
                    <Text style={[s.th, { color: colors.textMuted }]}>Qty</Text>
                    <Text style={[s.th, { color: colors.textMuted }]}>Penjualan</Text>
                  </View>
                  {sup.products.map((p,pi)=>(
                    <View key={`p-${pi}`} style={[s.tRow, { borderBottomColor: colors.divider }, pi%2===0 && { backgroundColor: colors.bgSurface + '40' }]}>
                      <Text style={[s.td, { flex:2, color: colors.textLight }]} numberOfLines={1}>{p.product_name}</Text>
                      <Text style={[s.td, { color: colors.textLight }]}>{p.total_qty}</Text>
                      <Text style={[s.td, { color: colors.primary }]}>{formatCurrency(p.total_revenue||0)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textWhite }]}>Laporan</Text>
        <TouchableOpacity style={[s.exportBtn, { backgroundColor: colors.primary }, exporting&&{opacity:0.6}]} onPress={exportPDF} disabled={exporting}>
          {exporting
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="download-outline" size={16} color="#fff"/><Text style={s.exportTxt}>PDF</Text></>}
        </TouchableOpacity>
      </View>

      <View style={[s.presetRow, { backgroundColor: colors.bgMedium }]}>
        {PRESETS.map((p,i)=>(
          <TouchableOpacity key={p.label}
            style={[s.pBtn, { backgroundColor: activePreset===i ? colors.primary : colors.bgCard, borderColor: activePreset===i ? colors.primary : colors.border }]}
            onPress={()=>applyPreset(i)}
          >
            <Text style={[s.pTxt, { color: activePreset===i ? '#fff' : colors.textMuted }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.tabRow, { backgroundColor: colors.bgMedium }]}>
        {TABS.map((t,i)=>(
          <TouchableOpacity key={t}
            style={[s.tab, { backgroundColor: activeTab===i ? colors.primary+'20' : colors.bgCard, borderColor: activeTab===i ? colors.primary : colors.border }]}
            onPress={()=>setActiveTab(i)}
          >
            <Ionicons name={TAB_ICONS[i]} size={13} color={activeTab===i ? colors.primary : colors.textMuted}/>
            <Text style={[s.tabTxt, { color: activeTab===i ? colors.primary : colors.textMuted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading
        ? <View style={s.loading}><ActivityIndicator size="large" color={colors.primary}/></View>
        : <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {activeTab===0 && renderSales()}
            {activeTab===1 && renderProfit()}
            {activeTab===2 && renderSupplier()}
            <View style={{height:40}}/>
          </ScrollView>
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex:1 },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:SPACING.xl, paddingVertical:SPACING.md, borderBottomWidth:1 },
  headerTitle:  { fontSize:FONTS.lg, fontWeight:'bold' },
  exportBtn:    { flexDirection:'row', alignItems:'center', gap:4, borderRadius:RADIUS.md, paddingHorizontal:SPACING.md, paddingVertical:8 },
  exportTxt:    { color:'#fff', fontSize:FONTS.sm, fontWeight:'600' },
  presetRow:    { flexDirection:'row', paddingHorizontal:SPACING.lg, paddingBottom:SPACING.md, gap:SPACING.sm },
  pBtn:         { flex:1, paddingVertical:7, alignItems:'center', borderRadius:RADIUS.md, borderWidth:1 },
  pTxt:         { fontSize:FONTS.xs, fontWeight:'500' },
  tabRow:       { flexDirection:'row', paddingHorizontal:SPACING.lg, paddingBottom:SPACING.md, gap:SPACING.sm },
  tab:          { flex:1, paddingVertical:8, alignItems:'center', borderRadius:RADIUS.md, borderWidth:1, gap:2 },
  tabTxt:       { fontSize:FONTS.xs, fontWeight:'500' },
  loading:      { flex:1, alignItems:'center', justifyContent:'center' },
  body:         { padding:SPACING.lg },
  cardRow:      { flexDirection:'row', gap:SPACING.md, marginBottom:SPACING.md },
  statCard:     { flex:1, borderRadius:RADIUS.lg, padding:SPACING.md, borderWidth:1, borderLeftWidth:3, gap:3 },
  statCardWide: { flex:2 },
  statLbl:      { fontSize:FONTS.xs, marginTop:3 },
  statVal:      { fontSize:FONTS.md, fontWeight:'bold' },
  section:      { borderRadius:RADIUS.lg, padding:SPACING.lg, marginBottom:SPACING.md, borderWidth:1 },
  sTitle:       { fontSize:FONTS.sm, fontWeight:'bold', textTransform:'uppercase', letterSpacing:0.5, marginBottom:SPACING.md },
  noData:       { textAlign:'center', paddingVertical:SPACING.xl },
  dRow:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderBottomWidth:1 },
  dLabel:       { fontSize:FONTS.sm, fontWeight:'500' },
  dValue:       { fontSize:FONTS.sm, fontWeight:'bold' },
  tHead:        { flexDirection:'row', borderRadius:RADIUS.sm, padding:SPACING.sm, marginBottom:4 },
  th:           { flex:1, fontSize:FONTS.xs, fontWeight:'600' },
  tRow:         { flexDirection:'row', paddingVertical:5, borderBottomWidth:1 },
  td:           { flex:1, fontSize:FONTS.xs },
  trxRow:       { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1 },
  trxL:         { flex:1, gap:2 },
  trxInv:       { fontSize:FONTS.sm, fontWeight:'600' },
  trxSub:       { fontSize:FONTS.xs },
  trxR:         { alignItems:'flex-end', gap:2 },
  trxTotal:     { fontSize:FONTS.sm, fontWeight:'bold' },
  trxMethod:    { fontSize:FONTS.xs },
  supCard:      { borderRadius:RADIUS.lg, padding:SPACING.lg, marginBottom:SPACING.md, borderWidth:1 },
  supHeader:    { flexDirection:'row', alignItems:'flex-start' },
  supName:      { fontSize:FONTS.sm, fontWeight:'bold' },
  supRev:       { fontSize:FONTS.md, fontWeight:'bold' },
});
