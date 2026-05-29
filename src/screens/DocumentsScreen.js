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
import useThemeStore from '../store/themeStore';

export default function DocumentsScreen({ navigation, route }) {
  const [documents, setDocuments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(route?.params?.filter || 'All');

const T = useThemeStore();
  const S = styles(T);
  const filters = ['All', 'Draft', 'InReview', 'Approved', 'Rejected', 'Archived'];
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;

  const statusMap = {
    0: { label: 'Draft', color: '#c6d4df', bg: 'rgba(198,212,223,0.1)' },
    1: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    2: { label: 'Approved', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    3: { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    4: { label: 'Archived', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  };

  const fetchDocuments = async () => {
    try {
      const res = await client.get('/Documents');
      setDocuments(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.log('Fetch documents error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let result = documents;

    if (activeFilter !== 'All') {
      const filterMap = {
        Draft: 0, InReview: 1, Approved: 2, Rejected: 3, Archived: 4,
      };
      result = result.filter((d) => d.status === filterMap[activeFilter]);
    }

    if (search.trim()) {
      result = result.filter((d) =>
        d.title?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(result);
  }, [search, activeFilter, documents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const isOverdue = (doc) => {
    if (!doc.dueDate) return false;
    return new Date(doc.dueDate) < new Date() && doc.status !== 2 && doc.status !== 4;
  };

  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

 return (
    <Animated.View style={{ flex: 1, backgroundColor: T.bgPage, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

      {/* Header */}
      <View style={{ paddingTop: 56 }}>
        <View style={S.header}>
          <Text style={S.title}>Documents</Text>
          <View style={S.countChip}>
            <Text style={S.countText}>{filtered.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={S.searchBox}>
          <Ionicons name="search-outline" size={16} color={T.textMuted} style={S.searchIcon} />
          <TextInput
            style={S.searchInput}
            placeholder="Search documents..."
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={S.filterRow}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[S.pill, activeFilter === f && S.pillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[S.pillText, activeFilter === f && S.pillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Divider */}
      <View style={S.divider} />

      {/* Documents List */}
      <ScrollView
        contentContainerStyle={S.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {filtered.length === 0 ? (
          <View style={S.emptyState}>
            <Ionicons name="document-outline" size={48} color={T.textMuted} style={{ marginBottom: 12 }} />
            <Text style={S.emptyTitle}>No documents found</Text>
            <Text style={S.emptyText}>Try a different filter or search term</Text>
          </View>
        ) : (
          filtered.map((doc) => {
            const status = statusMap[doc.status] || statusMap[0];
            const overdue = isOverdue(doc);
            return (
              <TouchableOpacity
                key={doc.id}
                style={S.row}
                onPress={() => navigation.navigate('DocumentDetail', { doc })}
              >
                {/* Left accent */}
                <View style={[S.rowAccent, { backgroundColor: status.color }]} />

                {/* Content */}
                <View style={S.rowContent}>
                  <View style={S.rowTop}>
                    <Text style={S.rowTitle} numberOfLines={1}>{doc.title || 'Untitled'}</Text>
                    <View style={[S.statusChip, { backgroundColor: status.bg }]}>
                      <Text style={[S.statusChipText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={S.rowBottom}>
                    {doc.dueDate ? (
                      <View style={S.duePill}>
                        <Ionicons
                          name={overdue ? 'warning-outline' : 'calendar-outline'}
                          size={11}
                          color={overdue ? '#f87171' : T.textMuted}
                        />
                        <Text style={[S.dueText, overdue && S.dueTextOverdue]}>
                          {overdue ? 'Overdue · ' : ''}{new Date(doc.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    ) : (
                      <Text style={S.noDate}>No due date</Text>
                    )}
                    <Text style={S.dateText}>
                      {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = (T) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: T.textPrimary,
    letterSpacing: -0.5,
    flex: 1,
  },
  countChip: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: T.bgInput,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: T.borderInput,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    color: T.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.bgInput,
    borderWidth: 1,
    borderColor: T.border,
  },
  pillActive: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  pillText: {
    fontSize: 12,
    color: T.textMuted,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: T.divider,
    marginBottom: 4,
  },
  list: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 14,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  rowAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: 14,
    marginLeft: 20,
    minHeight: 40,
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
    flex: 1,
  },
  statusChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 11,
    color: T.textMuted,
  },
  dueTextOverdue: {
    color: '#f87171',
    fontWeight: '600',
  },
  noDate: {
    fontSize: 11,
    color: T.textMuted,
    opacity: 0.5,
  },
  dateText: {
    fontSize: 11,
    color: T.textMuted,
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bgPage,
  },
});