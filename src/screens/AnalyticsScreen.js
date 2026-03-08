/**
 * src/screens/AnalyticsScreen.js — Analisis & Grafik Penjualan
 * ─────────────────────────────────────────────────────────────
 * Charts TANPA library eksternal — semua pakai View native:
 *   • Line chart  → Tren penjualan harian
 *   • Bar chart   → Produk terlaris + Metode bayar
 *   • Donut chart → Per kategori
 *   • Heatmap     → Jam tersibuk
 * Data dari endpoint /reports/analytics (ditambahkan di api.js)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, RefreshControl, Modal, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - SPACING.lg * 4;

// ─── Helpers ──────────────────────────────────────────────────
const fmt        = (d) => d.toISOString().split('T')[0];
const today      = ()  => fmt(new Date());
const ago        = (n) => fmt(new Date(Date.now() - n * 86400000));
const monthStart = ()  => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };

const PERIODS = [
  { label: '7 Hari',  start: () => ago(6),   end: today },
  { label: '30 Hari', start: () => ago(29),  end: today },
  { label: '1 Tahun', start: () => ago(364), end: today },
];

const PALETTE = ['#6C63FF','#FF6584','#4CAF50','#FF9800','#2196F3','#E91E63','#00BCD4','#795548','#9C27B0','#607D8B'];

// ─── Sub-komponen ─────────────────────────────────────────────

function SectionCard({ title, icon, children }) {
  return (
    <View style={cs.card}>
      <View style={cs.cardHead}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
        <Text style={cs.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatRow({ label, value, color, sub }) {
  return (
    <View style={cs.statRow}>
      <View style={[cs.statDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={cs.statLabel}>{label}</Text>
        {sub ? <Text style={cs.statSub}>{sub}</Text> : null}
      </View>
      <Text style={[cs.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── CHART COMPONENTS ─────────────────────────────────────────

/**
 * ═══ CANDLESTICK CHART — gaya crypto/saham ═══════════════════
 *
 * Tampilan: lilin kecil-kecil rapat seperti TradingView.
 * Setiap lilin = 1 hari:
 *   • Badan   : open → close  (hijau=naik, merah=turun)
 *   • Sumbu   : shadow atas (high) dan bawah (low)
 *   • Width   : 6–8px agar banyak lilin muat
 *
 * Karena data harian tidak punya OHLC asli, kita simulate:
 *   open  = nilai hari sebelumnya (rolling)
 *   close = nilai hari ini
 *   high  = max(open,close) * 1.04
 *   low   = min(open,close) * 0.96
 */

// Helper: build OHLC array dari data harian
// ─── SMOOTH AREA CHART ────────────────────────────────────────

/**
 * SmoothAreaChart — garis tren harian dengan area warna
 * Titik = tap untuk detail. Tombol expand = landscape fullscreen.
 */
