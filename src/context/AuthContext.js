/**
 * src/context/AuthContext.js
 * Sistem 2 role: owner (akses penuh) dan kasir (akses operasional)
 * Role lama (admin/manager) dari database tetap diterima — diperlakukan
 * sebagai owner agar tidak merusak akun yang sudah ada.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext({});

// Role yang dianggap "owner" — termasuk role lama agar backward-compatible
const OWNER_ROLES = ['owner', 'admin', 'manager'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session ───────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userData = await AsyncStorage.getItem('user_data');
        if (token && userData) setUser(JSON.parse(userData));
      } catch {
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  // ── Simpan sesi ke storage & state ───────────────────────
  const _saveSession = async (token, userData) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    setUser(userData);
  };

  // ── LOGIN ─────────────────────────────────────────────────
  const login = async (username, password) => {
    try {
      const result = await authAPI.login(username, password);
      if (!result.success) return { success: false, error: result.error || 'Login gagal' };

      const data = result.data || {};
      const token = data.token || data.access_token || null;
      const userData = data.user || data.userData || null;

      if (!token || !userData) {
        return { success: false, error: 'Response server tidak valid.' };
      }
      await _saveSession(token, userData);
      return { success: true };
    } catch {
      return { success: false, error: 'Tidak dapat terhubung ke server.' };
    }
  };

  // ── REGISTER OWNER (auto-login setelah berhasil) ──────────
  const register = async (formData) => {
    try {
      const result = await authAPI.register(formData);
      if (!result.success) return { success: false, error: result.error || 'Registrasi gagal' };

      const data = result.data || {};
      const token = data.token || null;
      const userData = data.user || null;

      if (!token || !userData) {
        // Registrasi berhasil tapi auto-login gagal — minta login manual
        return { success: false, error: 'Pendaftaran berhasil! Silakan login dengan akun baru Anda.' };
      }
      await _saveSession(token, userData);
      return { success: true };
    } catch {
      return { success: false, error: 'Tidak dapat terhubung ke server.' };
    }
  };

  // ── LOGOUT ────────────────────────────────────────────────
  const logout = async () => {
    try { await authAPI.logout(); } catch { /* lanjut clear local */ }
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    setUser(null);
  };

  // ── UPDATE DATA USER LOKAL ────────────────────────────────
  const updateUser = async (updatedData) => {
    const merged = { ...user, ...updatedData };
    setUser(merged);
    await AsyncStorage.setItem('user_data', JSON.stringify(merged));
  };

  // ── ROLE HELPERS ──────────────────────────────────────────
  // isOwner = true  → akses penuh (owner / admin lama / manager lama)
  // isOwner = false → kasir, akses terbatas
  const isOwner = OWNER_ROLES.includes(user?.role);

  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,

    login,
    register,
    logout,
    updateUser,

    isOwner,
    // Alias untuk backward compat dengan screen lama yang masih pakai isManager/isAdmin
    isAdmin: isOwner,
    isManager: isOwner,
    isCashier: true,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
};