/**
 * src/screens/PrinterSettingsScreen.js (Theme-Aware)
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrinter } from '../context/PrinterContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

export default function PrinterSettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    isScanning, isConnecting, isPrinting,
    connectedDevice, pairedDevices, foundDevices,
    scanDevices, connectPrinter, disconnectPrinter, testPrint,
  } = usePrinter();

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bgMedium }]}>
        <TouchableOpacity onPress={function() { navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textWhite }]}>Pengaturan Printer</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Status koneksi */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: connectedDevice ? colors.success + '66' : colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: connectedDevice ? colors.success + '25' : colors.bgSurface,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={connectedDevice ? 'print' : 'print-outline'} size={24} color={connectedDevice ? colors.success : colors.textDark} />
            </View>
            <View style={{ flex: 1 }}>
              {connectedDevice ? (
                <>
                  <Text style={{ fontSize: 13, color: colors.success, fontWeight: 'bold' }}>✅ Terhubung</Text>
                  <Text style={{ fontSize: 12, color: colors.textWhite, marginTop: 2 }}>{connectedDevice.name}</Text>
                  <Text style={{ fontSize: 10, color: colors.textDark, marginTop: 1 }}>{connectedDevice.address}</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: colors.textDark, fontWeight: '600' }}>Belum Terhubung</Text>
                  <Text style={{ fontSize: 11, color: colors.textDark, marginTop: 2 }}>Scan dan pilih printer di bawah</Text>
                </>
              )}
            </View>
            {connectedDevice ? (
              <TouchableOpacity onPress={disconnectPrinter} style={[styles.smallBtn, { backgroundColor: colors.danger + '20' }]}>
                <Text style={{ fontSize: 11, color: colors.danger }}>Putuskan</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {connectedDevice ? (
            <TouchableOpacity
              onPress={testPrint} disabled={isPrinting}
              style={[styles.btn, { backgroundColor: colors.primary + '20', marginTop: 12 }]}
            >
              {isPrinting ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="print-outline" size={16} color={colors.primary} />}
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginLeft: 6 }}>
                {isPrinting ? 'Mencetak...' : 'Test Print'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Panduan */}
        <View style={[styles.card, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold', marginBottom: 8 }}>📋 Cara Menghubungkan Printer</Text>
          {[
            '1. Nyalakan printer thermal Bluetooth',
            '2. Aktifkan Bluetooth di HP kamu',
            '3. Tekan tombol "Scan Printer" di bawah',
            '4. Pilih nama printer dari daftar yang muncul',
            '5. Tekan "Test Print" untuk memastikan berfungsi',
          ].map(function(step, i) {
            return <Text key={i} style={{ fontSize: 11, color: colors.textLight, lineHeight: 20 }}>{step}</Text>;
          })}
        </View>

        {/* Tombol Scan */}
        <TouchableOpacity
          onPress={scanDevices} disabled={isScanning}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          {isScanning ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="bluetooth" size={18} color="#fff" />}
          <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>
            {isScanning ? 'Sedang Scan...' : 'Scan Printer Bluetooth'}
          </Text>
        </TouchableOpacity>

        {/* Daftar perangkat */}
        {allDevices.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={{ fontSize: 12, color: colors.textDark, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Perangkat Ditemukan ({allDevices.length})
            </Text>
            {allDevices.map(function(device, i) {
              var isConnected = connectedDevice && connectedDevice.address === device.address;
              var looksLikePrinter = isPrinterDevice(device.name);
              return (
                <View key={device.address} style={[
                  styles.deviceItem,
                  i < allDevices.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : null,
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 19,
                      backgroundColor: isConnected ? colors.success + '25' : looksLikePrinter ? colors.primary + '25' : colors.bgSurface,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons
                        name={isConnected ? 'checkmark-circle' : looksLikePrinter ? 'print-outline' : 'bluetooth-outline'}
                        size={20}
                        color={isConnected ? colors.success : looksLikePrinter ? colors.primary : colors.textDark}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: colors.textWhite, fontWeight: '600' }}>
                          {device.name || 'Unknown Device'}
                        </Text>
                        {looksLikePrinter ? (
                          <View style={{ backgroundColor: colors.primary + '33', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: colors.primary, fontWeight: 'bold' }}>PRINTER</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 10, color: colors.textDark, marginTop: 1 }}>{device.address}</Text>
                    </View>
                  </View>

                  {isConnected ? (
                    <View style={[styles.smallBtn, { backgroundColor: colors.success + '25' }]}>
                      <Text style={{ fontSize: 11, color: colors.success, fontWeight: '600' }}>Terhubung</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={function() { connectPrinter(device); }}
                      disabled={isConnecting}
                      style={[styles.smallBtn, { backgroundColor: colors.primary + '33' }]}
                    >
                      {isConnecting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Hubungkan</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : !isScanning ? (
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
            <Ionicons name="bluetooth-outline" size={40} color={colors.textDark} />
            <Text style={{ fontSize: 13, color: colors.textDark, marginTop: 10 }}>Belum ada perangkat ditemukan</Text>
            <Text style={{ fontSize: 11, color: colors.textDark, marginTop: 4, textAlign: 'center' }}>
              Tekan "Scan Printer Bluetooth" untuk mulai mencari
            </Text>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  card: { borderRadius: 12, padding: 14, borderWidth: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
});
