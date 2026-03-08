/**
 * src/context/AuthContext.js — Manajemen State Autentikasi
 * ============================================================
 * Context ini menyimpan state login di seluruh aplikasi:
 *   - user: data user yang sedang login
 *   - isLoggedIn: boolean status login
 *   - isLoading: sedang cek token tersimpan atau tidak
 *
 * Cara pakai di screen lain:
 *   const { user, login, logout } = useAuth();
 * ============================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

// Buat context dengan nilai default kosong
const AuthContext = createContext({});

/**
 * AuthProvider — Bungkus aplikasi dengan provider ini
 * agar semua screen bisa mengakses state auth
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);           // Data user yang login
  const [isLoading, setIsLoading] = useState(true); // Sedang inisialisasi?

  /**
   * Cek apakah ada token tersimpan saat aplikasi pertama dibuka.
   * Jika ada, restore sesi login tanpa harus login ulang.
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Ambil token dan data user dari penyimpanan lokal
        const token = await AsyncStorage.getItem('auth_token');
        const userData = await AsyncStorage.getItem('user_data');

        if (token && userData) {
          // Restore state login dari data yang tersimpan
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('[Auth] Gagal restore sesi:', error);
        // Jika gagal, clear semua data sesi
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      } finally {
        setIsLoading(false); // Selesai inisialisasi, apapun hasilnya
      }
    };

    restoreSession();
  }, []);

  /**
   * Fungsi login — panggil API lalu simpan token & data user
   *
   * @param {string} username - Username atau email
   * @param {string} password - Password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const login = async (username, password) => {
    const result = await authAPI.login(username, password);

    if (result.success) {
      const { token, user: userData } = result.data;

      // Simpan token dan data user ke AsyncStorage (persistent)
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));

      // Update state context
      setUser(userData);
      return { success: true };
    }

    return { success: false, error: result.error || 'Login gagal' };
  };

  /**
   * Fungsi logout — hapus sesi dari server dan lokal
   */
  const logout = async () => {
    try {
      // Beritahu server untuk invalidate token (opsional, tidak fatal jika gagal)
      await authAPI.logout();
    } catch (error) {
      console.warn('[Auth] Logout API gagal:', error);
    } finally {
      // Selalu hapus data lokal terlepas dari respons server
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setUser(null);
    }
  };

  /**
   * Update data user yang tersimpan (misal setelah edit profil)
   * @param {object} updatedUser - Data user baru
   */
  const updateUser = async (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    await AsyncStorage.setItem('user_data', JSON.stringify(merged));
  };

  /**
   * Cek apakah user memiliki role tertentu
   * @param {string|string[]} roles - Role yang diizinkan
   * @returns {boolean}
   */
  const hasRole = (roles) => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  // Nilai yang tersedia untuk seluruh aplikasi
  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    hasRole,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'admin' || user?.role === 'manager',
    isCashier: true, // semua role bisa kasir
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook custom untuk menggunakan AuthContext
 * Contoh: const { user, login } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }
  return context;
};