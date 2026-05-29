import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';
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

const TAB_META = {
  Dashboard: { icon: 'grid',                       outline: 'grid-outline' },
  Documents: { icon: 'document-text',              outline: 'document-text-outline' },
  Profile:   { icon: 'person',                     outline: 'person-outline' },
  More:      { icon: 'ellipsis-horizontal-circle', outline: 'ellipsis-horizontal-circle-outline' },
};

function FloatingTabBar({ state, navigation }) {
  const T = useThemeStore((s) => s);
  const insets = useSafeAreaInsets();

  const scaleAnims = React.useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  const handlePress = (route, index) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.82, duration: 90, useNativeDriver: true }),
      Animated.spring(scaleAnims[index], { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();

    if (route.name === 'More') {
      navigation.navigate('MoreModal');
      return;
    }
    if (state.index !== index) {
      navigation.navigate(route.name);
    }
  };

  const TS = tabStyles(T);

  return (
    <View style={[TS.container, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
      <View style={TS.pill}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const isFocused = state.index === index && route.name !== 'More';

          return (
            <TouchableOpacity
              key={route.name}
              onPress={() => handlePress(route, index)}
              activeOpacity={1}
              style={TS.tabBtn}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnims[index] }] }}>
                {isFocused ? (
                  <LinearGradient
                    colors={['#47bfff', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={TS.activePill}
                  >
                    <Ionicons name={meta.icon} size={22} color="#fff" />
                  </LinearGradient>
                ) : (
                  <View style={TS.inactiveWrap}>
                    <Ionicons name={meta.outline} size={22} color={T.textMuted} />
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = (T) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23,26,33,0.96)',
    borderRadius: 40,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#47bfff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  tabBtn: {
    width: 60,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    width: 52,
    height: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveWrap: {
    width: 52,
    height: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
function MoreModalScreen({ navigation }) {
  const { user } = useAuthStore();
  const T = useThemeStore((state) => state);

  const slideAnim = React.useRef(new Animated.Value(60)).current;
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const isAdmin = user?.role === 'Admin';

  const options = [
    {
      label: 'Approvals',
      subtitle: 'Pending document approvals',
      icon: 'checkmark-circle-outline',
      screen: 'RoutingStack',
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.12)',
    },
    ...(isAdmin ? [
      {
        label: 'Users',
        subtitle: 'Manage team members',
        icon: 'people-outline',
        screen: 'UsersScreen',
        color: '#818cf8',
        bg: 'rgba(129,140,248,0.12)',
      },
      {
        label: 'Audit Log',
        subtitle: 'System activity history',
        icon: 'shield-checkmark-outline',
        screen: 'AuditLogScreen',
        color: '#47bfff',
        bg: 'rgba(71,191,255,0.12)',
      },
    ] : []),
  ];

  const MS = moreStyles(T);

  return (
    <Animated.View style={[MS.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => navigation.goBack()} />
      <Animated.View style={[MS.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={MS.handle} />
        <View style={MS.sheetHeader}>
          <Text style={MS.sheetTitle}>More</Text>
          <Text style={MS.sheetSubtitle}>{user?.fullName || user?.username}</Text>
        </View>
        <View style={MS.optionsList}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.screen}
              style={[MS.option, i < options.length - 1 && MS.optionBorder]}
              onPress={() => {
                navigation.goBack();
                setTimeout(() => navigation.navigate(opt.screen), 280);
              }}
              activeOpacity={0.6}
            >
              <View style={[MS.optionIcon, { backgroundColor: opt.bg }]}>
                <Ionicons name={opt.icon} size={20} color={opt.color} />
              </View>
              <View style={MS.optionText}>
                <Text style={MS.optionLabel}>{opt.label}</Text>
                <Text style={MS.optionSub}>{opt.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={T.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const moreStyles = (T) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.divider,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetHeader: { marginBottom: 20 },
  sheetTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: T.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 2,
  },
  sheetSubtitle: { fontSize: 14, color: T.textMuted },
  optionsList: {
    backgroundColor: T.bgDeep,
    borderRadius: 16,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textPrimary,
    marginBottom: 1,
  },
  optionSub: { fontSize: 12, color: T.textMuted },
});
function MainTabs() {
  const T = useThemeStore((state) => state);

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: T.bgPage, paddingBottom: 96 }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Documents" component={DocumentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="More"
        component={View}
        listeners={({ navigation }) => ({
          tabPress: (e) => e.preventDefault(),
        })}
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