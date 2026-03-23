/**
 * src/context/AuthContext.js — Manajemen State Autentikasi
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token    = await AsyncStorage.getItem('auth_token');
        const userData = await AsyncStorage.getItem('user_data');
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('[Auth] Gagal restore sesi:', error);
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (username, password) => {
    try {
      const result = await authAPI.login(username, password);

      if (!result.success) {
        return { success: false, error: result.error || 'Login gagal' };
      }

      // Defensive: cek semua kemungkinan struktur response
      const data     = result.data || {};
      const token    = data.token || data.access_token || null;
      const userData = data.user  || data.userData     || null;

      console.log('[Auth] Login response data:', JSON.stringify(data));

      if (!token) {
        console.error('[Auth] Token tidak ditemukan dalam response:', data);
        return { success: false, error: 'Token tidak ditemukan. Cek format response API.' };
      }

      if (!userData) {
        console.error('[Auth] User data tidak ditemukan dalam response:', data);
        return { success: false, error: 'Data user tidak ditemukan. Cek format response API.' };
      }

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);
      return { success: true };

    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: 'Terjadi kesalahan saat login.' };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('[Auth] Logout API gagal:', error);
    } finally {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setUser(null);
    }
  };

  const updateUser = async (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    await AsyncStorage.setItem('user_data', JSON.stringify(merged));
  };

  const hasRole = (roles) => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    hasRole,
    isAdmin:   user?.role === 'admin',
    isManager: user?.role === 'admin' || user?.role === 'manager',
    isCashier: true,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }
  return context;
};