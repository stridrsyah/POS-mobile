/**
 * src/navigation/RootNavigator.js
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { COLORS } from '../utils/theme';

import LoginScreen           from '../screens/LoginScreen';
import DashboardScreen       from '../screens/DashboardScreen';
import PosScreen             from '../screens/PosScreen';
import CartScreen            from '../screens/CartScreen';
import CheckoutScreen        from '../screens/CheckoutScreen';
import ReceiptScreen         from '../screens/ReceiptScreen';
import ProductsScreen        from '../screens/ProductsScreen';
import TransactionsScreen    from '../screens/TransactionsScreen';
import ProfileScreen         from '../screens/ProfileScreen';
import ReportsScreen         from '../screens/ReportsScreen';
import AnalyticsScreen       from '../screens/AnalyticsScreen';
import CustomersScreen       from '../screens/CustomersScreen';
import SuppliersScreen       from '../screens/SuppliersScreen';
import StockInScreen         from '../screens/StockInScreen';
import BarcodeScannerScreen  from '../screens/BarcodeScannerScreen';
import UsersScreen           from '../screens/UsersScreen';
import PromosScreen          from '../screens/PromosScreen';
import ReceiptSettingsScreen  from '../screens/ReceiptSettingsScreen';
import PrinterSettingsScreen  from '../screens/PrinterSettingsScreen';
import CategoriesScreen      from '../screens/CategoriesScreen';
import ProductFormScreen     from '../screens/ProductFormScreen';
import ServerSettingsScreen  from '../screens/ServerSettingsScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Memuat aplikasi...</Text>
    </View>
  );
}

function CustomTabBar({ state, navigation }) {
  const { totalItems } = useCart();
  const tabs = [
    { name: 'Dashboard',    label: 'Beranda',   icon: 'home-outline',           active: 'home',            lib: 'Ion' },
    { name: 'POS',          label: 'Kasir',     icon: 'point-of-sale',          active: 'point-of-sale',   lib: 'MCo' },
    { name: 'Products',     label: 'Produk',    icon: 'package-variant-closed', active: 'package-variant', lib: 'MCo' },
    { name: 'Transactions', label: 'Transaksi', icon: 'receipt-outline',        active: 'receipt',         lib: 'Ion' },
    { name: 'Profile',      label: 'Profil',    icon: 'person-outline',         active: 'person',          lib: 'Ion' },
  ];
  return (
    <View style={S.outerWrap}>
      <View style={S.bar}>
        {state.routes.map((route, idx) => {
          const tab = tabs.find(t => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === idx;
          const onPress = () => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !ev.defaultPrevented) navigation.navigate(route.name);
          };
          const iconName  = focused ? tab.active : tab.icon;
          const iconColor = focused ? COLORS.primary : COLORS.textMuted;
          const IconComp  = tab.lib === 'MCo' ? MaterialCommunityIcons : Ionicons;
          if (route.name === 'POS') {
            return (
              <TouchableOpacity key={route.key} onPress={onPress} style={S.posOuter} activeOpacity={0.85}>
                <View style={[S.posCircle, focused && S.posCircleActive]}>
                  <MaterialCommunityIcons name="point-of-sale" size={26} color="#fff" />
                  {totalItems > 0 && (
                    <View style={S.badge}><Text style={S.badgeTxt}>{totalItems > 9 ? '9+' : totalItems}</Text></View>
                  )}
                </View>
                <Text style={[S.lbl, focused && S.lblActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={S.tab} activeOpacity={0.7}>
              {focused && <View style={S.topLine} />}
              <View style={[S.iconBox, focused && S.iconBoxActive]}>
                <IconComp name={iconName} size={22} color={iconColor} />
              </View>
              <Text style={[S.lbl, focused && S.lblActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#1a1a2e' } }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="ServerSettings" component={ServerSettingsScreen} />
    </Stack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard"    component={DashboardScreen} />
      <Tab.Screen name="POS"          component={PosScreen} />
      <Tab.Screen name="Products"     component={ProductsScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Profile"      component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#1a1a2e' }, gestureEnabled: true }}
    >
      <Stack.Screen name="Main"            component={MainTabNavigator} />
      <Stack.Screen name="Cart"            component={CartScreen} />
      <Stack.Screen name="Checkout"        component={CheckoutScreen} />
      <Stack.Screen name="Receipt"         component={ReceiptScreen} />
      <Stack.Screen name="BarcodeScanner"  component={BarcodeScannerScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Reports"         component={ReportsScreen} />
      <Stack.Screen name="Analytics"       component={AnalyticsScreen} />
      <Stack.Screen name="Customers"       component={CustomersScreen} />
      <Stack.Screen name="Suppliers"       component={SuppliersScreen} />
      <Stack.Screen name="StockIn"         component={StockInScreen} />
      <Stack.Screen name="Users"           component={UsersScreen} />
      <Stack.Screen name="Promos"          component={PromosScreen} />
      <Stack.Screen name="ReceiptSettings" component={ReceiptSettingsScreen} />
      <Stack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
      <Stack.Screen name="Categories"      component={CategoriesScreen} />
      <Stack.Screen name="ProductForm"     component={ProductFormScreen} />
      <Stack.Screen name="ServerSettings"  component={ServerSettingsScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return (
    <NavigationContainer>
      {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const S = StyleSheet.create({
  outerWrap:       { borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bgMedium },
  bar:             { flexDirection: 'row', backgroundColor: COLORS.bgMedium, paddingBottom: Platform.OS === 'ios' ? 22 : 10, paddingTop: 4, paddingHorizontal: 4 },
  tab:             { flex: 1, alignItems: 'center', paddingTop: 6, position: 'relative' },
  topLine:         { position: 'absolute', top: 0, width: 32, height: 3, borderRadius: 2, backgroundColor: COLORS.primary },
  iconBox:         { width: 40, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBoxActive:   { backgroundColor: COLORS.primary + '22' },
  lbl:             { fontSize: 10, marginTop: 2, color: COLORS.textMuted, fontWeight: '500' },
  lblActive:       { color: COLORS.primary, fontWeight: '700' },
  posOuter:        { flex: 1, alignItems: 'center', marginTop: -20 },
  posCircle:       { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10, borderWidth: 3, borderColor: COLORS.bgMedium },
  posCircleActive: { backgroundColor: '#5a3fd8' },
  badge:           { position: 'absolute', top: -4, right: -4, backgroundColor: '#F44336', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeTxt:        { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});