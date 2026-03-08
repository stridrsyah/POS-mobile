/**
 * PrinterSettingsScreen.js
 * Letakkan di: src/screens/PrinterSettingsScreen.js
 * 
 * Halaman untuk scan, pilih, dan konek ke printer Bluetooth
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrinter } from '../context/PrinterContext';

const COLORS = {
  bg:        '#0f0f1a',
  bgCard:    '#1a1a2e',
  bgMedium:  '#252540',
  primary:   '#6C63FF',
  success:   '#26a69a',
  warning:   '#FFA01E',
  danger:    '#ef5350',
  textWhite: '#ffffff',
  textLight: '#b0b0cc',
  textDark:  '#606080',
  border:    'rgba(255,255,255,0.08)',
};

export default function PrinterSettingsScreen({ navigation }) {
  const {
    isScanning, isConnecting, isPrinting,
    connectedDevice, pairedDevices, foundDevices,
    scanDevices, connectPrinter, disconnectPrinter, testPrint,
  } = usePrinter();

  // Gabung paired + found, hapus duplikat
  var allDevices = pairedDevices.concat(
    foundDevices.filter(function(f) {
      return !pairedDevices.find(function(p) { return p.address === f.address; });
    })
  );

  function isPrinterDevice(name) {
    if (!name) return false;
    var lower = name.toLowerCase();
    return lower.includes('pos') || lower.includes('print') ||
           lower.includes('thermal') || lower.includes('escpos') ||
           lower.includes('rpp') || lower.includes('xp-') ||
           lower.includes('cashino') || lower.includes('goojprt') ||
           lower.includes('pt-') || lower.includes('mtp');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={function() { navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Printer</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Status koneksi */}
        <View style={[styles.card, { borderColor: connectedDevice ? 'rgba(38,166,154,0.4)' : COLORS.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: connectedDevice ? 'rgba(38,166,154,0.15)' : 'rgba(255,255,255,0.06)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons
                name={connectedDevice ? 'print' : 'print-outline'}
                size={24}
                color={connectedDevice ? COLORS.success : COLORS.textDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              {connectedDevice ? (
                <>
                  <Text style={{ fontSize: 13, color: COLORS.success, fontWeight: 'bold' }}>
                    ✅ Terhubung
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textWhite, marginTop: 2 }}>
                    {connectedDevice.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: COLORS.textDark, marginTop: 1 }}>
                    {connectedDevice.address}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: COLORS.textDark, fontWeight: '600' }}>
                    Belum Terhubung
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textDark, marginTop: 2 }}>
                    Scan dan pilih printer di bawah
                  </Text>
                </>
              )}
            </View>
            {connectedDevice ? (
              <TouchableOpacity
                onPress={disconnectPrinter}
                style={styles.smallBtn}
              >
                <Text style={{ fontSize: 11, color: COLORS.danger }}>Putuskan</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Tombol Test Print */}
          {connectedDevice ? (
            <TouchableOpacity
              onPress={testPrint}
              disabled={isPrinting}
              style={[styles.btn, { backgroundColor: 'rgba(108,99,255,0.2)', marginTop: 12 }]}
            >
              {isPrinting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="print-outline" size={16} color={COLORS.primary} />
              )}
              <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600', marginLeft: 6 }}>
                {isPrinting ? 'Mencetak...' : 'Test Print'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Panduan */}
        <View style={[styles.card, { backgroundColor: 'rgba(108,99,255,0.06)' }]}>
          <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: 'bold', marginBottom: 8 }}>
            📋 Cara Menghubungkan Printer
          </Text>
          {[
            '1. Nyalakan printer thermal Bluetooth',
            '2. Aktifkan Bluetooth di HP kamu',
            '3. Tekan tombol "Scan Printer" di bawah',
            '4. Pilih nama printer dari daftar yang muncul',
            '5. Tekan "Test Print" untuk memastikan berfungsi',
          ].map(function(step, i) {
            return (
              <Text key={i} style={{ fontSize: 11, color: COLORS.textLight, lineHeight: 20 }}>
                {step}
              </Text>
            );
          })}
        </View>

        {/* Tombol Scan */}
        <TouchableOpacity
          onPress={scanDevices}
          disabled={isScanning}
          style={[styles.btn, styles.btnPrimary]}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="bluetooth" size={18} color="#fff" />
          )}
          <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>
            {isScanning ? 'Sedang Scan...' : 'Scan Printer Bluetooth'}
          </Text>
        </TouchableOpacity>

        {/* Daftar perangkat */}
        {allDevices.length > 0 ? (
          <View style={styles.card}>
            <Text style={{ fontSize: 12, color: COLORS.textDark, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Perangkat Ditemukan ({allDevices.length})
            </Text>
            {allDevices.map(function(device, i) {
              var isConnected = connectedDevice && connectedDevice.address === device.address;
              var looksLikePrinter = isPrinterDevice(device.name);
              return (
                <View key={device.address} style={[
                  styles.deviceItem,
                  i < allDevices.length - 1 ? { borderBottomWidth: 1, borderBottomColor: COLORS.border } : null,
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 19,
                      backgroundColor: isConnected
                        ? 'rgba(38,166,154,0.15)'
                        : looksLikePrinter
                          ? 'rgba(108,99,255,0.15)'
                          : 'rgba(255,255,255,0.05)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons
                        name={isConnected ? 'checkmark-circle' : looksLikePrinter ? 'print-outline' : 'bluetooth-outline'}
                        size={20}
                        color={isConnected ? COLORS.success : looksLikePrinter ? COLORS.primary : COLORS.textDark}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: COLORS.textWhite, fontWeight: '600' }}>
                          {device.name || 'Unknown Device'}
                        </Text>
                        {looksLikePrinter ? (
                          <View style={{ backgroundColor: 'rgba(108,99,255,0.2)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: COLORS.primary, fontWeight: 'bold' }}>PRINTER</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 10, color: COLORS.textDark, marginTop: 1 }}>
                        {device.address}
                      </Text>
                    </View>
                  </View>

                  {isConnected ? (
                    <View style={[styles.smallBtn, { backgroundColor: 'rgba(38,166,154,0.15)' }]}>
                      <Text style={{ fontSize: 11, color: COLORS.success, fontWeight: '600' }}>Terhubung</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={function() { connectPrinter(device); }}
                      disabled={isConnecting}
                      style={[styles.smallBtn, { backgroundColor: 'rgba(108,99,255,0.2)' }]}
                    >
                      {isConnecting ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600' }}>Hubungkan</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : !isScanning ? (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
            <Ionicons name="bluetooth-outline" size={40} color={COLORS.textDark} />
            <Text style={{ fontSize: 13, color: COLORS.textDark, marginTop: 10 }}>
              Belum ada perangkat ditemukan
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.textDark, marginTop: 4, textAlign: 'center' }}>
              Tekan "Scan Printer Bluetooth" untuk mulai mencari
            </Text>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16,
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  smallBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  deviceItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 8,
  },
});