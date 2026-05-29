import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';
import client from '../api/client';
import LoginScreen from '../screens/LoginScreen';
import OtpVerifyScreen from '../screens/OtpVerifyScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import RoutingScreen from '../screens/RoutingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import UsersScreen from '../screens/UsersScreen';
import AuditLogScreen from '../screens/AuditLogScreen';
import useThemeStore from '../store/themeStore';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused, color }) {
  const icons = {
    Dashboard: focused ? 'grid'             : 'grid-outline',
    Documents: focused ? 'document-text'    : 'document-text-outline',
    Routing:   focused ? 'checkmark-circle' : 'checkmark-circle-outline',
    Profile:   focused ? 'person'           : 'person-outline',
    More:      focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline',
  };
  return <Ionicons name={icons[label]} size={22} color={color} />;
}
function MoreModalScreen({ navigation }) {
  const { user } = useAuthStore();
  const T = useThemeStore((state) => state);
  const MS = moreStyles(T);
  const isAdmin = user?.role === 'Admin';

  const options = [
   {
      label: 'Approvals',
      icon: 'checkmark-circle-outline',
      screen: 'RoutingStack',
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.12)',
    },
    ...(isAdmin ? [
      {
        label: 'Users',
        icon: 'people-outline',
        screen: 'UsersScreen',
        color: '#818cf8',
        bg: 'rgba(129,140,248,0.12)',
      },
      {
        label: 'Audit Log',
        icon: 'shield-checkmark-outline',
        screen: 'AuditLogScreen',
        color: '#47bfff',
        bg: 'rgba(71,191,255,0.12)',
      },
    ] : []),
  ];

  return (
    <TouchableOpacity
      style={MS.overlay}
      activeOpacity={1}
      onPress={() => navigation.goBack()}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={MS.sheet}
        onPress={() => {}}
      >
        <View style={MS.handle} />
        <Text style={MS.sheetTitle}>More</Text>

        {options.length === 0 ? (
          <Text style={MS.emptyText}>No additional options available.</Text>
        ) : (
          options.map((opt) => (
            <TouchableOpacity
              key={opt.screen}
              style={MS.option}
            onPress={() => {
                navigation.goBack();
                setTimeout(() => navigation.navigate(opt.screen), 300);
              }}
            >
              <View style={[MS.optionIcon, { backgroundColor: opt.bg }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <Text style={MS.optionLabel}>{opt.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#8f98a0" />
            </TouchableOpacity>
          ))
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const moreStyles = (T) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: T.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: T.textPrimary,
  },
  emptyText: {
    color: T.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
function MainTabs() {
  const insets = useSafeAreaInsets();
  const T = useThemeStore((state) => state);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingCount();
    // Poll every 30 seconds while app is open
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await client.get('/routing/pending');
      setPendingCount(res.data?.length ?? 0);
    } catch (err) {
      // silently fail — badge just won't show
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
      tabBarStyle: {
          backgroundColor: T.bgCard,
          borderTopColor: T.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
       tabBarIcon: ({ focused, color }) => (
          <TabIcon label={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Documents" component={DocumentsScreen} />
      
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="More"
        component={View}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('MoreModal');
          },
        })}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loadFromStorage } = useAuthStore();
  const T = useThemeStore((state) => state);
  const { loadTheme } = T;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadFromStorage(), loadTheme()]).then(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b2838' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bgPage } }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
            <Stack.Screen name="UsersScreen" component={UsersScreen} />
            <Stack.Screen name="RoutingStack" component={RoutingScreen} />
            <Stack.Screen name="AuditLogScreen" component={AuditLogScreen} />
            <Stack.Screen
              name="MoreModal"
              component={MoreModalScreen}
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}