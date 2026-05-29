import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

const EASE = Easing.bezier(0.32, 0.72, 0, 1);

export default function ProfileScreen({ navigation }) {
  const { user, setUser, logout } = useAuthStore();
  const T = useThemeStore((state) => state);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(user?.isTwoFactorEnabled || false);

  // Staggered entrance — one orchestrated sequence
  const anims = React.useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      70,
      anims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 360, easing: EASE, useNativeDriver: true })
      )
    ).start();
  }, []);

  const animStyle = (i) => ({
    opacity: anims[i],
    transform: [
      { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
    ],
  });

  const handleUpdateProfile = async () => {
    if (!fullName.trim() || !username.trim()) {
      Alert.alert('Error', 'Full name and username are required.');
      return;
    }
    setProfileLoading(true);
    try {
      await client.patch('/Users/profile', { fullName, username });
      setUser({ ...user, fullName, username });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    setPasswordLoading(true);
    try {
      await client.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Done', 'Password changed successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setTwoFaLoading(true);
    try {
      const res = await client.patch('/auth/2fa/toggle');
      setTwoFaEnabled(res.data.isTwoFactorEnabled);
      setUser({ ...user, isTwoFactorEnabled: res.data.isTwoFactorEnabled });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to toggle 2FA.');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.getParent()?.replace('Login');
        },
      },
    ]);
  };

  const roleStyles = {
    Admin:  { bg: 'rgba(129,140,248,0.15)', color: '#818cf8' },
    Staff:  { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80' },
    Viewer: { bg: 'rgba(143,152,160,0.12)', color: T.textMuted },
  };
  const role = roleStyles[user?.role] || roleStyles.Viewer;

  const S = styles(T);

  return (
    <ScrollView style={S.container} contentContainerStyle={S.inner}>

      {/* Header — avatar + identity */}
      <Animated.View style={[S.identity, animStyle(0)]}>
        <View style={S.avatarWrap}>
          <LinearGradient
            colors={['#47bfff', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.avatar}
          >
            <Text style={S.avatarText}>
              {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        </View>
        <Text style={S.name}>{user?.fullName}</Text>
        <Text style={S.email}>{user?.email}</Text>
        <View style={[S.rolePill, { backgroundColor: role.bg }]}>
          <Text style={[S.roleText, { color: role.color }]}>{user?.role}</Text>
        </View>
      </Animated.View>

      {/* PERSONAL INFO */}
      <Animated.View style={animStyle(1)}>
        <Text style={S.sectionHeader}>Personal Info</Text>
        <View style={S.group}>
          <View style={S.row}>
            <Text style={S.rowLabel}>Full Name</Text>
            <TextInput
              style={S.rowInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
              placeholderTextColor={T.textMuted}
            />
          </View>
          <View style={S.rowDivider} />
          <View style={S.row}>
            <Text style={S.rowLabel}>Username</Text>
            <TextInput
              style={S.rowInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={T.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={S.rowDivider} />
          <TouchableOpacity
            onPress={handleUpdateProfile}
            disabled={profileLoading}
            style={{ opacity: profileLoading ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={['#47bfff', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={S.actionRow}
            >
              {profileLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={S.actionRowText}>Save Changes</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* CHANGE PASSWORD */}
      <Animated.View style={animStyle(2)}>
        <Text style={S.sectionHeader}>Change Password</Text>
        <View style={S.group}>
          <View style={S.row}>
            <Text style={S.rowLabel}>Current</Text>
            <TextInput
              style={S.rowInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={T.textMuted}
              secureTextEntry
            />
          </View>
          <View style={S.rowDivider} />
          <View style={S.row}>
            <Text style={S.rowLabel}>New</Text>
            <TextInput
              style={S.rowInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={T.textMuted}
              secureTextEntry
            />
          </View>
          <View style={S.rowDivider} />
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={passwordLoading}
            style={{ opacity: passwordLoading ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={['#47bfff', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={S.actionRow}
            >
              {passwordLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={S.actionRowText}>Update Password</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* PREFERENCES */}
      <Animated.View style={animStyle(3)}>
        <Text style={S.sectionHeader}>Preferences</Text>
        <View style={S.group}>
          <View style={S.toggleRow}>
            <View style={S.toggleTextWrap}>
              <Text style={S.toggleLabel}>Two-Factor Auth</Text>
              <Text style={S.toggleSub}>
                {twoFaEnabled ? 'Email code required on new devices' : 'Off'}
              </Text>
            </View>
            {twoFaLoading
              ? <ActivityIndicator color={T.accent} size="small" />
              : <Switch
                  value={twoFaEnabled}
                  onValueChange={handleToggle2FA}
                  trackColor={{ false: T.borderInput, true: '#4F46E5' }}
                  thumbColor="#fff"
                  ios_backgroundColor={T.borderInput}
                />}
          </View>
        </View>
      </Animated.View>

      {/* SIGN OUT — destructive standalone row */}
      <Animated.View style={animStyle(4)}>
        <View style={[S.group, { marginTop: 8 }]}>
          <TouchableOpacity style={S.signOutRow} onPress={handleLogout}>
            <Text style={S.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = (T) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  inner: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Identity header
  identity: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrap: {
    marginBottom: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: T.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: T.textMuted,
    marginBottom: 12,
  },
  rolePill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Section header — uppercase small caps muted
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
  },

  // Grouped inset card
  group: {
    backgroundColor: T.bgCard,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },

  // Form rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowLabel: {
    fontSize: 15,
    color: T.textPrimary,
    fontWeight: '500',
    width: 96,
  },
  rowInput: {
    flex: 1,
    fontSize: 15,
    color: T.textPrimary,
    padding: 0,
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: T.divider,
    marginLeft: 16,
  },

  // Inline action row (gradient button inside group)
  actionRow: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: T.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 12,
    color: T.textMuted,
  },

  // Sign out destructive
  signOutRow: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});