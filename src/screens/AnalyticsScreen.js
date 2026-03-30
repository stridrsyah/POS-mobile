/**
 * src/screens/AnalyticsScreen.js — Analisis & Grafik Penjualan (Theme-Aware)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, RefreshControl, Modal, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';

const { width: SW } = Dimensions.get('window');

const fmt        = (d) => d.toISOString().split('T')[0];
const today      = ()  => fmt(new Date());
const ago        = (n) => fmt(new Date(Date.now() - n * 86400000));

const PERIODS = [
  { label: '7 Hari',  start: () => ago(6),   end: today },
  { label: '30 Hari', start: () => ago(29),  end: today },
  { label: '1 Tahun', start: () => ago(364), end: today },
];

const PALETTE = ['#6C63FF','#FF6584','#4CAF50','#FF9800','#2196F3','#E91E63','#00BCD4','#795548','#9C27B0','#607D8B'];

function SectionCard({ title, icon, children, colors }) {
  return (
    <View style={[cs.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={cs.cardHead}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={[cs.cardTitle, { color: colors.textWhite }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatRow({ label, value, color, sub, colors }) {
  return (
    <View style={[cs.statRow, { borderBottomColor: colors.divider }]}>
      <View style={[cs.statDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[cs.statLabel, { color: colors.textLight }]}>{label}</Text>
        {sub ? <Text style={[cs.statSub, { color: colors.textDark }]}>{sub}</Text> : null}
      </View>
      <Text style={[cs.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function EmptyChart({ colors }) {
  return (
    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
      <Ionicons name="bar-chart-outline" size={32} color={colors.border} />
      <Text style={{ color: colors.textDark, fontSize: FONTS.xs, marginTop: 8 }}>Belum ada data</Text>
    </View>
  );
}

function SmoothAreaChart({ data, colors }) {
  const [activePt, setActivePt] = useState(null);
  const [showLandscape, setShow] = useState(false);

  if (!data || data.length === 0) return <EmptyChart colors={colors} />;

  const W      = Dimensions.get('window').width - 80;
  const H      = 160;
  const PT     = 12;
  const PB     = 28;
  const PL     = 8;
  const PR     = 36;
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
  var gridVals = [maxVal, (maxVal + minVal) / 2, minVal];
  var step = Math.max(1, Math.ceil(n / 6));

  const gridLineColor = colors.border;
  const gridTextColor = colors.textDark;

  return (
    <View>
      <View style={{ height: H, width: W, overflow: 'hidden' }}>
        {gridVals.map(function(gv, gi) {
          var gy = toY(gv);
          return (
            <View key={'g' + gi} style={{ position: 'absolute', top: gy, left: PL, right: 0 }}>
              <View style={{ height: 0.5, backgroundColor: gridLineColor }} />
              <Text style={{ position: 'absolute', right: 2, top: -8, fontSize: 7, color: gridTextColor }}>
                {fmtShort(gv)}
              </Text>
            </View>
          );
        })}

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
            <View key={'l' + i} style={{
              position: 'absolute', left: cx - len / 2, top: cy - 1.5,
              width: len, height: 3,
              backgroundColor: rising ? '#26a69a' : '#ef5350',
              borderRadius: 2, transform: [{ rotate: angle + 'deg' }],
            }} />
          );
        })}

        {pts.slice(0, -1).map(function(p1, i) {
          var p2     = pts[i + 1];
          var rising = p2.v >= p1.v;
          var top    = Math.min(p1.y, p2.y);
          var bottom = H - PB;
          var areaH  = Math.max(bottom - top, 0);
          return (
            <View key={'a' + i} style={{
              position: 'absolute', left: p1.x, top: top,
              width: Math.max(p2.x - p1.x, 0), height: areaH,
              backgroundColor: rising ? 'rgba(38,166,154,0.09)' : 'rgba(239,83,80,0.09)',
            }} />
          );
        })}

        {pts.map(function(pt, i) {
          var rising   = i === 0 ? true : pt.v >= pts[i - 1].v;
          var color    = rising ? '#26a69a' : '#ef5350';
          var isActive = activePt === i;
          var showDate = (i % step === 0) || (i === n - 1);
          return (
            <TouchableOpacity key={'p' + i}
              onPress={function() { setActivePt(isActive ? null : i); }}
              style={{ position: 'absolute', left: pt.x - 10, top: pt.y - 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}
            >
              <View style={{ width: isActive ? 10 : 6, height: isActive ? 10 : 6, borderRadius: 6, backgroundColor: color, borderWidth: isActive ? 2 : 0, borderColor: '#fff' }} />
              {showDate ? (
                <Text style={{ position: 'absolute', top: 11, fontSize: 7, color: gridTextColor, width: 30, textAlign: 'center', left: -5 }}>
                  {fmtDate(pt.d)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}

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
              width: 112, backgroundColor: colors.bgCard,
              borderRadius: 8, padding: 8,
              borderWidth: 1.5, borderColor: col, zIndex: 999, elevation: 8,
            }}>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3, fontWeight: '600' }}>
                {(d.tanggal || d.date || '').slice(0, 10)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col }} />
                <Text style={{ fontSize: 9, color: col, fontWeight: 'bold' }}>
                  {rising ? '▲ Naik' : '▼ Turun'}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textWhite, fontWeight: 'bold' }}>
                {formatCurrency(pt.v)}
              </Text>
              {d.jumlah_transaksi !== undefined ? (
                <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
                  {d.jumlah_transaksi} transaksi
                </Text>
              ) : null}
            </View>
          );
        })() : null}
      </View>

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
          <Text style={{ fontSize: 10, color: colors.textDark }}>Tap titik = detail</Text>
        </View>
        <TouchableOpacity
          onPress={function() { setShow(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Ionicons name="expand-outline" size={12} color={colors.primary} />
          <Text style={{ fontSize: 10, color: colors.primary }}>Perbesar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function VBarChart({ data, labelKey, valueKey, color, formatValue, colors }) {
  if (!data?.length) return <EmptyChart colors={colors} />;
  const vals = data.map(d => Number(d[valueKey]) || 0);
  const max  = Math.max(...vals, 1);
  const H    = 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H + 28, gap: 3 }}>
      {data.map((item, i) => {
        const h = Math.max(4, (vals[i] / max) * H);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: colors.textDark, marginBottom: 2 }} numberOfLines={1}>
              {formatValue ? formatValue(vals[i]) : vals[i]}
            </Text>
            <View style={{ width: '100%', height: h, backgroundColor: Array.isArray(color) ? color[i % color.length] : color, borderRadius: 3, opacity: 0.9 }} />
            <Text style={{ fontSize: 8, color: colors.textDark, marginTop: 3, textAlign: 'center' }} numberOfLines={1}>
              {item[labelKey]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function HBarChart({ data, nameKey = 'name', valueKey, barKey, rightKey, rightSuffix = '', subKey, subFormat, color, colors }) {
  if (!data?.length) return <EmptyChart colors={colors} />;
  const _barKey = barKey || rightKey || valueKey;
  const max = Math.max(...data.map(d => Number(d[_barKey]) || 0), 1);
  const RANK_COLORS = ['#FFD700','#C0C0C0','#CD7F32'];
  const _color = color || colors.primary;
  return (
    <View style={{ gap: 10 }}>
      {data.slice(0, 10).map((item, i) => {
        const rightVal = Number(item[rightKey || valueKey] || 0);
        const barVal   = Number(item[_barKey] || 0);
        const pct      = (barVal / max) * 100;
        const rightLabel = rightSuffix
          ? `${rightVal.toLocaleString()} ${rightSuffix}`
          : formatCurrency(rightVal);
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
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i < 3 ? RANK_COLORS[i] : colors.bgSurface, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: i < 3 ? '#333' : colors.textDark }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONTS.xs, color: colors.textLight }} numberOfLines={1}>{item[nameKey] || item.product_name || item.name}</Text>
                  {subLabel && <Text style={{ fontSize: 9, color: colors.textDark, marginTop: 1 }}>{subLabel}</Text>}
                </View>
              </View>
              <Text style={{ fontSize: FONTS.sm, color: _color, fontWeight: 'bold', marginLeft: 8 }}>{rightLabel}</Text>
            </View>
            <View style={{ height: 5, backgroundColor: colors.border, borderRadius: 3 }}>
              <View style={{ height: 5, width: `${pct}%`, backgroundColor: i < 3 ? PALETTE[i] : _color, borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DonutChart({ data, nameKey, valueKey, colors }) {
  if (!data?.length) return <EmptyChart colors={colors} />;
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
                  <Text style={{ fontSize: FONTS.xs, color: colors.textLight }}>{item[nameKey] || item.kategori}</Text>
                  <Text style={{ fontSize: 9, color: colors.textDark }}>
                    {item.total_qty ? `${Number(item.total_qty).toLocaleString()} unit` : ''}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: FONTS.xs, color: clr, fontWeight: 'bold' }}>{pct}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
              <View style={{ height: 6, width: `${pct}%`, backgroundColor: clr, borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function HourlyHeatmap({ data, colors }) {
  const [selectedHour, setSelectedHour] = useState(null);

  if (!data || data.length === 0) return <EmptyChart colors={colors} />;

  var filled = Array(24).fill(0);
  data.forEach(function(h) {
    filled[Number(h.jam)] = Number(h.jumlah_transaksi) || 0;
  });

  var max      = Math.max.apply(null, filled.concat([1]));
  var total    = filled.reduce(function(a, b) { return a + b; }, 0);
  var peakHour = filled.indexOf(max);

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
    colors.border,
    'rgba(100,120,255,0.22)',
    'rgba(108,99,255,0.50)',
    'rgba(108,99,255,0.82)',
    'rgba(255,160,30,0.90)',
    'rgba(239,83,80,1.00)',
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

  var peakSessIdx  = sessionTotals.indexOf(Math.max.apply(null, sessionTotals));
  var peakSessName = sessions[peakSessIdx] ? sessions[peakSessIdx].label : '-';

  return (
    <View style={{ gap: 0 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(239,83,80,0.12)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(239,83,80,0.35)', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>🚀</Text>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#ef5350', marginTop: 2 }}>{fmtHour(peakHour)}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>Jam Tersibuk{'\n'}{max} transaksi</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,160,30,0.12)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,160,30,0.35)', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>{sessions[peakSessIdx].icon}</Text>
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#FFA01E', marginTop: 2 }}>{peakSessName}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>Sesi Tersibuk{'\n'}{sessionTotals[peakSessIdx]} transaksi</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.primary + '12', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.primary + '35', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>📊</Text>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.primary, marginTop: 2 }}>{total}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>Total Transaksi{'\n'}Periode Ini</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
        <Text style={{ fontSize: 9, color: colors.textDark }}>Sepi</Text>
        <View style={{ flex: 1, flexDirection: 'row', marginHorizontal: 8, gap: 3 }}>
          {[1,2,3,4,5].map(function(lv) {
            return <View key={lv} style={{ flex: 1, height: 10, backgroundColor: LEVEL_COLOR[lv], borderRadius: 3 }} />;
          })}
        </View>
        <Text style={{ fontSize: 9, color: colors.textDark }}>Tersibuk</Text>
      </View>

      {sessions.map(function(session, si) {
        var sTotal = sessionTotals[si];
        var sPct   = total > 0 ? ((sTotal / total) * 100).toFixed(0) : '0';
        var isBusiest = si === bussiestSessionIdx && sTotal > 0;
        return (
          <View key={session.key} style={{
            marginBottom: 12,
            backgroundColor: isBusiest ? 'rgba(255,160,30,0.05)' : 'transparent',
            borderRadius: 10, borderWidth: isBusiest ? 1 : 0,
            borderColor: 'rgba(255,160,30,0.25)', padding: isBusiest ? 8 : 0, paddingBottom: isBusiest ? 10 : 0,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ fontSize: 16 }}>{session.icon}</Text>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: FONTS.xs, color: colors.textLight, fontWeight: '700' }}>{session.label}</Text>
                    {isBusiest ? (
                      <View style={{ backgroundColor: 'rgba(255,160,30,0.25)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: '#FFA01E', fontWeight: 'bold' }}>TERSIBUK</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 9, color: colors.textDark }}>{session.range}  •  {session.desc}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FONTS.sm, color: isBusiest ? '#FFA01E' : colors.primary, fontWeight: 'bold' }}>{sTotal} trx</Text>
                <Text style={{ fontSize: 9, color: colors.textDark }}>{sPct}% dari total</Text>
              </View>
            </View>
            <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 2, marginBottom: 8 }}>
              <View style={{ height: 3, width: getBarForSession(si) + '%', backgroundColor: isBusiest ? '#FFA01E' : colors.primary, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {session.hours.map(function(h) {
                var count    = filled[h];
                var lv       = getLevel(count);
                var isActive = selectedHour === h;
                var isPeak   = h === peakHour && count > 0;
                return (
                  <TouchableOpacity key={h}
                    onPress={function() { setSelectedHour(isActive ? null : h); }}
                    activeOpacity={0.7} style={{ flex: 1 }}
                  >
                    <View style={{
                      height: 52, borderRadius: 8, backgroundColor: LEVEL_COLOR[lv],
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: isActive ? 2 : isPeak ? 1.5 : 1,
                      borderColor: isActive ? colors.textWhite : isPeak ? '#FFA01E' : 'rgba(255,255,255,0.06)',
                    }}>
                      <Text style={{ fontSize: 10, color: colors.textWhite, fontWeight: '700', lineHeight: 13 }}>{String(h).padStart(2,'0')}</Text>
                      <Text style={{ fontSize: 7, color: colors.textMuted, lineHeight: 11 }}>:00</Text>
                      {count > 0 ? (
                        <Text style={{ fontSize: 9, color: colors.textWhite, fontWeight: '600', marginTop: 2 }}>{count}x</Text>
                      ) : (
                        <Text style={{ fontSize: 9, color: colors.textDark, marginTop: 2 }}>—</Text>
                      )}
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

      {selHour !== null ? (
        <View style={{ backgroundColor: colors.bgSurface, borderRadius: 12, padding: 14, marginTop: 2, borderWidth: 1, borderColor: LEVEL_COLOR[selLevel] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: LEVEL_COLOR[selLevel], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border }}>
              <Text style={{ fontSize: 20 }}>{LEVEL_EMOJI[selLevel]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONTS.md, color: colors.textWhite, fontWeight: 'bold' }}>
                Pukul {fmtHour(selHour)} – {String(selHour + 1).padStart(2,'0')}:00
              </Text>
              <Text style={{ fontSize: FONTS.xs, color: colors.textLight, marginTop: 2 }}>
                {selCount} transaksi  •  {selPct}% dari semua transaksi
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LEVEL_COLOR[selLevel] }} />
                <Text style={{ fontSize: FONTS.xs, color: colors.textLight, fontWeight: '600' }}>{LEVEL_LABEL[selLevel]}</Text>
                {selHour === peakHour && selCount > 0 ? (
                  <View style={{ backgroundColor: 'rgba(239,83,80,0.2)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, color: '#ef5350', fontWeight: 'bold' }}>⚡ Jam PALING SIBUK</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: 14, backgroundColor: 'rgba(38,166,154,0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(38,166,154,0.25)' }}>
        <Text style={{ fontSize: FONTS.xs, color: '#26a69a', fontWeight: 'bold', marginBottom: 6 }}>💡 Rekomendasi</Text>
        <Text style={{ fontSize: FONTS.xs, color: colors.textLight, lineHeight: 18 }}>
          {'Jam tersibuk toko kamu adalah pukul '}
          <Text style={{ fontWeight: 'bold', color: '#ef5350' }}>{fmtHour(peakHour)}</Text>
          {' di sesi '}
          <Text style={{ fontWeight: 'bold', color: '#FFA01E' }}>{peakSessName}</Text>
          {'. Pastikan stok lengkap dan kasir siap sebelum jam tersebut.'}
        </Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen({ navigation }) {
  const { colors } = useTheme();
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

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load(period, false);
    });
    return () => sub.remove();
  }, [period, load]);

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

  const s = getStyles(colors);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.bgMedium, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textWhite }]}>Analytics</Text>
        <TouchableOpacity onPress={() => load(period, true)}>
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[s.periodRow, { backgroundColor: colors.bgMedium }]}>
        {PERIODS.map((p, i) => (
          <TouchableOpacity key={p.label}
            style={[s.pBtn, { backgroundColor: period === i ? colors.primary : colors.bgCard, borderColor: period === i ? colors.primary : colors.border }]}
            onPress={() => changePeriod(i)}
          >
            <Text style={[s.pTxt, { color: period === i ? '#fff' : colors.textMuted }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadTxt, { color: colors.textMuted }]}>Memuat data analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(period, true)} tintColor={colors.primary} />}
        >
          <View style={s.statGrid}>
            {[
              { label: 'Total Penjualan', value: formatCurrency(sm.total_revenue || 0), sub: `${sm.total_transaksi || 0} transaksi`, icon: 'trending-up-outline', color: colors.primary },
              { label: 'Laba Bersih', value: formatCurrency(sm.total_profit || 0), sub: `Margin ${margin}%`, icon: 'cash-outline', color: colors.success },
              { label: 'Rata-rata Transaksi', value: formatCurrency(sm.avg_transaction || 0), sub: 'Per transaksi', icon: 'receipt-outline', color: colors.warning },
              { label: 'Item Terjual', value: Number(sm.total_item_terjual || 0).toLocaleString(), sub: 'unit produk', icon: 'cube-outline', color: '#9C27B0' },
            ].map((card) => (
              <View key={card.label} style={[s.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: card.color }]}>
                <Ionicons name={card.icon} size={18} color={card.color} />
                <Text style={[s.statLbl, { color: colors.textMuted }]}>{card.label}</Text>
                <Text style={[s.statVal, { color: card.color }]}>{card.value}</Text>
                <Text style={[s.statSub, { color: colors.textDark }]}>{card.sub}</Text>
              </View>
            ))}
          </View>

          <SectionCard title="Tren Penjualan Harian" icon="trending-up-outline" colors={colors}>
            <SmoothAreaChart data={data?.daily_sales || []} colors={colors} />
          </SectionCard>

          <SectionCard title="Produk Terlaris" icon="trophy-outline" colors={colors}>
            <HBarChart
              data={[...(data?.top_products || [])].sort((a, b) => (Number(b.total_qty) || 0) - (Number(a.total_qty) || 0))}
              nameKey="product_name" barKey="total_qty" rightKey="total_qty"
              rightSuffix="unit" subKey="total_revenue" subFormat="currency"
              color={colors.primary} colors={colors}
            />
          </SectionCard>

          <SectionCard title="Produk Harga Tertinggi" icon="pricetag-outline" colors={colors}>
            <HBarChart
              data={[...(data?.top_products || [])].sort((a, b) => (Number(b.total_revenue) || 0) - (Number(a.total_revenue) || 0))}
              nameKey="product_name" barKey="total_revenue" rightKey="total_revenue"
              subKey="total_qty" subFormat="unit" color="#9C27B0" colors={colors}
            />
          </SectionCard>

          <SectionCard title="Penjualan per Kategori" icon="pie-chart-outline" colors={colors}>
            <DonutChart
              data={[...(data?.by_category || [])].sort((a, b) => (Number(b.total_qty) || 0) - (Number(a.total_qty) || 0))}
              nameKey="kategori" valueKey="total_penjualan" colors={colors}
            />
          </SectionCard>

          <SectionCard title="Metode Pembayaran" icon="card-outline" colors={colors}>
            {data?.by_payment?.length > 0 ? (
              <VBarChart
                data={data.by_payment.map(p => ({
                  ...p,
                  label_display: { cash:'Tunai', card:'Kartu', transfer:'Transfer', qris:'QRIS', unknown:'QRIS' }[p.payment_method] || 'QRIS',
                }))}
                labelKey="label_display" valueKey="total_nilai"
                color={PALETTE} formatValue={(v) => `${(v/1000000).toFixed(1)}jt`}
                colors={colors}
              />
            ) : <EmptyChart colors={colors} />}
            {data?.by_payment?.map((p, i) => (
              <StatRow key={i}
                label={{ cash:'Tunai', card:'Kartu', transfer:'Transfer', qris:'QRIS', unknown:'QRIS' }[p.payment_method] || 'QRIS'}
                value={formatCurrency(p.total_nilai || 0)}
                color={PALETTE[i % PALETTE.length]}
                sub={`${p.jumlah || 0} transaksi`}
                colors={colors}
              />
            ))}
          </SectionCard>

          <SectionCard title="Pola Jam Transaksi" icon="time-outline" colors={colors}>
            <HourlyHeatmap data={data?.hourly_pattern || []} colors={colors} />
          </SectionCard>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  card:      { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1 },
  cardHead:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  cardTitle: { fontSize: FONTS.sm, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  statRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, gap: SPACING.sm },
  statDot:   { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: FONTS.sm },
  statSub:   { fontSize: FONTS.xs },
  statValue: { fontSize: FONTS.sm, fontWeight: 'bold' },
});

const getStyles = (colors) => StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: 'bold' },
  periodRow:   { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  pBtn:        { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1 },
  pTxt:        { fontSize: FONTS.xs, fontWeight: '500' },
  loading:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt:     { fontSize: FONTS.sm },
  body:        { padding: SPACING.lg },
  statGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard:    { width: (SW - SPACING.lg * 2 - SPACING.sm) / 2 - 1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderLeftWidth: 3, gap: 3 },
  statLbl:     { fontSize: FONTS.xs, marginTop: 4 },
  statVal:     { fontSize: FONTS.md, fontWeight: 'bold' },
  statSub:     { fontSize: FONTS.xs },
});
