import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

const roleColors = {
  Admin:  { bg: 'rgba(129,140,248,0.15)', color: '#818cf8' },
  Staff:  { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80' },
  Viewer: { bg: 'rgba(143,152,160,0.12)', color: '#8f98a0' },
};

export default function UsersScreen() {
  const { user: currentUser } = useAuthStore();
  const T = useThemeStore((state) => state);
  const [users, setUsers]         = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [actionLoading, setActionLoading] = useState(null); // stores id of user being acted on

  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;

  const fetchUsers = async () => {
    try {
      const res = await client.get('/Users');
      setUsers(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.log('Fetch users error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(users);
      return;
    }
    setFiltered(
      users.filter((u) =>
        u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, users]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleDeactivate = (user) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Error', 'You cannot deactivate your own account.');
      return;
    }
    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate ${user.fullName || user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(user.id);
            try {
              await client.delete(`/Users/${user.id}`);
              await fetchUsers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to deactivate user.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async (user) => {
    Alert.alert(
      'Reactivate User',
      `Reactivate ${user.fullName || user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            setActionLoading(user.id);
            try {
              await client.patch(`/Users/${user.id}/reactivate`);
              await fetchUsers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to reactivate user.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const S = styles(T);

  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  if (currentUser?.role !== 'Admin') {
    return (
      <View style={S.centered}>
        <Text style={S.restrictedText}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: T.bgPage, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={{ paddingTop: 56 }}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.title}>Users</Text>
          <Text style={S.count}>{filtered.length} total</Text>
        </View>

        {/* Search */}
        <View style={S.searchBox}>
          <TextInput
            style={S.searchInput}
            placeholder="Search users..."
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={S.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
        }
      >
        {filtered.length === 0 ? (
          <View style={S.emptyCard}>
            <Text style={S.emptyText}>No users found</Text>
          </View>
        ) : (
          filtered.map((user) => {
            const role = roleColors[user.role] || roleColors.Viewer;
            const isLoading = actionLoading === user.id;
            const isCurrentUser = user.id === currentUser?.id;

            return (
              <View key={user.id} style={[S.card, !user.isActive && S.cardInactive]}>
                {/* Avatar + Info */}
                <View style={S.cardTop}>
                  <View style={[S.avatar, !user.isActive && S.avatarInactive]}>
                    <Text style={S.avatarText}>
                      {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>

                  <View style={S.userInfo}>
                    <View style={S.nameRow}>
                      <Text style={S.userName}>{user.fullName || user.username}</Text>
                      {!user.isActive && (
                        <View style={S.inactiveBadge}>
                          <Text style={S.inactiveBadgeText}>Inactive</Text>
                        </View>
                      )}
                    </View>
                    <Text style={S.userEmail}>{user.email}</Text>
                    <View style={S.metaRow}>
                      <View style={[S.roleBadge, { backgroundColor: role.bg }]}>
                        <Text style={[S.roleText, { color: role.color }]}>{user.role}</Text>
                      </View>
                      {user.departmentName ? (
                        <Text style={S.dept}>{user.departmentName}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Action buttons — hide for current user */}
                {!isCurrentUser && (
                  <View style={S.actions}>
                    {user.isActive ? (
                      <TouchableOpacity
                        style={S.deactivateBtn}
                        onPress={() => handleDeactivate(user)}
                        disabled={isLoading}
                      >
                        {isLoading
                          ? <ActivityIndicator color="#f87171" size="small" />
                          : <Text style={S.deactivateBtnText}>Deactivate</Text>
                        }
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleReactivate(user)}
                        disabled={isLoading}
                        style={{ flex: 1, borderRadius: 8, opacity: isLoading ? 0.6 : 1 }}
                      >
                        <LinearGradient
                          colors={['#47bfff', '#4F46E5']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={S.reactivateBtn}
                        >
                          {isLoading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={S.reactivateBtnText}>Reactivate</Text>
                          }
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = (T) => StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bgPage,
  },
  restrictedText: {
    color: T.textMuted,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: T.textPrimary,
  },
  count: {
    fontSize: 13,
    color: T.textMuted,
  },
  searchBox: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: T.bgInput,
    borderWidth: 1,
    borderColor: T.borderInput,
    borderRadius: 10,
    padding: 12,
    color: T.textPrimary,
    fontSize: 14,
  },
  list: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 12,
  },
  cardInactive: {
    opacity: 0.6,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
  },
  inactiveBadge: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: '#f87171',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    color: T.textMuted,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dept: {
    fontSize: 11,
    color: T.textMuted,
  },
  actions: {
    flexDirection: 'row',
  },
  deactivateBtn: {
    flex: 1,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  deactivateBtnText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 13,
  },
  reactivateBtn: {
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  reactivateBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: T.bgCard,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyText: {
    color: T.textMuted,
    fontSize: 14,
  },
});