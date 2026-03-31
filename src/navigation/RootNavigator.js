/**
 * src/navigation/RootNavigator.js — v2.2
 * FIXED: Full light mode support di tab bar & navigator
 * - Tab bar background, border, icon, teks konsisten light/dark
 * - Tidak ada garis hitam tersisa di light mode
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator }     from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth }    from '../context/AuthContext';
import { useTheme }   from '../context/ThemeContext';
import { useCart }    from '../context/CartContext';
import { FONTS, SPACING, RADIUS } from '../utils/theme';

// Screens
import RegisterScreen       from '../screens/RegisterScreen';
import LoginScreen          from '../screens/LoginScreen';
import DashboardScreen      from '../screens/DashboardScreen';
import PosScreen            from '../screens/PosScreen';
import CartScreen           from '../screens/CartScreen';
import CheckoutScreen       from '../screens/CheckoutScreen';
import ReceiptScreen        from '../screens/ReceiptScreen';
import ProductsScreen       from '../screens/ProductsScreen';
import TransactionsScreen   from '../screens/TransactionsScreen';
import ProfileScreen        from '../screens/ProfileScreen';
import ReportsScreen        from '../screens/ReportsScreen';
import AnalyticsScreen      from '../screens/AnalyticsScreen';
import CustomersScreen      from '../screens/CustomersScreen';
import SuppliersScreen      from '../screens/SuppliersScreen';
import StockInScreen        from '../screens/StockInScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import UsersScreen          from '../screens/UsersScreen';
import PromosScreen         from '../screens/PromosScreen';
import ReceiptSettingsScreen from '../screens/ReceiptSettingsScreen';
import PrinterSettingsScreen from '../screens/PrinterSettingsScreen';
import CategoriesScreen     from '../screens/CategoriesScreen';
import ProductFormScreen    from '../screens/ProductFormScreen';
import ServerSettingsScreen from '../screens/ServerSettingsScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Loading Screen ────────────────────────────────────────
function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: FONTS.sm }}>Memuat aplikasi...</Text>
    </View>
  );
}

// ── Tab Item dengan Animasi ───────────────────────────────
const TabItem = ({ tab, focused, onPress, colors, isDark }) => {
  const scaleAnim   = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: focused ? 1 : 0.95, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: focused ? 1 : 0.65, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [focused]);

  const iconName  = focused ? tab.active : tab.icon;
  const iconColor = focused ? colors.primary : colors.tabInactive;

  return (
    <TouchableOpacity onPress={onPress} style={tabS.tab} activeOpacity={0.7}>
      <Animated.View style={[tabS.inner, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        {focused && (
          <View style={[
            tabS.activePill,
            { backgroundColor: isDark ? colors.primary + '18' : colors.primary + '12' },
          ]} />
        )}
        {tab.lib === 'MCo'
          ? <MaterialCommunityIcons name={iconName} size={23} color={iconColor} />
          : <Ionicons name={iconName} size={23} color={iconColor} />
        }
        <Text style={[tabS.label, { color: focused ? colors.primary : colors.tabInactive }]}>
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── POS Tab Center Button ─────────────────────────────────
const PosTabItem = ({ focused, onPress, totalItems, colors, isDark }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  return (
    <TouchableOpacity onPress={onPress} style={tabS.posOuter} activeOpacity={0.85}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[
          tabS.posCircle,
          {
            backgroundColor: focused
              ? (isDark ? colors.primaryDark || '#5A52D5' : '#5A52D5')
              : colors.primary,
            shadowColor: colors.primary,
            // Light mode: kurangi border
            borderWidth: isDark ? 3 : 2,
            borderColor: isDark ? colors.bgMedium : '#FFFFFF',
          }
        ]}>
          <MaterialCommunityIcons name="cash-register" size={26} color="#fff" />
          {totalItems > 0 && (
            <View style={[tabS.badge, { backgroundColor: colors.danger, borderColor: isDark ? colors.bgMedium : '#FFFFFF' }]}>
              <Text style={tabS.badgeTxt}>{totalItems > 9 ? '9+' : totalItems}</Text>
            </View>
          )}
        </View>
      </Animated.View>
      <Text style={[tabS.label, { color: focused ? colors.primary : colors.tabInactive }]}>
        Kasir
      </Text>
    </TouchableOpacity>
  );
};

const tabS = StyleSheet.create({
  tab:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', gap: 3, paddingTop: 6, position: 'relative', paddingHorizontal: 12 },
  activePill: {
    position: 'absolute', top: 4, left: 0, right: 0,
    height: 32, borderRadius: RADIUS.md,
  },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
  posOuter:  { flex: 1, alignItems: 'center', marginTop: -20 },
  posCircle: {
    width: 58, height: 58, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    elevation: 10, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35, shadowRadius: 10,
  },
  badge: {
    position: 'absolute', top: -5, right: -5,
    width: 19, height: 19, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

// ── Custom Tab Bar ────────────────────────────────────────
function CustomTabBar({ state, navigation }) {
  const { colors, isDark } = useTheme();
  const { totalItems }     = useCart();

  const tabs = [
    { name: 'Dashboard',    label: 'Beranda',   icon: 'home-outline',    active: 'home',    lib: 'Ion' },
    { name: 'POS',          label: 'Kasir',     icon: 'cash-register',   active: 'cash-register', lib: 'MCo' },
    { name: 'Products',     label: 'Produk',    icon: 'cube-outline',    active: 'cube',    lib: 'Ion' },
    { name: 'Transactions', label: 'Transaksi', icon: 'receipt-outline', active: 'receipt', lib: 'Ion' },
    { name: 'Profile',      label: 'Profil',    icon: 'person-outline',  active: 'person',  lib: 'Ion' },
  ];

  return (
    <View style={[
      tabBarS.outerWrap,
      {
        backgroundColor: colors.tabBg,
        // Light mode: shadow tipis, bukan border hitam
        borderTopColor: isDark ? colors.border : colors.border,
        borderTopWidth: isDark ? 1 : 0.5,
        // Light mode: shadow untuk "depth"
        ...(isDark ? {} : {
          shadowColor: '#00000010',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 8,
        }),
      }
    ]}>
      <View style={tabBarS.bar}>
        {state.routes.map((route, idx) => {
          const tab     = tabs.find(t => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === idx;
          const onPress = () => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !ev.defaultPrevented) navigation.navigate(route.name);
          };

          if (route.name === 'POS') {
            return (
              <PosTabItem
                key={route.key}
                focused={focused}
                onPress={onPress}
                totalItems={totalItems}
                colors={colors}
                isDark={isDark}
              />
            );
          }

          return (
            <TabItem
              key={route.key}
              tab={tab}
              focused={focused}
              onPress={onPress}
              colors={colors}
              isDark={isDark}
            />
          );
        })}
      </View>
    </View>
  );
}

const tabBarS = StyleSheet.create({
  outerWrap: { borderTopWidth: 0.5 },
  bar: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 4,
    paddingHorizontal: SPACING.sm,
  },
});

// ── Navigators ────────────────────────────────────────────
function AuthNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.bgDark },
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ServerSettings" component={ServerSettingsScreen} />
    </Stack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen} />
      <Tab.Screen name="POS"          component={PosScreen} />
      <Tab.Screen name="Products"     component={ProductsScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Profile"      component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.bgDark },
        gestureEnabled: true,
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [{
              translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
            }],
          },
        }),
      }}
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
  const { colors, isDark }        = useTheme();

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary:      colors.primary,
          background:   colors.bgDark,
          card:         colors.bgMedium,
          text:         colors.textWhite,
          border:       isDark ? colors.border : 'transparent',
          notification: colors.danger,
        },
      }}
    >
      {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
