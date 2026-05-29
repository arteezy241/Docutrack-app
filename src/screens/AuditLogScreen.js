import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

const ACTION_COLORS = {
  LOGIN_SUCCESS:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  LOGIN_FAILED:     { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  DOCUMENT_CREATED: { color: '#47bfff', bg: 'rgba(71,191,255,0.12)'  },
  DOCUMENT_DELETED: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  DOCUMENT_ROUTED:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  APPROVED:         { color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  REJECTED:         { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  FILE_UPLOADED:    { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  DEVICE_VERIFIED:  { color: '#47bfff', bg: 'rgba(71,191,255,0.12)'  },
  DEFAULT:          { color: '#8f98a0', bg: 'rgba(143,152,160,0.12)' },
};

const getActionStyle = (action) =>
  ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;

export default function AuditLogScreen({ navigation }) {
  const { user } = useAuthStore();
  const T = useThemeStore((state) => state);
  const [logs, setLogs]           = useState([]);
  const [filtered, setFiltered] = useState([]);
  const safeFiltered = Array.isArray(filtered) ? filtered : [];
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const PAGE_SIZE = 20;

  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;

  const fetchLogs = async (pageNum = 1, append = false) => {
    try {
      const res = await client.get(`/audit/system?page=${pageNum}&pageSize=${PAGE_SIZE}`);
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.logs)
        ? res.data.logs
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];
      if (append) {
        setLogs((prev) => [...prev, ...data]);
      } else {
        setLogs(data);
      }
      const total = res.data?.total ?? data.length;
      setHasMore((pageNum * PAGE_SIZE) < total);
    } catch (err) {
      console.log('Audit log error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(logs);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      logs.filter((l) =>
        l.action?.toLowerCase().includes(q) ||
        l.userEmail?.toLowerCase().includes(q) ||
        l.resourceType?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q)
      )
    );
  }, [search, logs]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchLogs(1, false);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchLogs(next, true);
  };

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '—';

  const S = styles(T);

  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  if (user?.role !== 'Admin') {
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
            <Ionicons name="arrow-back" size={22} color={T.textAccent} />
          </TouchableOpacity>
          <Text style={S.title}>Audit Log</Text>
        </View>

        {/* Search */}
        <View style={S.searchBox}>
          <TextInput
            style={S.searchInput}
            placeholder="Search by action, user, type..."
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
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (nearBottom) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {safeFiltered.length === 0 ? (
          <View style={S.emptyCard}>
            <Text style={S.emptyText}>No audit logs found</Text>
          </View>
        ) : (
          safeFiltered.map((log) => {
            const actionStyle = getActionStyle(log.action);
            return (
              <View key={log.id} style={S.card}>
                {/* Action badge + timestamp */}
                <View style={S.cardTop}>
                  <View style={[S.actionBadge, { backgroundColor: actionStyle.bg }]}>
                    <Text style={[S.actionText, { color: actionStyle.color }]}>
                      {log.action?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={S.timestamp}>{formatDateTime(log.timestamp)}</Text>
                </View>

                {/* User */}
                <Text style={S.userEmail}>
                  {log.userEmail || 'System'}
                </Text>

                {/* Resource */}
                {log.resourceType ? (
                  <View style={S.resourceRow}>
                    <Text style={S.resourceType}>{log.resourceType}</Text>
                    {log.resourceId ? (
                      <Text style={S.resourceId} numberOfLines={1}>
                        #{log.resourceId.slice(0, 8)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Details */}
                {log.details ? (
                  <Text style={S.details} numberOfLines={2}>
                    {log.details}
                  </Text>
                ) : null}

                {/* IP */}
                {log.ipAddress ? (
                  <Text style={S.ip}>{log.ipAddress}</Text>
                ) : null}
              </View>
            );
          })
        )}

        {/* Load more */}
        {hasMore && !search.trim() && (
          <TouchableOpacity style={S.loadMoreBtn} onPress={loadMore}>
            <Text style={S.loadMoreText}>Load more</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: T.textPrimary,
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
  },
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  actionBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 1,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 11,
    color: T.textMuted,
    flexShrink: 0,
  },
  userEmail: {
    fontSize: 13,
    color: T.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resourceType: {
    fontSize: 11,
    color: T.textAccent,
    fontWeight: '600',
  },
  resourceId: {
    fontSize: 11,
    color: T.textMuted,
    flex: 1,
  },
  details: {
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  ip: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
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
  loadMoreBtn: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    color: T.textAccent,
    fontSize: 13,
    fontWeight: '600',
  },
});