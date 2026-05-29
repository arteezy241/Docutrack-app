import React, { useState } from 'react';
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
} from 'react-native';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
export default function ProfileScreen({ navigation }) {
  const { user, setUser, logout } = useAuthStore();
  const T = useThemeStore();
  const { isDark, toggleTheme } = T;
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(user?.isTwoFactorEnabled || false);
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleUpdateProfile = async () => {
    if (!fullName.trim() || !username.trim()) {
      Alert.alert('Error', 'Full name and username are required.');
      return;
    }
    setProfileLoading(true);
    try {
      await client.patch('/Users/profile', { fullName, username });
      setUser({ ...user, fullName, username });
      Alert.alert('Success', 'Profile updated successfully.');
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
      await client.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Success', 'Password changed successfully.');
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
      Alert.alert(
        'Success',
        `Two-factor authentication ${res.data.isTwoFactorEnabled ? 'enabled' : 'disabled'}.`
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to toggle 2FA.');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleLogout = async () => {
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

  const getRoleBadgeColor = (role) => {
    const map = {
      Admin: { bg: 'rgba(129,140,248,0.15)', color: '#818cf8' },
      Staff: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
      Viewer: { bg: 'rgba(143,152,160,0.12)', color: T.textMuted },
    };
    return map[role] || map['Viewer'];
  };

  const roleColors = getRoleBadgeColor(user?.role);

  const S = styles(T);
  return (
    <ScrollView style={S.container} contentContainerStyle={S.inner}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

      {/* Avatar & Info */}
      <View style={S.avatarCard}>
        <View style={S.avatar}>
          <Text style={S.avatarText}>
            {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={S.avatarName}>{user?.fullName}</Text>
        <Text style={S.avatarEmail}>{user?.email}</Text>
        <View style={[S.roleBadge, { backgroundColor: roleColors.bg }]}>
          <Text style={[S.roleText, { color: roleColors.color }]}>{user?.role}</Text>
        </View>
      </View>

      {/* Update Profile */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Edit Profile</Text>
        <View style={S.card}>
          <Text style={S.label}>Full Name</Text>
          <TextInput
            style={S.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={T.textMuted}
          />
          <Text style={S.label}>Username</Text>
          <TextInput
            style={S.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={T.textMuted}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleUpdateProfile}
            disabled={profileLoading}
            style={{ borderRadius: 10, marginTop: 4, opacity: profileLoading ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={['#47bfff', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={S.primaryBtn}
            >
              {profileLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={S.primaryBtnText}>Save Changes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Change Password */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Change Password</Text>
        <View style={S.card}>
          <Text style={S.label}>Current Password</Text>
          <TextInput
            style={S.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={T.textMuted}
            secureTextEntry
          />
          <Text style={S.label}>New Password</Text>
          <TextInput
            style={S.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password (8+ chars)"
            placeholderTextColor={T.textMuted}
            secureTextEntry
          />
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={passwordLoading}
            style={{ borderRadius: 10, marginTop: 4, opacity: passwordLoading ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={['#47bfff', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={S.primaryBtn}
            >
              {passwordLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={S.primaryBtnText}>Change Password</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2FA Toggle */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Security</Text>
        <View style={S.card}>
          <View style={S.toggleRow}>
            <View>
              <Text style={S.toggleLabel}>Two-Factor Authentication</Text>
              <Text style={S.toggleSub}>
                {twoFaEnabled ? 'Enabled — extra security on login' : 'Disabled — turn on for extra security'}
              </Text>
            </View>
            {twoFaLoading ? (
              <ActivityIndicator color="#4F46E5" size="small" />
            ) : (
              <Switch
                value={twoFaEnabled}
                onValueChange={handleToggle2FA}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#4F46E5' }}
                thumbColor="#fff"
              />
            )}
          </View>

          <View style={[S.divider]} />

          <View style={S.toggleRow}>
            <View>
              <Text style={S.toggleLabel}>Dark Mode</Text>
              <Text style={S.toggleSub}>
                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#4F46E5' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <View style={S.section}>
        <TouchableOpacity style={S.signOutBtn} onPress={handleLogout}>
          <Text style={S.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

    </Animated.View>
    </ScrollView>
  );
}

const styles = (T) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage
  },
  inner: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  avatarCard: {
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: T.bgCard,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: T.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  avatarName: {
    fontSize: 22,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 4,
  },
  avatarEmail: {
    fontSize: 13,
    color: T.textMuted,
    marginBottom: 10,
  },
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
   backgroundColor: T.bgCard,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
  },
  label: {
    fontSize: 12,
    color: T.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: T.bgInput,
    borderWidth: 1,
    borderColor: T.borderInput,
    borderRadius: 10,
    padding: 12,
    color: T.textPrimary,
    fontSize: 14,
    marginBottom: 14,
  },
  primaryBtn: {
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
    marginBottom: 4,
    flex: 1,
  },
  toggleSub: {
    fontSize: 12,
    color: T.textMuted,
    flex: 1,
    paddingRight: 12,
  },
  signOutBtn: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  signOutText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: T.divider,
    marginVertical: 12,
  },
});