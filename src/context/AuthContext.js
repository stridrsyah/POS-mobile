/**
 * src/context/AuthContext.js v2.1
 * - Role: owner (akses penuh) dan kasir (akses operasional)
 * - Saat register: simpan data bisnis ke receipt settings
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, receiptSettingsAPI } from '../services/api';

const AuthContext = createContext({});

const OWNER_ROLES = ['owner', 'admin', 'manager'];

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session ──────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const token    = await AsyncStorage.getItem('auth_token');
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

  const _saveSession = async (token, userData) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    setUser(userData);
  };

  // ── LOGIN ────────────────────────────────────────────────
  const login = async (username, password) => {
    try {
      const result = await authAPI.login(username, password);
      if (!result.success) return { success: false, error: result.error || 'Login gagal' };
      const data     = result.data || {};
      const token    = data.token || data.access_token || null;
      const userData = data.user  || data.userData     || null;
      if (!token || !userData) return { success: false, error: 'Response server tidak valid.' };
      await _saveSession(token, userData);
      return { success: true };
    } catch {
      return { success: false, error: 'Tidak dapat terhubung ke server.' };
    }
  };

  // ── REGISTER OWNER ───────────────────────────────────────
  const register = async (formData) => {
    try {
      const result = await authAPI.register(formData);
      if (!result.success) return { success: false, error: result.error || 'Registrasi gagal' };

      const data     = result.data || {};
      const token    = data.token || null;
      const userData = data.user  || null;

      if (!token || !userData) {
        return {
          success: false,
          error: 'Pendaftaran berhasil! Silakan login dengan akun baru Anda.',
        };
      }

      await _saveSession(token, userData);

      // ── Auto-isi pengaturan struk dari data bisnis ──────
      // Dilakukan setelah login berhasil agar token tersedia
      try {
        const receiptSettings = {
          store_name:    formData.business_name    || formData.name,
          store_address: formData.business_address || '',
          store_phone:   formData.business_phone   || formData.phone || '',
          store_email:   formData.email            || '',
          footer_text:   `Terima kasih telah berbelanja di ${formData.business_name || 'toko kami'}!`,
          show_tax:      0,
          show_discount: 1,
          paper_width:   '58mm',
          font_size:     'normal',
          template:      'standard',
        };
        // Simpan ke API (opsional, tidak blokir jika gagal)
        await receiptSettingsAPI.save(receiptSettings).catch(() => {});
        // Simpan lokal sebagai fallback
        await AsyncStorage.setItem('receipt_settings_local', JSON.stringify(receiptSettings));
      } catch {
        // Tidak blokir register jika receipt settings gagal
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Tidak dapat terhubung ke server.' };
    }
  };

  // ── LOGOUT ───────────────────────────────────────────────
  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    setUser(null);
  };

  // ── UPDATE DATA USER LOKAL ───────────────────────────────
  const updateUser = async (updatedData) => {
    const merged = { ...user, ...updatedData };
    setUser(merged);
    await AsyncStorage.setItem('user_data', JSON.stringify(merged));
  };

  // ── ROLE HELPERS ─────────────────────────────────────────
  const isOwner = OWNER_ROLES.includes(user?.role);

  // Label role yang konsisten
  const getRoleLabel = () => {
    if (!user?.role) return 'Kasir';
    const role = user.role.toLowerCase();
    if (role === 'owner')   return 'Owner';
    if (role === 'admin')   return 'Owner';   // backward compat
    if (role === 'manager') return 'Owner';   // backward compat
    return 'Kasir';
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    isOwner,
    isAdmin:   isOwner,
    isManager: isOwner,
    isCashier: true,
    getRoleLabel,
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
