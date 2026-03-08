/**
 * src/screens/ReportsScreen.js — Laporan Lengkap
 * Tabs: Penjualan | Laba Rugi | Per Supplier
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
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
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

function StatCard({ label, value, color, icon, wide }) {
  return (
    <View style={[s.statCard, wide && s.statCardWide, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={s.statLbl}>{label}</Text>
      <Text style={[s.statVal, { color }]}>{value}</Text>
    </View>
  );
}

export default function ReportsScreen({ navigation }) {
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

  // ─── Export PDF ─────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true);
    const css = `<style>
      body{font-family:sans-serif;padding:20px}h2{color:#6C63FF;text-align:center;margin-bottom:4px}
      .sub{color:#888;text-align:center;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#6C63FF;color:#fff;padding:7px 8px;text-align:left}
      td{padding:5px 8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f9f9f9}
      .g{color:#4CAF50;font-weight:bold}.r{color:#F44336;font-weight:bold}
      .sh{background:#1a1a2e;color:#fff;padding:8px;margin-top:12px;font-size:12px;font-weight:bold}
      .sm{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
      .sb{background:#f5f5f5;padding:8px 12px;border-radius:6px}
      .sl{font-size:10px;color:#888}.sv{font-size:14px;font-weight:bold;color:#6C63FF}
    </style>`;
    let html = '';

    if (activeTab === 0 && salesData) {
      const trxs = salesData.transactions || [];
      const LMAP = { cash:'CASH', transfer:'TRANSFER', qris:'QRIS', card:'KARTU' };
      html = css + `<h2>Laporan Penjualan</h2>
        <p class="sub">${startDate} s/d ${endDate} | Total: <b>${formatCurrency(salesData.total||0)}</b> | ${trxs.length} Transaksi</p>
        <table><tr><th>No</th><th>Invoice</th><th>Tanggal</th><th>Kasir</th><th>Total</th><th>Metode</th></tr>
        ${trxs.map((t,i) => {
          const m = t.payment_method ? String(t.payment_method).toLowerCase().trim() : null;
          return `<tr><td>${i+1}</td><td>${t.invoice_number}</td><td>${(t.transaction_date||'').slice(0,10)}</td>
          <td>${t.cashier_name||'-'}</td><td>${formatCurrency(t.total)}</td>
          <td>${m?(LMAP[m]||m.toUpperCase()):'-'}</td></tr>`;
        }).join('')}</table>`;

    } else if (activeTab === 1 && profitData) {
      const sm = profitData.summary || {};
      const daily = profitData.daily || [];
      const byProd = profitData.by_product || [];
      html = css + `<h2>Laporan Laba Rugi</h2>
        <p class="sub">${startDate} s/d ${endDate}</p>
        <div class="sm">
          <div class="sb"><div class="sl">Pendapatan</div><div class="sv">${formatCurrency(sm.total_revenue||0)}</div></div>
          <div class="sb"><div class="sl">HPP</div><div class="sv">${formatCurrency(sm.total_cost||0)}</div></div>
          <div class="sb"><div class="sl">Laba Bersih</div><div class="sv" style="color:#4CAF50">${formatCurrency(sm.total_profit||0)}</div></div>
        </div>
        <table><tr><th>Tanggal</th><th>Pendapatan</th><th>HPP</th><th>Laba</th></tr>
        ${daily.map(d=>`<tr><td>${d.date||'-'}</td><td>${formatCurrency(d.revenue||0)}</td>
          <td>${formatCurrency(d.cost||0)}</td>
          <td class="${(d.profit||0)>=0?'g':'r'}">${formatCurrency(d.profit||0)}</td></tr>`).join('')}
        </table>
        ${byProd.length>0?`<h3 style="color:#6C63FF;margin-top:20px">Laba Per Produk</h3>
        <table><tr><th>Produk</th><th>Qty</th><th>Pendapatan</th><th>HPP</th><th>Laba</th></tr>
        ${byProd.map(p=>`<tr><td>${p.product_name}</td><td>${p.total_qty}</td>
          <td>${formatCurrency(p.revenue||0)}</td><td>${formatCurrency(p.cost||0)}</td>
          <td class="${(p.profit||0)>=0?'g':'r'}">${formatCurrency(p.profit||0)}</td></tr>`).join('')}
        </table>`:''}`;

    } else if (activeTab === 2 && supplierData && supplierData.length > 0) {
      const tot = supplierData.reduce((a,x)=>a+Number(x.total_revenue||0),0);
      html = css + `<h2>Laporan Penjualan Per Supplier</h2>
        <p class="sub">${startDate} s/d ${endDate} | Total: <b>${formatCurrency(tot)}</b></p>
        ${supplierData.map(sup=>`
          <div class="sh">&#127970; ${sup.supplier_name} — ${formatCurrency(sup.total_revenue||0)} | ${sup.total_qty||0} unit | ${sup.total_transaksi||0} trx</div>
          <table><tr><th>Produk</th><th>Qty</th><th>Penjualan</th></tr>
          ${(sup.products||[]).map(p=>`<tr><td>${p.product_name}</td><td>${p.total_qty}</td><td>${formatCurrency(p.total_revenue||0)}</td></tr>`).join('')}
          </table>`).join('')}`;
    }

    if (!html) { Alert.alert('Info','Tidak ada data'); setExporting(false); return; }
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType:'application/pdf', dialogTitle:`Export ${TABS[activeTab]}` });
    } catch(e) { Alert.alert('Gagal','Gagal buat PDF: '+e.message); }
    setExporting(false);
  };

  // ─── Render Penjualan ────────────────────────────────────────
  const renderSales = () => {
    if (!salesData) return <Text style={s.noData}>Tidak ada data</Text>;
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
          <StatCard label="Total Penjualan" value={formatCurrency(salesData.total||0)} color={COLORS.primary} icon="trending-up-outline" wide />
        </View>
        <View style={s.cardRow}>
          <StatCard label="Transaksi"   value={String(trxs.length)} color={COLORS.warning} icon="receipt-outline" />
          <StatCard label="Rata-rata"   value={formatCurrency(trxs.length>0?(salesData.total||0)/trxs.length:0)} color={COLORS.success} icon="stats-chart-outline" />
        </View>
        {Object.keys(byMethod).length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Per Metode Pembayaran</Text>
            {Object.entries(byMethod).map(([k,v])=>(
              <View key={k} style={s.dRow}>
                <Text style={s.dLabel}>{k}</Text>
                <Text style={[s.dValue,{color:COLORS.primary}]}>{formatCurrency(v)}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={s.section}>
          <Text style={s.sTitle}>Daftar Transaksi ({trxs.length})</Text>
          {trxs.length === 0
            ? <Text style={s.noData}>Belum ada transaksi</Text>
            : trxs.map((t,i) => {
                const raw = normM(t.payment_method);
                const lbl = raw ? (LMAP[raw]||raw.toUpperCase()) : null;
                return (
                  <View key={`trx-${t.id||i}`} style={s.trxRow}>
                    <View style={s.trxL}>
                      <Text style={s.trxInv}>{t.invoice_number}</Text>
                      <Text style={s.trxSub}>{(t.transaction_date||'').slice(0,16).replace('T',' ')} • {t.cashier_name||'-'}</Text>
                    </View>
                    <View style={s.trxR}>
                      <Text style={s.trxTotal}>{formatCurrency(t.total)}</Text>
                      {lbl ? <Text style={s.trxMethod}>{lbl}</Text> : null}
                    </View>
                  </View>
                );
              })
          }
        </View>
      </View>
    );
  };

  // ─── Render Laba Rugi ────────────────────────────────────────
  const renderProfit = () => {
    if (!profitData) return <Text style={s.noData}>Tidak ada data</Text>;
    const sm     = profitData.summary || {};
    const daily  = profitData.daily   || [];
    const byProd = profitData.by_product || [];
    const margin = (sm.total_revenue||0) > 0
      ? (((sm.total_profit||0)/(sm.total_revenue))*100).toFixed(1) : '0.0';
    return (
      <View>
        <View style={s.cardRow}>
          <StatCard label="Pendapatan"   value={formatCurrency(sm.total_revenue||0)} color={COLORS.primary} icon="trending-up-outline" />
          <StatCard label="HPP (Modal)"  value={formatCurrency(sm.total_cost||0)}    color={COLORS.warning}  icon="cart-outline" />
        </View>
        <View style={s.cardRow}>
          <StatCard label="Laba Bersih"  value={formatCurrency(sm.total_profit||0)}  color={COLORS.success}  icon="cash-outline" wide />
        </View>
        <View style={[s.section,{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}]}>
          <Text style={s.dLabel}>Margin Keuntungan</Text>
          <Text style={[s.dValue,{fontSize:FONTS.xl,color:Number(margin)>=20?COLORS.success:COLORS.warning}]}>{margin}%</Text>
        </View>
        {daily.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Laba Harian</Text>
            <View style={s.tHead}>
              {['Tanggal','Pendapatan','HPP','Laba'].map(h=><Text key={h} style={s.th}>{h}</Text>)}
            </View>
            {daily.map((d,i)=>(
              <View key={`day-${i}`} style={[s.tRow,i%2===0&&s.tRowEven]}>
                <Text style={s.td}>{(d.date||'-').slice(5)}</Text>
                <Text style={s.td}>{formatCurrency(d.revenue||0)}</Text>
                <Text style={s.td}>{formatCurrency(d.cost||0)}</Text>
                <Text style={[s.td,{color:(d.profit||0)>=0?COLORS.success:COLORS.danger}]}>{formatCurrency(d.profit||0)}</Text>
              </View>
            ))}
          </View>
        )}
        {byProd.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Laba Per Produk (Top 10)</Text>
            {byProd.slice(0,10).map((p,i)=>(
              <View key={`bp-${i}`} style={s.dRow}>
                <View style={{flex:1}}>
                  <Text style={s.dLabel} numberOfLines={1}>{p.product_name}</Text>
                  <Text style={{fontSize:FONTS.xs,color:COLORS.textDark}}>Qty: {p.total_qty} | HPP: {formatCurrency(p.cost||0)}</Text>
                </View>
                <Text style={[s.dValue,{color:(p.profit||0)>=0?COLORS.success:COLORS.danger}]}>{formatCurrency(p.profit||0)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ─── Render Per Supplier ─────────────────────────────────────
  const renderSupplier = () => {
    if (!supplierData) return <Text style={s.noData}>Tidak ada data</Text>;
    if (supplierData.length === 0) return <Text style={s.noData}>Tidak ada penjualan di periode ini</Text>;
    const totalRev = supplierData.reduce((a,x)=>a+Number(x.total_revenue||0),0);
    const totalQty = supplierData.reduce((a,x)=>a+Number(x.total_qty||0),0);
    return (
      <View>
        <View style={s.cardRow}>
          <StatCard label="Total Penjualan"   value={formatCurrency(totalRev)}          color={COLORS.primary} icon="trending-up-outline" wide />
        </View>
        <View style={s.cardRow}>
          <StatCard label="Jumlah Supplier"   value={String(supplierData.length)}       color={COLORS.warning}  icon="business-outline" />
          <StatCard label="Total Unit Terjual" value={String(totalQty)}                 color={COLORS.success} icon="cube-outline" />
        </View>
        {supplierData.map((sup,si)=>{
          const pct = totalRev>0?((Number(sup.total_revenue||0)/totalRev)*100).toFixed(1):'0';
          return (
            <View key={`sup-${si}`} style={s.supCard}>
              <View style={s.supHeader}>
                <View style={{flex:1}}>
                  <Text style={s.supName}>🏢 {sup.supplier_name}</Text>
                  <Text style={{fontSize:FONTS.xs,color:COLORS.textDark,marginTop:2}}>
                    {sup.total_transaksi||0} transaksi • {sup.total_qty||0} unit terjual
                  </Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={[s.supRev,{color:COLORS.primary}]}>{formatCurrency(sup.total_revenue||0)}</Text>
                  <Text style={{fontSize:FONTS.xs,color:COLORS.textDark}}>{pct}% dari total</Text>
                </View>
              </View>
              <View style={{height:4,backgroundColor:COLORS.border,borderRadius:2,marginVertical:8}}>
                <View style={{height:4,width:`${Math.min(100,Number(pct))}%`,backgroundColor:COLORS.primary,borderRadius:2}}/>
              </View>
              {sup.total_profit !== undefined && (
                <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:8}}>
                  <Text style={{fontSize:FONTS.xs,color:COLORS.textDark}}>Estimasi Laba Bersih</Text>
                  <Text style={{fontSize:FONTS.xs,color:COLORS.success,fontWeight:'bold'}}>{formatCurrency(sup.total_profit||0)}</Text>
                </View>
              )}
              {(sup.products||[]).length > 0 && (
                <View>
                  <View style={s.tHead}>
                    <Text style={[s.th,{flex:2}]}>Produk</Text>
                    <Text style={s.th}>Qty</Text>
                    <Text style={s.th}>Penjualan</Text>
                  </View>
                  {sup.products.map((p,pi)=>(
                    <View key={`p-${pi}`} style={[s.tRow,pi%2===0&&s.tRowEven]}>
                      <Text style={[s.td,{flex:2}]} numberOfLines={1}>{p.product_name}</Text>
                      <Text style={s.td}>{p.total_qty}</Text>
                      <Text style={[s.td,{color:COLORS.primary}]}>{formatCurrency(p.total_revenue||0)}</Text>
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
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Laporan</Text>
        <TouchableOpacity style={[s.exportBtn, exporting&&{opacity:0.6}]} onPress={exportPDF} disabled={exporting}>
          {exporting
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="download-outline" size={16} color="#fff"/><Text style={s.exportTxt}>PDF</Text></>}
        </TouchableOpacity>
      </View>

      <View style={s.presetRow}>
        {PRESETS.map((p,i)=>(
          <TouchableOpacity key={p.label} style={[s.pBtn,activePreset===i&&s.pBtnA]} onPress={()=>applyPreset(i)}>
            <Text style={[s.pTxt,activePreset===i&&s.pTxtA]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.tabRow}>
        {TABS.map((t,i)=>(
          <TouchableOpacity key={t} style={[s.tab,activeTab===i&&s.tabA]} onPress={()=>setActiveTab(i)}>
            <Ionicons name={TAB_ICONS[i]} size={13} color={activeTab===i?COLORS.primary:COLORS.textMuted}/>
            <Text style={[s.tabTxt,activeTab===i&&s.tabTxtA]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading
        ? <View style={s.loading}><ActivityIndicator size="large" color={COLORS.primary}/></View>
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
  container:    { flex:1, backgroundColor:COLORS.bgDark },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:SPACING.xl, paddingVertical:SPACING.md, backgroundColor:COLORS.bgMedium, borderBottomWidth:1, borderBottomColor:COLORS.border },
  headerTitle:  { fontSize:FONTS.lg, fontWeight:FONTS.bold, color:COLORS.textWhite },
  exportBtn:    { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:COLORS.primary, borderRadius:RADIUS.md, paddingHorizontal:SPACING.md, paddingVertical:8 },
  exportTxt:    { color:'#fff', fontSize:FONTS.sm, fontWeight:'600' },
  presetRow:    { flexDirection:'row', backgroundColor:COLORS.bgMedium, paddingHorizontal:SPACING.lg, paddingBottom:SPACING.md, gap:SPACING.sm },
  pBtn:         { flex:1, paddingVertical:7, alignItems:'center', borderRadius:RADIUS.md, backgroundColor:COLORS.bgCard, borderWidth:1, borderColor:COLORS.border },
  pBtnA:        { backgroundColor:COLORS.primary, borderColor:COLORS.primary },
  pTxt:         { fontSize:FONTS.xs, color:COLORS.textMuted, fontWeight:'500' },
  pTxtA:        { color:'#fff', fontWeight:'700' },
  tabRow:       { flexDirection:'row', backgroundColor:COLORS.bgMedium, paddingHorizontal:SPACING.lg, paddingBottom:SPACING.md, gap:SPACING.sm },
  tab:          { flex:1, paddingVertical:8, alignItems:'center', borderRadius:RADIUS.md, backgroundColor:COLORS.bgCard, borderWidth:1, borderColor:COLORS.border, gap:2 },
  tabA:         { backgroundColor:COLORS.primary+'20', borderColor:COLORS.primary },
  tabTxt:       { fontSize:FONTS.xs, color:COLORS.textMuted, fontWeight:'500' },
  tabTxtA:      { color:COLORS.primary, fontWeight:'700' },
  loading:      { flex:1, alignItems:'center', justifyContent:'center' },
  body:         { padding:SPACING.lg },
  cardRow:      { flexDirection:'row', gap:SPACING.md, marginBottom:SPACING.md },
  statCard:     { flex:1, backgroundColor:COLORS.bgCard, borderRadius:RADIUS.lg, padding:SPACING.md, borderWidth:1, borderColor:COLORS.border, borderLeftWidth:3, gap:3 },
  statCardWide: { flex:2 },
  statLbl:      { fontSize:FONTS.xs, color:COLORS.textMuted, marginTop:3 },
  statVal:      { fontSize:FONTS.md, fontWeight:'bold' },
  section:      { backgroundColor:COLORS.bgCard, borderRadius:RADIUS.lg, padding:SPACING.lg, marginBottom:SPACING.md, borderWidth:1, borderColor:COLORS.border },
  sTitle:       { fontSize:FONTS.sm, fontWeight:'bold', color:COLORS.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:SPACING.md },
  noData:       { color:COLORS.textDark, textAlign:'center', paddingVertical:SPACING.xl },
  dRow:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:COLORS.divider },
  dLabel:       { fontSize:FONTS.sm, color:COLORS.textLight, fontWeight:'500' },
  dValue:       { fontSize:FONTS.sm, color:COLORS.primary, fontWeight:'bold' },
  tHead:        { flexDirection:'row', backgroundColor:COLORS.bgMedium, borderRadius:RADIUS.sm, padding:SPACING.sm, marginBottom:4 },
  th:           { flex:1, fontSize:FONTS.xs, color:COLORS.textMuted, fontWeight:'600' },
  tRow:         { flexDirection:'row', paddingVertical:5, borderBottomWidth:1, borderBottomColor:COLORS.divider },
  tRowEven:     { backgroundColor:COLORS.bgMedium+'40' },
  td:           { flex:1, fontSize:FONTS.xs, color:COLORS.textLight },
  trxRow:       { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:COLORS.divider },
  trxL:         { flex:1, gap:2 },
  trxInv:       { fontSize:FONTS.sm, color:COLORS.textWhite, fontWeight:'600' },
  trxSub:       { fontSize:FONTS.xs, color:COLORS.textDark },
  trxR:         { alignItems:'flex-end', gap:2 },
  trxTotal:     { fontSize:FONTS.sm, color:COLORS.primary, fontWeight:'bold' },
  trxMethod:    { fontSize:FONTS.xs, color:COLORS.textDark },
  supCard:      { backgroundColor:COLORS.bgCard, borderRadius:RADIUS.lg, padding:SPACING.lg, marginBottom:SPACING.md, borderWidth:1, borderColor:COLORS.border },
  supHeader:    { flexDirection:'row', alignItems:'flex-start' },
  supName:      { fontSize:FONTS.sm, fontWeight:'bold', color:COLORS.textWhite },
  supRev:       { fontSize:FONTS.md, fontWeight:'bold' },
});