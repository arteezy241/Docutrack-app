import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';


export default function DashboardScreen({ navigation }) {
 const { user } = useAuthStore();
  const T = useThemeStore();
  const [stats, setStats] = useState(null);
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;
  const [pending, setPending] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

 const fetchData = async () => {
    try {
      const [docsRes, pendingRes, usersRes] = await Promise.all([
        client.get('/Documents'),
        client.get('/routing/pending'),
        client.get('/Users'),
      ]);
      console.log('pending raw:', JSON.stringify(pendingRes.data));

      const docs = docsRes.data;
      const users = usersRes.data;
      const now = new Date();

      setStats({
        total: docs.length,
        draft: docs.filter((d) => d.status === 0).length,
        inReview: docs.filter((d) => d.status === 1).length,
        approved: docs.filter((d) => d.status === 2).length,
      });

      // Cross-reference pending items with docs + users lists
     const enrichedPending = pendingRes.data.slice(0, 5).map((item) => {
        const matchedDoc  = docs.find((d) => d.id === item.documentId);
        const matchedUser = users.find((u) => u.id === item.fromUserId);
        console.log('fromUserId:', item.fromUserId);
        console.log('all user ids:', users.map(u => u.id));
        console.log('matched:', matchedUser?.fullName);
        return {
          ...item,
          document: matchedDoc  || item.document,
          fromUser: matchedUser || item.fromUser,
        };
      });

      setPending(enrichedPending);

      setOverdue(
        docs
          .filter((d) => d.dueDate && new Date(d.dueDate) < now && d.status !== 2 && d.status !== 4)
          .slice(0, 5)
      );
    } catch (err) {
      console.log('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  

  const statusLabel = (status) => {
    const map = { 0: 'Draft', 1: 'In Review', 2: 'Approved', 3: 'Rejected', 4: 'Archived' };
    return map[status] || 'Unknown';
  };

  const statusColor = (status) => {
    const map = {
      0: '#8f98a0',
      1: '#f59e0b',
      2: '#4ade80',
      3: '#f87171',
      4: '#818cf8',
    };
    return map[status] || '#8f98a0';
  };

  const S = styles(T);
  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={S.container}
      contentContainerStyle={S.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.greeting}>Good day,</Text>
            <Text style={S.name}>{user?.fullName || user?.username}</Text>
          </View>
          <View style={S.avatar}>
            <Text style={S.avatarText}>
              {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        </View>

        {/* Stats Row — horizontal scroll like Instagram stories */}
        {stats && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.statsRow}
          >
            {[
              { label: 'Total', value: stats.total, color: '#47bfff', filter: 'All' },
              { label: 'In Review', value: stats.inReview, color: '#f59e0b', filter: 'InReview' },
              { label: 'Approved', value: stats.approved, color: '#4ade80', filter: 'Approved' },
              { label: 'Draft', value: stats.draft, color: '#8f98a0', filter: 'Draft' },
            ].map((stat) => (
              <TouchableOpacity
                key={stat.label}
                style={S.statPill}
                onPress={() => navigation.navigate('Documents', { filter: stat.filter })}
              >
                <Text style={[S.statNumber, { color: stat.color }]}>{stat.value}</Text>
                <Text style={S.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Divider */}
        <View style={S.divider} />

        {/* Pending Approvals */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>Pending Approvals</Text>
            {pending.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('RoutingStack')}>
                <Text style={S.seeAll}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {pending.length === 0 ? (
            <Text style={S.emptyText}>You're all caught up</Text>
          ) : (
            pending.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={S.row}
                onPress={() => navigation.navigate('RoutingStack')}
              >
                <View style={S.rowDot} />
                <View style={S.rowContent}>
                  <Text style={S.rowTitle}>{item.document?.title || item.docTitle || 'Untitled'}</Text>
                  <Text style={S.rowSub}>From {item.fromUser?.fullName || 'System'}</Text>
                </View>
                <View style={S.pendingChip}>
                  <Text style={S.pendingChipText}>Pending</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={S.divider} />

        {/* Overdue */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>Overdue</Text>
            {overdue.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Documents')}>
                <Text style={S.seeAll}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {overdue.length === 0 ? (
            <Text style={S.emptyText}>No overdue documents</Text>
          ) : (
            overdue.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={S.row}
                onPress={() => navigation.navigate('DocumentDetail', { doc: item })}
              >
                <View style={[S.rowDot, { backgroundColor: '#f87171' }]} />
                <View style={S.rowContent}>
                  <Text style={S.rowTitle}>{item.title}</Text>
                  <Text style={[S.rowSub, { color: '#f87171' }]}>
                    Due {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={[S.pendingChip, { backgroundColor: `${statusColor(item.status)}22` }]}>
                  <Text style={[S.pendingChipText, { color: statusColor(item.status) }]}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </Animated.View>
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
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bgPage,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 13,
    color: T.textMuted,
    marginBottom: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: T.textPrimary,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    background: 'linear-gradient(135deg, #47bfff, #4F46E5)',
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // Stats row
  statsRow: {
    paddingLeft: 20,
    paddingRight: 40,
    gap: 10,
    paddingBottom: 4,
  },
  statPill: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: T.bgCard,
    borderRadius: 20,
    minWidth: 80,
    borderWidth: 1,
    borderColor: T.border,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: T.divider,
    marginVertical: 20,
    marginHorizontal: 20,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    color: T.textAccent,
    fontWeight: '600',
  },
  emptyText: {
    color: T.textMuted,
    fontSize: 13,
    paddingBottom: 8,
  },

  // Rows (Discord-style list items)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    color: T.textMuted,
  },
  pendingChip: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  pendingChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },

  // Legacy compat
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  card: { backgroundColor: T.bgCard, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  cardTitle: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 12, color: T.textMuted, marginBottom: 8 },
  cardNote: { fontSize: 12, color: T.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  emptyCard: { backgroundColor: T.bgCard, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: T.border },
});