/**
 * src/screens/BarcodeScannerScreen.js — Scanner Barcode Kamera
 * ============================================================
 * Dibuka sebagai modal dari PosScreen saat user tekan ikon barcode.
 *
 * Alur:
 * 1. Minta izin kamera (jika belum diberikan)
 * 2. Tampilkan kamera dengan overlay frame scan
 * 3. Saat barcode terdeteksi → kirim ke PosScreen melalui navigation callback
 * 4. Menutup otomatis setelah barcode berhasil dibaca
 *
 * Cara pakai dari PosScreen:
 *   navigation.navigate('BarcodeScanner', {
 *     onScan: (barcode) => { /* proses barcode *\/ }
 *   });
 * ============================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Dimensions, Platform, Vibration,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7; // Ukuran kotak scan area

export default function BarcodeScannerScreen({ navigation, route }) {
  // Callback yang dikirim dari PosScreen
  const { onScan } = route.params || {};

  const [hasPermission, setHasPermission] = useState(null); // null = belum dicek
  const [scanned, setScanned]             = useState(false); // sudah scan?
  const [flashOn, setFlashOn]             = useState(false); // flash/torch
  const [lastBarcode, setLastBarcode]     = useState('');    // barcode terakhir

  // Ref untuk mencegah scan ganda dalam waktu singkat
  const scanCooldown = useRef(false);

  /**
   * Minta izin kamera saat komponen dimuat
   */
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');

        if (status !== 'granted') {
          Alert.alert(
            '📷 Izin Kamera Diperlukan',
            'POS Mobile membutuhkan akses kamera untuk scan barcode produk.\n\n' +
            'Buka Settings HP → POS Mobile → Kamera → Izinkan',
            [
              { text: 'Batal', style: 'cancel', onPress: () => navigation.goBack() },
              { text: 'OK', onPress: () => navigation.goBack() },
            ]
          );
        }
      } catch (error) {
        console.error('[Scanner] Gagal minta izin kamera:', error);
        setHasPermission(false);
      }
    };

    requestPermission();
  }, []);

  /**
   * Handler saat barcode berhasil terbaca oleh kamera
   * @param {object} result - { type, data } dari expo-camera
   */
  const handleBarCodeScanned = useCallback(({ type, data }) => {
    // Cegah scan ganda dalam 2 detik
    if (scanCooldown.current || scanned) return;
    scanCooldown.current = true;

    console.log(`[Scanner] Barcode terdeteksi — Type: ${type}, Data: ${data}`);

    // Vibrate sebagai feedback scan berhasil
    Vibration.vibrate(100);

    setScanned(true);
    setLastBarcode(data);

    // Kirim hasil ke PosScreen melalui callback
    if (onScan) {
      onScan(data);
    }

    // Tutup scanner otomatis setelah 500ms
    setTimeout(() => {
      navigation.goBack();
    }, 500);

    // Reset cooldown setelah 2 detik (jika user kembali ke scanner)
    setTimeout(() => {
      scanCooldown.current = false;
    }, 2000);
  }, [scanned, onScan, navigation]);

  /**
   * Scan ulang (reset state)
   */
  const handleRescan = () => {
    setScanned(false);
    setLastBarcode('');
    scanCooldown.current = false;
  };

  // ── Tampilan: Izin Kamera Belum Diminta ──────────────────
  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={48} color={COLORS.primary} />
        <Text style={styles.statusText}>Meminta izin kamera...</Text>
      </View>
    );
  }

  // ── Tampilan: Izin Ditolak ────────────────────────────────
  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-off-outline" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Izin Kamera Ditolak</Text>
        <Text style={styles.errorText}>
          Buka Settings HP → Aplikasi → POS Mobile → Izin → Kamera → Izinkan
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Tampilan Utama: Kamera Aktif ──────────────────────────
  return (
    <View style={styles.container}>
      {/* Kamera mengisi seluruh layar */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          // Dukung semua tipe barcode umum
          barcodeTypes: [
            'ean13',   // Barcode produk internasional (paling umum)
            'ean8',    // Barcode produk kecil
            'upc_a',   // Barcode Amerika
            'upc_e',   // Barcode Amerika kecil
            'code128', // Barcode internal/warehouse
            'code39',  // Barcode alfanumerik
            'code93',  // Barcode alfanumerik
            'qr',      // QR Code
            'pdf417',  // Barcode 2D
            'aztec',   // Barcode 2D
            'datamatrix', // Barcode 2D kecil
          ],
        }}
      />

      {/* Overlay gelap di luar area scan */}
      <View style={styles.overlay}>
        {/* Atas gelap */}
        <View style={styles.overlayTop} />

        {/* Tengah: area gelap kiri + kotak scan + area gelap kanan */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />

          {/* Kotak area scan yang terang */}
          <View style={styles.scanArea}>
            {/* Sudut-sudut kotak scan (dekorasi) */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Garis scan animasi (simulasi laser) */}
            {!scanned && <View style={styles.scanLine} />}

            {/* Feedback berhasil scan */}
            {scanned && (
              <View style={styles.successOverlay}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
              </View>
            )}
          </View>

          <View style={styles.overlaySide} />
        </View>

        {/* Bawah gelap */}
        <View style={styles.overlayBottom} />
      </View>

      {/* Header dengan tombol kembali dan flash */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Scan Barcode</Text>

        {/* Tombol flash/torch */}
        <TouchableOpacity
          style={[styles.iconButton, flashOn && styles.iconButtonActive]}
          onPress={() => setFlashOn(!flashOn)}
        >
          <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Instruksi di bawah kotak scan */}
      <View style={styles.instructions}>
        {scanned ? (
          <View style={styles.scannedResult}>
            <Text style={styles.scannedLabel}>Barcode terdeteksi:</Text>
            <Text style={styles.scannedValue}>{lastBarcode}</Text>
            <TouchableOpacity style={styles.rescanButton} onPress={handleRescan}>
              <Ionicons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.rescanText}>Scan Ulang</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.instructionText}>
              Arahkan kamera ke barcode produk
            </Text>
            <Text style={styles.instructionSubText}>
              Posisikan barcode di dalam kotak di atas
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: FONTS.md,
  },
  errorTitle: {
    color: COLORS.textWhite,
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  backButtonText: {
    color: '#fff',
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
  },

  // ── Overlay ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  // ── Kotak Scan ──
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },

  // Sudut kotak scan (L-shaped)
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: 4, borderLeftWidth: 4,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: 4, borderRightWidth: 4,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: 4, borderLeftWidth: 4,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: 4, borderRightWidth: 4,
    borderBottomRightRadius: 4,
  },

  // Garis scan (simulasi laser)
  scanLine: {
    position: 'absolute',
    top: '45%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },

  // Overlay sukses di dalam kotak scan
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // ── Header ──
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: COLORS.primary,
  },

  // ── Instruksi & Hasil Scan ──
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  instructionText: {
    color: '#fff',
    fontSize: FONTS.md,
    fontWeight: FONTS.medium,
    textAlign: 'center',
  },
  instructionSubText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.sm,
    textAlign: 'center',
  },
  scannedResult: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  scannedLabel: {
    color: COLORS.success,
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
  },
  scannedValue: {
    color: '#fff',
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    letterSpacing: 2,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  rescanText: {
    color: COLORS.primary,
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
  },
});