function SmoothAreaChart({ data }) {
  const [activePt, setActivePt] = useState(null);
  const [showLandscape, setShow] = useState(false);

  if (!data || data.length === 0) return <EmptyChart />;

  const W      = Dimensions.get('window').width - 80;
  const H      = 160;
  const PT     = 12; // padding top
  const PB     = 28; // padding bottom (untuk label tanggal)
  const PL     = 8;
  const PR     = 36; // ruang label Y kanan
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const vals   = data.map(function(d) { return Number(d.total_penjualan) || 0; });
  const maxVal = Math.max.apply(null, vals.concat([1]));
  const nonZ   = vals.filter(function(v) { return v > 0; });
  const minVal = nonZ.length > 0 ? Math.min.apply(null, nonZ) * 0.85 : 0;
  const range  = maxVal - minVal || 1;
  const n      = vals.length;

  function toX(i) { return PL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW); }
  function toY(v) { return PT + (1 - (v - minVal) / range) * innerH; }
  function fmtShort(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'jt';
    if (v >= 1e3) return (v / 1e3).toFixed(0) + 'rb';
    return String(Math.round(v));
  }
  function fmtDate(d) {
    var s = d.tanggal || d.date || '';
    return s.slice(5, 10);
  }

  var pts = vals.map(function(v, i) { return { x: toX(i), y: toY(v), v: v, d: data[i] }; });

  // Grid 3 level
  var gridVals = [maxVal, (maxVal + minVal) / 2, minVal];

  // Step label tanggal agar tidak terlalu rapat
  var step = Math.max(1, Math.ceil(n / 6));

  return (
    <View>
      <View style={{ height: H, width: W, overflow: 'hidden' }}>

        {/* Grid lines + label Y */}
        {gridVals.map(function(gv, gi) {
          var gy = toY(gv);
          return (
            <View key={'g' + gi} style={{ position: 'absolute', top: gy, left: PL, right: 0 }}>
              <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              <Text style={{ position: 'absolute', right: 2, top: -8, fontSize: 7, color: 'rgba(255,255,255,0.35)' }}>
                {fmtShort(gv)}
              </Text>
            </View>
          );
        })}

        {/* Garis antar titik — rotasi dari pusat segmen */}
        {pts.slice(0, -1).map(function(p1, i) {
          var p2      = pts[i + 1];
          var rising  = p2.v >= p1.v;
          var dx      = p2.x - p1.x;
          var dy      = p2.y - p1.y;
          var len     = Math.sqrt(dx * dx + dy * dy);
          var angle   = Math.atan2(dy, dx) * (180 / Math.PI);
          var cx      = (p1.x + p2.x) / 2;
          var cy      = (p1.y + p2.y) / 2;
          return (
            <View
              key={'l' + i}
              style={{
                position: 'absolute',
                left: cx - len / 2,
                top:  cy - 1.5,
                width: len,
                height: 3,
                backgroundColor: rising ? '#26a69a' : '#ef5350',
                borderRadius: 2,
                transform: [{ rotate: angle + 'deg' }],
              }}
            />
          );
        })}

        {/* Area di bawah garis */}
        {pts.slice(0, -1).map(function(p1, i) {
          var p2     = pts[i + 1];
          var rising = p2.v >= p1.v;
          var top    = Math.min(p1.y, p2.y);
          var bottom = H - PB;
          var areaH  = Math.max(bottom - top, 0);
          return (
            <View
              key={'a' + i}
              style={{
                position: 'absolute',
                left:   p1.x,
                top:    top,
                width:  Math.max(p2.x - p1.x, 0),
                height: areaH,
                backgroundColor: rising ? 'rgba(38,166,154,0.09)' : 'rgba(239,83,80,0.09)',
              }}
            />
          );
        })}

        {/* Titik data + label tanggal */}
        {pts.map(function(pt, i) {
          var rising   = i === 0 ? true : pt.v >= pts[i - 1].v;
          var color    = rising ? '#26a69a' : '#ef5350';
          var isActive = activePt === i;
          var showDate = (i % step === 0) || (i === n - 1);
          return (
            <TouchableOpacity
              key={'p' + i}
              onPress={function() { setActivePt(isActive ? null : i); }}
              style={{ position: 'absolute', left: pt.x - 10, top: pt.y - 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}
            >
              <View style={{
                width:  isActive ? 10 : 6,
                height: isActive ? 10 : 6,
                borderRadius: 6,
                backgroundColor: color,
                borderWidth: isActive ? 2 : 0,
                borderColor: '#fff',
              }} />
              {showDate ? (
                <Text style={{ position: 'absolute', top: 11, fontSize: 7, color: 'rgba(255,255,255,0.4)', width: 30, textAlign: 'center', left: -5 }}>
                  {fmtDate(pt.d)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}

        {/* Tooltip saat titik di-tap */}
        {activePt !== null && pts[activePt] ? (function() {
          var pt     = pts[activePt];
          var d      = pt.d;
          var rising = activePt === 0 ? true : pt.v >= pts[activePt - 1].v;
          var col    = rising ? '#26a69a' : '#ef5350';
          var tipX   = activePt > n * 0.6 ? pt.x - 120 : pt.x + 10;
          var tipY   = Math.max(4, Math.min(pt.y - 58, H - 100));
          return (
            <View style={{
              position: 'absolute', left: tipX, top: tipY,
              width: 112, backgroundColor: 'rgba(12,12,30,0.97)',
              borderRadius: 8, padding: 8,
              borderWidth: 1.5, borderColor: col, zIndex: 999, elevation: 8,
            }}>
              <Text style={{ fontSize: 9, color: '#bbb', marginBottom: 3, fontWeight: '600' }}>
                {(d.tanggal || d.date || '').slice(0, 10)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col }} />
                <Text style={{ fontSize: 9, color: col, fontWeight: 'bold' }}>
                  {rising ? '\u25b2 Naik' : '\u25bc Turun'}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>
                {formatCurrency(pt.v)}
              </Text>
              {d.jumlah_transaksi !== undefined ? (
                <Text style={{ fontSize: 8, color: '#888', marginTop: 2 }}>
                  {d.jumlah_transaksi} transaksi
                </Text>
              ) : null}
            </View>
          );
        })() : null}

      </View>

      {/* Legend + tombol fullscreen */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 16, height: 3, backgroundColor: '#26a69a', borderRadius: 2 }} />
            <Text style={{ fontSize: 10, color: '#26a69a' }}>Naik</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 16, height: 3, backgroundColor: '#ef5350', borderRadius: 2 }} />
            <Text style={{ fontSize: 10, color: '#ef5350' }}>Turun</Text>
          </View>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Tap titik = detail</Text>
        </View>
        <TouchableOpacity
          onPress={function() { setShow(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(108,99,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Ionicons name="expand-outline" size={12} color={COLORS.primary} />
          <Text style={{ fontSize: 10, color: COLORS.primary }}>Perbesar</Text>
        </TouchableOpacity>
      </View>

      {showLandscape ? (
        <AreaChartLandscape data={data} onClose={function() { setShow(false); }} />
      ) : null}
    </View>
  );
}

// ── Landscape fullscreen: rotasi 90°, keterangan lengkap ──────
function AreaChartLandscape({ data, onClose }) {
  const [activePt, setActivePt] = useState(null);
  const DIM = Dimensions.get('window');

  // Setelah rotate 90°: lebar visual = tinggi layar, tinggi visual = lebar layar
  const W   = DIM.height - 48;
  const H   = DIM.width  - 56;

  const PT  = 16; const PB = 40; const PL = 12; const PR = 52;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const vals   = data.map(function(d) { return Number(d.total_penjualan) || 0; });
  const maxVal = Math.max.apply(null, vals.concat([1]));
  const nonZ   = vals.filter(function(v) { return v > 0; });
  const minVal = nonZ.length > 0 ? Math.min.apply(null, nonZ) * 0.85 : 0;
  const range  = maxVal - minVal || 1;
  const n      = vals.length;

  function toX(i) { return PL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW); }
  function toY(v) { return PT + (1 - (v - minVal) / range) * innerH; }
  function fmtShort(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'jt';
    if (v >= 1e3) return (v / 1e3).toFixed(0) + 'rb';
    return String(Math.round(v));
  }
  function fmtDate(d) {
    var s = d.tanggal || d.date || '';
    return s.slice(5, 10);
  }

  var pts  = vals.map(function(v, i) { return { x: toX(i), y: toY(v), v: v, d: data[i] }; });
  var step = Math.max(1, Math.ceil(n / 12));

  // Hitung statistik
  var totalRev  = vals.reduce(function(a, b) { return a + b; }, 0);
  var avgRev    = n > 0 ? totalRev / n : 0;
  var peakIdx   = vals.indexOf(maxVal);
  var peakDate  = data[peakIdx] ? fmtDate(data[peakIdx]) : '-';

  // Grid 5 level
  var gridVals = [];
  for (var gi = 0; gi <= 4; gi++) {
    gridVals.push(minVal + (gi / 4) * (maxVal - minVal));
  }

  return (
    <Modal visible={true} animationType="fade" transparent={true} statusBarTranslucent={true} onRequestClose={onClose}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.97)', alignItems: 'center', justifyContent: 'center' }}>

        {/* Container dirotasi 90° */}
        <View style={{
          width: DIM.height,
          height: DIM.width,
          transform: [{ rotate: '90deg' }],
          backgroundColor: '#07070f',
          padding: 12,
          paddingRight: 0,
        }}>

          {/* Header: judul + statistik + tombol tutup */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, paddingRight: 14 }}>

            {/* Kiri: judul + legend */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 5 }}>
                Tren Penjualan Harian
              </Text>
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 18, height: 3, backgroundColor: '#26a69a', borderRadius: 2 }} />
                  <Text style={{ fontSize: 10, color: '#26a69a' }}>Naik</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 18, height: 3, backgroundColor: '#ef5350', borderRadius: 2 }} />
                  <Text style={{ fontSize: 10, color: '#ef5350' }}>Turun</Text>
                </View>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Tap titik = detail</Text>
              </View>
            </View>

            {/* Tengah: ringkasan statistik */}
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 12 }}>
              <View style={{ backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)' }}>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>Total Periode</Text>
                <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: 'bold' }}>{formatCurrency(totalRev)}</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(38,166,154,0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(38,166,154,0.3)' }}>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>Rata-rata/hari</Text>
                <Text style={{ fontSize: 11, color: '#26a69a', fontWeight: 'bold' }}>{formatCurrency(avgRev)}</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,193,7,0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)' }}>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>Hari Terbaik</Text>
                <Text style={{ fontSize: 11, color: '#FFC107', fontWeight: 'bold' }}>{peakDate}</Text>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{fmtShort(maxVal)}</Text>
              </View>
            </View>

            {/* Kanan: tombol tutup */}
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 8 }}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Chart area */}
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <View style={{ width: W, height: H }}>

              {/* Grid lines + label Y */}
              {gridVals.map(function(gv, gi) {
                var gy = toY(gv);
                return (
                  <View key={'g' + gi} style={{ position: 'absolute', top: gy, left: PL, right: 0 }}>
                    <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                    <Text style={{ position: 'absolute', right: 4, top: -8, fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
                      {fmtShort(gv)}
                    </Text>
                  </View>
                );
              })}

              {/* Garis antar titik */}
              {pts.slice(0, -1).map(function(p1, i) {
                var p2     = pts[i + 1];
                var rising = p2.v >= p1.v;
                var dx     = p2.x - p1.x;
                var dy     = p2.y - p1.y;
                var len    = Math.sqrt(dx * dx + dy * dy);
                var angle  = Math.atan2(dy, dx) * (180 / Math.PI);
                var cx     = (p1.x + p2.x) / 2;
                var cy     = (p1.y + p2.y) / 2;
                return (
                  <View key={'l' + i} style={{
                    position: 'absolute',
                    left:   cx - len / 2,
                    top:    cy - 2,
                    width:  len,
                    height: 4,
                    backgroundColor: rising ? '#26a69a' : '#ef5350',
                    borderRadius: 2,
                    transform: [{ rotate: angle + 'deg' }],
                  }} />
                );
              })}

              {/* Area */}
              {pts.slice(0, -1).map(function(p1, i) {
                var p2     = pts[i + 1];
                var rising = p2.v >= p1.v;
                var top    = Math.min(p1.y, p2.y);
                var areaH  = Math.max(H - PB - top, 0);
                return (
                  <View key={'a' + i} style={{
                    position: 'absolute',
                    left:   p1.x,
                    top:    top,
                    width:  Math.max(p2.x - p1.x, 0),
                    height: areaH,
                    backgroundColor: rising ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
                  }} />
                );
              })}

              {/* Titik + label tanggal */}
              {pts.map(function(pt, i) {
                var rising   = i === 0 ? true : pt.v >= pts[i - 1].v;
                var color    = rising ? '#26a69a' : '#ef5350';
                var isActive = activePt === i;
                var showDate = (i % step === 0) || (i === n - 1);
                return (
                  <TouchableOpacity
                    key={'p' + i}
                    onPress={function() { setActivePt(isActive ? null : i); }}
                    style={{ position: 'absolute', left: pt.x - 12, top: pt.y - 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width:  isActive ? 12 : 7,
                      height: isActive ? 12 : 7,
                      borderRadius: 6,
                      backgroundColor: color,
                      borderWidth: isActive ? 2 : 0,
                      borderColor: '#fff',
                    }} />
                    {showDate ? (
                      <Text style={{ position: 'absolute', top: 13, fontSize: 8, color: 'rgba(255,255,255,0.45)', width: 34, textAlign: 'center', left: -5 }}>
                        {fmtDate(pt.d)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              {/* Tooltip landscape */}
              {activePt !== null && pts[activePt] ? (function() {
                var pt     = pts[activePt];
                var d      = pt.d;
                var rising = activePt === 0 ? true : pt.v >= pts[activePt - 1].v;
                var col    = rising ? '#26a69a' : '#ef5350';
                var tipX   = activePt > n * 0.65 ? pt.x - 136 : pt.x + 12;
                var tipY   = Math.max(4, Math.min(pt.y - 68, H - 120));
                var prevV  = activePt > 0 ? pts[activePt - 1].v : null;
                var diff   = prevV !== null ? pt.v - prevV : null;
                var pct    = prevV && prevV > 0 ? ((diff / prevV) * 100).toFixed(1) : null;
                return (
                  <View style={{
                    position: 'absolute', left: tipX, top: tipY,
                    width: 128, backgroundColor: 'rgba(10,10,28,0.98)',
                    borderRadius: 10, padding: 10,
                    borderWidth: 2, borderColor: col, zIndex: 999, elevation: 10,
                  }}>
                    <Text style={{ fontSize: 10, color: '#ccc', marginBottom: 4, fontWeight: '600' }}>
                      {(d.tanggal || d.date || '').slice(0, 10)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
                      <Text style={{ fontSize: 11, color: col, fontWeight: 'bold' }}>
                        {rising ? '\u25b2 Naik' : '\u25bc Turun'}
                        {pct !== null ? '  ' + (rising ? '+' : '') + pct + '%' : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: 'bold', marginBottom: 2 }}>
                      {formatCurrency(pt.v)}
                    </Text>
                    {diff !== null ? (
                      <Text style={{ fontSize: 9, color: col, marginBottom: 2 }}>
                        {rising ? '+' : ''}{formatCurrency(diff)} vs kemarin
                      </Text>
                    ) : null}
                    {d.jumlah_transaksi !== undefined ? (
                      <Text style={{ fontSize: 9, color: '#888' }}>
                        {d.jumlah_transaksi} transaksi
                      </Text>
                    ) : null}
                  </View>
                );
              })() : null}

            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}


/** Bar chart vertikal */
function VBarChart({ data, labelKey, valueKey, color, formatValue }) {
  if (!data?.length) return <EmptyChart />;
  const vals = data.map(d => Number(d[valueKey]) || 0);
  const max  = Math.max(...vals, 1);
  const H    = 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H + 28, gap: 3 }}>
      {data.map((item, i) => {
        const h = Math.max(4, (vals[i] / max) * H);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {/* Nilai di atas bar */}
            <Text style={{ fontSize: 7, color: COLORS.textDark, marginBottom: 2 }} numberOfLines={1}>
              {formatValue ? formatValue(vals[i]) : vals[i]}
            </Text>
            <View style={{ width: '100%', height: h, backgroundColor: Array.isArray(color) ? color[i % color.length] : color, borderRadius: 3, opacity: 0.9 }} />
            <Text style={{ fontSize: 8, color: COLORS.textDark, marginTop: 3, textAlign: 'center' }} numberOfLines={1}>
              {item[labelKey]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Bar chart horizontal untuk produk terlaris */
function HBarChart({ data, nameKey = 'name', valueKey, barKey, rightKey, rightSuffix = '', subKey, subFormat, color = COLORS.primary }) {
  // barKey    : key untuk lebar progress bar
  // rightKey  : key yang tampil BESAR di kanan (misal qty untuk Terlaris)
  // subKey    : key yang tampil kecil di bawah nama (misal revenue untuk Terlaris)
  // subFormat : 'currency' | 'unit' — cara format subKey
  if (!data?.length) return <EmptyChart />;
  const _barKey = barKey || rightKey || valueKey;
  const max = Math.max(...data.map(d => Number(d[_barKey]) || 0), 1);
  const RANK_COLORS = ['#FFD700','#C0C0C0','#CD7F32'];
  return (
    <View style={{ gap: 10 }}>
      {data.slice(0, 10).map((item, i) => {
        const rightVal = Number(item[rightKey || valueKey] || 0);
        const barVal   = Number(item[_barKey] || 0);
        const pct      = (barVal / max) * 100;

        // Format nilai kanan
        const rightLabel = rightSuffix
          ? `${rightVal.toLocaleString()} ${rightSuffix}`
          : formatCurrency(rightVal);

        // Format sub (kecil bawah nama)
        let subLabel = null;
        if (subKey) {
          const sv = Number(item[subKey] || 0);
          subLabel = subFormat === 'currency' ? formatCurrency(sv)
                   : subFormat === 'unit'     ? `${sv.toLocaleString()} unit`
                   : `${sv.toLocaleString()}`;
        }

        return (
          <View key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i < 3 ? RANK_COLORS[i] : COLORS.bgMedium, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: i < 3 ? '#333' : COLORS.textDark }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONTS.xs, color: COLORS.textLight }} numberOfLines={1}>{item[nameKey] || item.product_name || item.name}</Text>
                  {subLabel && <Text style={{ fontSize: 9, color: COLORS.textDark, marginTop: 1 }}>{subLabel}</Text>}
                </View>
              </View>
              <Text style={{ fontSize: FONTS.sm, color: color, fontWeight: 'bold', marginLeft: 8 }}>{rightLabel}</Text>
            </View>
            <View style={{ height: 5, backgroundColor: COLORS.border, borderRadius: 3 }}>
              <View style={{ height: 5, width: `${pct}%`, backgroundColor: i < 3 ? PALETTE[i] : color, borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Donut/Pie chart sebagai progress bars berwarna */
function DonutChart({ data, nameKey, valueKey }) {
  if (!data?.length) return <EmptyChart />;
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0) || 1;
  return (
    <View style={{ gap: 9 }}>
      {data.slice(0, 6).map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.round((val / total) * 100);
        const clr = PALETTE[i % PALETTE.length];
        return (
          <View key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: clr }} />
                <View>
                  <Text style={{ fontSize: FONTS.xs, color: COLORS.textLight }}>{item[nameKey] || item.kategori}</Text>
                  <Text style={{ fontSize: 9, color: COLORS.textDark }}>
                    {item.total_qty ? `${Number(item.total_qty).toLocaleString()} unit` : ''}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: FONTS.xs, color: clr, fontWeight: 'bold' }}>{pct}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3 }}>
              <View style={{ height: 6, width: `${pct}%`, backgroundColor: clr, borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Heatmap jam sibuk (24 jam) */
function HourlyHeatmap({ data }) {
  const [selectedHour, setSelectedHour] = useState(null);

  if (!data || data.length === 0) return <EmptyChart />;

  // Isi semua 24 jam, default 0
  var filled = Array(24).fill(0);
  data.forEach(function(h) {
    filled[Number(h.jam)] = Number(h.jumlah_transaksi) || 0;
  });

  var max      = Math.max.apply(null, filled.concat([1]));
  var total    = filled.reduce(function(a, b) { return a + b; }, 0);
  var peakHour = filled.indexOf(max);

  // Sesi waktu
  var sessions = [
    { key: 'dinihari', icon: '🌙', label: 'Dini Hari',  range: '00:00–05:59', hours: [0,1,2,3,4,5],    desc: 'Tengah malam sampai subuh' },
    { key: 'pagi',     icon: '🌅', label: 'Pagi',        range: '06:00–11:59', hours: [6,7,8,9,10,11],  desc: 'Jam buka toko pagi' },
    { key: 'siang',    icon: '☀️', label: 'Siang',       range: '12:00–17:59', hours: [12,13,14,15,16,17], desc: 'Tengah hari hingga sore' },
    { key: 'malam',    icon: '🌆', label: 'Malam',       range: '18:00–23:59', hours: [18,19,20,21,22,23], desc: 'Sore hingga tutup toko' },
  ];

  var sessionTotals = sessions.map(function(s) {
    return s.hours.reduce(function(acc, h) { return acc + filled[h]; }, 0);
  });
  var bussiestSessionIdx = sessionTotals.indexOf(Math.max.apply(null, sessionTotals));

  // 5 level warna dan label
  function getLevel(v) {
    if (v === 0) return 0;
    var p = v / max;
    if (p <= 0.2)  return 1;
    if (p <= 0.45) return 2;
    if (p <= 0.7)  return 3;
    if (p <= 0.88) return 4;
    return 5;
  }
  var LEVEL_COLOR = [
    'rgba(255,255,255,0.04)',  // 0 kosong
    'rgba(100,120,255,0.22)',  // 1 sangat sepi
    'rgba(108,99,255,0.50)',   // 2 sepi
    'rgba(108,99,255,0.82)',   // 3 sedang
    'rgba(255,160,30,0.90)',   // 4 ramai
    'rgba(239,83,80,1.00)',    // 5 tersibuk
  ];
  var LEVEL_LABEL = ['Tidak ada', 'Sangat sepi', 'Sepi', 'Sedang', 'Ramai', 'Tersibuk'];
  var LEVEL_EMOJI = ['—', '😴', '🙂', '😊', '🔥', '🚀'];

  function fmtHour(h) { return String(h).padStart(2,'0') + ':00'; }
  function getBarForSession(si) {
    var max2 = Math.max.apply(null, sessionTotals.concat([1]));
    return sessionTotals[si] / max2 * 100;
  }

  var selHour  = selectedHour;
  var selCount = selHour !== null ? filled[selHour] : 0;
  var selLevel = selHour !== null ? getLevel(selCount) : 0;
  var selPct   = selHour !== null && total > 0 ? ((selCount / total) * 100).toFixed(1) : '0';

  // Rekomenasi otomatis
  var peakSessIdx  = sessionTotals.indexOf(Math.max.apply(null, sessionTotals));
  var peakSessName = sessions[peakSessIdx] ? sessions[peakSessIdx].label : '-';

  return (
    <View style={{ gap: 0 }}>

      {/* ══ RINGKASAN ATAS ══ */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>

        {/* Jam tersibuk */}
        <View style={{ flex: 1, backgroundColor: 'rgba(239,83,80,0.12)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(239,83,80,0.35)', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>🚀</Text>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#ef5350', marginTop: 2 }}>
            {fmtHour(peakHour)}
          </Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 }}>
            Jam Tersibuk{'\n'}{max} transaksi
          </Text>
        </View>

        {/* Sesi tersibuk */}
        <View style={{ flex: 1, backgroundColor: 'rgba(255,160,30,0.12)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,160,30,0.35)', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>{sessions[peakSessIdx].icon}</Text>
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#FFA01E', marginTop: 2 }}>
            {peakSessName}
          </Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 }}>
            Sesi Tersibuk{'\n'}{sessionTotals[peakSessIdx]} transaksi
          </Text>
        </View>

        {/* Total transaksi */}
        <View style={{ flex: 1, backgroundColor: 'rgba(108,99,255,0.12)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(108,99,255,0.35)', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>📊</Text>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 }}>
            {total}
          </Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 }}>
            Total Transaksi{'\n'}Periode Ini
          </Text>
        </View>
      </View>

      {/* ══ PANDUAN WARNA ══ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Sepi</Text>
        <View style={{ flex: 1, flexDirection: 'row', marginHorizontal: 8, gap: 3 }}>
          {[1,2,3,4,5].map(function(lv) {
            return (
              <View key={lv} style={{ flex: 1, height: 10, backgroundColor: LEVEL_COLOR[lv], borderRadius: 3 }} />
            );
          })}
        </View>
        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Tersibuk</Text>
      </View>

      {/* ══ GRID JAM PER SESI ══ */}
      {sessions.map(function(session, si) {
        var sTotal = sessionTotals[si];
        var sPct   = total > 0 ? ((sTotal / total) * 100).toFixed(0) : '0';
        var isBusiest = si === bussiestSessionIdx && sTotal > 0;

        return (
          <View key={session.key} style={{
            marginBottom: 12,
            backgroundColor: isBusiest ? 'rgba(255,160,30,0.05)' : 'transparent',
            borderRadius: 10,
            borderWidth: isBusiest ? 1 : 0,
            borderColor: 'rgba(255,160,30,0.25)',
            padding: isBusiest ? 8 : 0,
            paddingBottom: isBusiest ? 10 : 0,
          }}>

            {/* Header sesi */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ fontSize: 16 }}>{session.icon}</Text>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: FONTS.xs, color: COLORS.textLight, fontWeight: '700' }}>{session.label}</Text>
                    {isBusiest ? (
                      <View style={{ backgroundColor: 'rgba(255,160,30,0.25)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: '#FFA01E', fontWeight: 'bold' }}>TERSIBUK</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 9, color: COLORS.textDark }}>{session.range}  •  {session.desc}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FONTS.sm, color: isBusiest ? '#FFA01E' : COLORS.primary, fontWeight: 'bold' }}>{sTotal} trx</Text>
                <Text style={{ fontSize: 9, color: COLORS.textDark }}>{sPct}% dari total</Text>
              </View>
            </View>

            {/* Bar mini sesi */}
            <View style={{ height: 3, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 8 }}>
              <View style={{ height: 3, width: getBarForSession(si) + '%', backgroundColor: isBusiest ? '#FFA01E' : COLORS.primary, borderRadius: 2 }} />
            </View>

            {/* Kotak jam — lebih besar, lebih jelas */}
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {session.hours.map(function(h) {
                var count    = filled[h];
                var lv       = getLevel(count);
                var isActive = selectedHour === h;
                var isPeak   = h === peakHour && count > 0;
                return (
                  <TouchableOpacity
                    key={h}
                    onPress={function() { setSelectedHour(isActive ? null : h); }}
                    activeOpacity={0.7}
                    style={{ flex: 1 }}
                  >
                    <View style={{
                      height: 52,
                      borderRadius: 8,
                      backgroundColor: LEVEL_COLOR[lv],
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isActive ? 2 : isPeak ? 1.5 : 1,
                      borderColor: isActive ? '#fff' : isPeak ? '#FFA01E' : 'rgba(255,255,255,0.06)',
                    }}>
                      {/* Label jam */}
                      <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700', lineHeight: 13 }}>
                        {String(h).padStart(2,'0')}
                      </Text>
                      <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.55)', lineHeight: 11 }}>
                        :00
                      </Text>
                      {/* Jumlah transaksi */}
                      {count > 0 ? (
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600', marginTop: 2 }}>
                          {count}x
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                          —
                        </Text>
                      )}
                      {/* Badge jam tersibuk */}
                      {isPeak ? (
                        <View style={{ position: 'absolute', top: -5, right: -3, backgroundColor: '#ef5350', borderRadius: 5, paddingHorizontal: 3, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 6, color: '#fff', fontWeight: 'bold' }}>TOP</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* ══ DETAIL JAM YANG DIPILIH ══ */}
      {selHour !== null ? (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginTop: 2, borderWidth: 1, borderColor: LEVEL_COLOR[selLevel] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: LEVEL_COLOR[selLevel], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Text style={{ fontSize: 20 }}>{LEVEL_EMOJI[selLevel]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONTS.md, color: COLORS.textWhite, fontWeight: 'bold' }}>
                Pukul {fmtHour(selHour)} – {String(selHour + 1).padStart(2,'0')}:00
              </Text>
              <Text style={{ fontSize: FONTS.xs, color: COLORS.textLight, marginTop: 2 }}>
                {selCount} transaksi  •  {selPct}% dari semua transaksi hari ini
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LEVEL_COLOR[selLevel] }} />
                <Text style={{ fontSize: FONTS.xs, color: COLORS.textLight, fontWeight: '600' }}>{LEVEL_LABEL[selLevel]}</Text>
                {selHour === peakHour && selCount > 0 ? (
                  <View style={{ backgroundColor: 'rgba(239,83,80,0.2)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, color: '#ef5350', fontWeight: 'bold' }}>⚡ Ini jam PALING SIBUK</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* ══ REKOMENDASI OTOMATIS ══ */}
      <View style={{ marginTop: 14, backgroundColor: 'rgba(38,166,154,0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(38,166,154,0.25)' }}>
        <Text style={{ fontSize: FONTS.xs, color: '#26a69a', fontWeight: 'bold', marginBottom: 6 }}>
          💡 Rekomendasi
        </Text>
        <Text style={{ fontSize: FONTS.xs, color: COLORS.textLight, lineHeight: 18 }}>
          {'Jam tersibuk toko kamu adalah pukul '}
          <Text style={{ fontWeight: 'bold', color: '#ef5350' }}>{fmtHour(peakHour)}</Text>
          {' di sesi '}
          <Text style={{ fontWeight: 'bold', color: '#FFA01E' }}>{peakSessName}</Text>
          {'. Pastikan stok lengkap dan kasir siap sebelum jam tersebut.\n'}
          {total === 0 ? 'Belum ada data transaksi untuk periode ini.' :
           sessionTotals[0] > sessionTotals[1] ? 'Perhatian: ada aktivitas di dini hari, cek apakah normal.' :
           ''}
        </Text>
      </View>

    </View>
  );
}


function EmptyChart() {
  return (
    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
      <Ionicons name="bar-chart-outline" size={32} color={COLORS.border} />
      <Text style={{ color: COLORS.textDark, fontSize: FONTS.xs, marginTop: 8 }}>Belum ada data</Text>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function AnalyticsScreen({ navigation }) {
  const [period,      setPeriod]      = useState(0);
  const [isLoading,   setIsLoading]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [data,        setData]        = useState(null);

  const load = useCallback(async (pidx = period, showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setIsLoading(true);
    const p = PERIODS[pidx];
    const r = await analyticsAPI.get(p.start(), p.end());
    if (r.success) setData(r.data);
    if (showRefresh) setRefreshing(false); else setIsLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Refresh saat app kembali ke foreground (paling efisien — tidak buang baterai)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load(period, false);
    });
    return () => sub.remove();
  }, [period, load]);

  // Backup: auto-refresh setiap 1 menit untuk real-time saat layar tetap terbuka
  useEffect(() => {
    const timer = setInterval(() => load(period, false), 60 * 1000);
    return () => clearInterval(timer);
  }, [period, load]);

  const changePeriod = (i) => {
    setPeriod(i);
    load(i);
  };

  const sm = data?.summary || {};
  const margin = sm.total_revenue > 0 ? ((sm.total_profit / sm.total_revenue) * 100).toFixed(1) : '0.0';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Analytics</Text>
        <TouchableOpacity onPress={() => load(period, true)}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Period pills */}
      <View style={s.periodRow}>
        {PERIODS.map((p, i) => (
          <TouchableOpacity key={p.label} style={[s.pBtn, period === i && s.pBtnA]} onPress={() => changePeriod(i)}>
            <Text style={[s.pTxt, period === i && s.pTxtA]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadTxt}>Memuat data analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(period, true)} tintColor={COLORS.primary} />}
        >
          {/* Summary Cards */}
          <View style={s.statGrid}>
            <View style={[s.statCard, { borderLeftColor: COLORS.primary }]}>
              <Ionicons name="trending-up-outline" size={18} color={COLORS.primary} />
              <Text style={s.statLbl}>Total Penjualan</Text>
              <Text style={[s.statVal, { color: COLORS.primary }]}>{formatCurrency(sm.total_revenue || 0)}</Text>
              <Text style={s.statSub}>{sm.total_transaksi || 0} transaksi</Text>
            </View>
            <View style={[s.statCard, { borderLeftColor: COLORS.success }]}>
              <Ionicons name="cash-outline" size={18} color={COLORS.success} />
              <Text style={s.statLbl}>Laba Bersih</Text>
              <Text style={[s.statVal, { color: COLORS.success }]}>{formatCurrency(sm.total_profit || 0)}</Text>
              <Text style={s.statSub}>Margin {margin}%</Text>
            </View>
            <View style={[s.statCard, { borderLeftColor: COLORS.warning }]}>
              <Ionicons name="receipt-outline" size={18} color={COLORS.warning} />
              <Text style={s.statLbl}>Rata-rata Transaksi</Text>
              <Text style={[s.statVal, { color: COLORS.warning }]}>{formatCurrency(sm.avg_transaction || 0)}</Text>
              <Text style={s.statSub}>Per transaksi</Text>
            </View>
            <View style={[s.statCard, { borderLeftColor: '#9C27B0' }]}>
              <Ionicons name="cube-outline" size={18} color="#9C27B0" />
              <Text style={s.statLbl}>Item Terjual</Text>
              <Text style={[s.statVal, { color: '#9C27B0' }]}>{Number(sm.total_item_terjual || 0).toLocaleString()}</Text>
              <Text style={s.statSub}>unit produk</Text>
            </View>
          </View>

          {/* Tren Harian */}
          <SectionCard title="Tren Penjualan Harian" icon="trending-up-outline">
            <SmoothAreaChart data={data?.daily_sales || []} />
          </SectionCard>

          {/* Produk Terlaris — diurutkan by qty terjual */}
          <SectionCard title="Produk Terlaris" icon="trophy-outline">
            <HBarChart
              data={[...(data?.top_products || [])].sort((a, b) => (Number(b.total_qty) || 0) - (Number(a.total_qty) || 0))}
              nameKey="product_name"
              barKey="total_qty"
              rightKey="total_qty"
              rightSuffix="unit"
              subKey="total_revenue"
              subFormat="currency"
              color={COLORS.primary}
            />
          </SectionCard>

          {/* Produk Nominal Tertinggi — diurutkan by harga jual tertinggi */}
          <SectionCard title="Produk Harga Tertinggi" icon="pricetag-outline">
            <HBarChart
              data={[...(data?.top_products || [])].sort((a, b) => (Number(b.total_revenue) || 0) - (Number(a.total_revenue) || 0))}
              nameKey="product_name"
              barKey="total_revenue"
              rightKey="total_revenue"
              subKey="total_qty"
              subFormat="unit"
              color="#9C27B0"
            />
          </SectionCard>

          {/* Per Kategori — sorted by total_qty */}
          <SectionCard title="Penjualan per Kategori" icon="pie-chart-outline">
            <DonutChart
              data={[...(data?.by_category || [])].sort((a, b) => (Number(b.total_qty) || 0) - (Number(a.total_qty) || 0))}
              nameKey="kategori"
              valueKey="total_penjualan"
            />
          </SectionCard>

          {/* Metode Pembayaran */}
          <SectionCard title="Metode Pembayaran" icon="card-outline">
            {data?.by_payment?.length > 0 ? (
              <VBarChart
                data={data.by_payment.map(p => ({
                  ...p,
                  label_display: { cash:'Tunai', card:'Kartu', transfer:'Transfer', qris:'QRIS', unknown:'QRIS' }[p.payment_method] || 'QRIS',
                }))}
                labelKey="label_display"
                valueKey="total_nilai"
                color={PALETTE}
                formatValue={(v) => `${(v/1000000).toFixed(1)}jt`}
              />
            ) : <EmptyChart />}
            {data?.by_payment?.map((p, i) => (
              <StatRow
                key={i}
                label={{ cash:'Tunai', card:'Kartu', transfer:'Transfer', qris:'QRIS', unknown:'QRIS' }[p.payment_method] || 'QRIS'}
                value={formatCurrency(p.total_nilai || 0)}
                color={PALETTE[i % PALETTE.length]}
                sub={`${p.jumlah || 0} transaksi`}
              />
            ))}
          </SectionCard>

          {/* Jam Tersibuk */}
          <SectionCard title="Pola Jam Transaksi" icon="time-outline">
            <HourlyHeatmap data={data?.hourly_pattern || []} />
          </SectionCard>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  card:      { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardHead:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  cardTitle: { fontSize: FONTS.sm, fontWeight: 'bold', color: COLORS.textWhite, textTransform: 'uppercase', letterSpacing: 0.5 },
  statRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.sm },
  statDot:   { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: FONTS.sm, color: COLORS.textLight },
  statSub:   { fontSize: FONTS.xs, color: COLORS.textDark },
  statValue: { fontSize: FONTS.sm, fontWeight: 'bold' },
});

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bgDark },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.bgMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle:{ fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  periodRow:  { flexDirection: 'row', backgroundColor: COLORS.bgMedium, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  pBtn:       { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  pBtnA:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pTxt:       { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '500' },
  pTxtA:      { color: '#fff', fontWeight: '700' },
  loading:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt:    { color: COLORS.textMuted, fontSize: FONTS.sm },
  body:       { padding: SPACING.lg },
  statGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard:   { width: (SW - SPACING.lg * 2 - SPACING.sm) / 2 - 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, gap: 3 },
  statLbl:    { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4 },
  statVal:    { fontSize: FONTS.md, fontWeight: 'bold' },
  statSub:    { fontSize: FONTS.xs, color: COLORS.textDark },
});