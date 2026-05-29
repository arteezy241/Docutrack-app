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
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import useThemeStore from '../store/themeStore';

const EASE = Easing.bezier(0.32, 0.72, 0, 1);

const STATUS = {
  0: { label: 'Draft',     color: '#8f98a0', bg: 'rgba(143,152,160,0.12)' },
  1: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  2: { label: 'Approved',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  3: { label: 'Rejected',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  4: { label: 'Archived',  color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
};

const FILTERS = ['All', 'Draft', 'InReview', 'Approved', 'Rejected', 'Archived'];
const FILTER_MAP = { Draft: 0, InReview: 1, Approved: 2, Rejected: 3, Archived: 4 };

export default function DocumentsScreen({ navigation, route }) {
  const T = useThemeStore((state) => state);
  const [documents, setDocuments] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState(route?.params?.filter || 'All');

  const headerAnim = React.useRef(new Animated.Value(0)).current;
  const listAnim   = React.useRef(new Animated.Value(0)).current;

  const fetchDocuments = async () => {
    try {
      const res = await client.get('/Documents');
      setDocuments(res.data);
      setFiltered(res.data);
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    Animated.stagger(100, [
      Animated.timing(headerAnim, { toValue: 1, duration: 360, easing: EASE, useNativeDriver: true }),
      Animated.timing(listAnim,   { toValue: 1, duration: 360, easing: EASE, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let result = documents;
    if (activeFilter !== 'All') {
      result = result.filter((d) => d.status === FILTER_MAP[activeFilter]);
    }
    if (search.trim()) {
      result = result.filter((d) =>
        d.title?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(result);
  }, [search, activeFilter, documents]);

  const onRefresh = () => { setRefreshing(true); fetchDocuments(); };

  const isOverdue = (doc) =>
    doc.dueDate && new Date(doc.dueDate) < new Date() && doc.status !== 2 && doc.status !== 4;

  const S = styles(T);

  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  return (
    <View style={S.container}>
      {/* Header */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [10,0] }) }],
          paddingTop: 64,
          paddingHorizontal: 20,
        }}
      >
        <View style={S.titleRow}>
          <Text style={S.title}>Documents</Text>
          <View style={S.countBubble}>
            <Text style={S.countText}>{filtered.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={S.searchRow}>
          <Ionicons name="search" size={15} color={T.textMuted} />
          <TextInput
            style={S.searchInput}
            placeholder="Search"
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.pillsRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[S.pill, activeFilter === f && S.pillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[S.pillText, activeFilter === f && S.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* List */}
      <Animated.View
        style={{
          flex: 1,
          opacity: listAnim,
          transform: [{ translateY: listAnim.interpolate({ inputRange: [0,1], outputRange: [16,0] }) }],
        }}
      >
        <ScrollView
          contentContainerStyle={S.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
          }
        >
          {filtered.length === 0 ? (
            <View style={S.emptyState}>
              <Ionicons name="document-outline" size={44} color={T.textMuted} />
              <Text style={S.emptyTitle}>No documents</Text>
              <Text style={S.emptyText}>Try a different filter</Text>
            </View>
          ) : (
            <View style={S.listCard}>
              {filtered.map((doc, i) => {
                const st = STATUS[doc.status] || STATUS[0];
                const overdue = isOverdue(doc);
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={[
                      S.listRow,
                      i < filtered.length - 1 && S.listRowBorder,
                    ]}
                    onPress={() => navigation.navigate('DocumentDetail', { doc })}
                    activeOpacity={0.6}
                  >
                    {/* Status accent bar */}
                    <View style={[S.accentBar, { backgroundColor: st.color }]} />

                    {/* Content */}
                    <View style={S.rowContent}>
                      <View style={S.rowTop}>
                        <Text style={S.rowTitle} numberOfLines={1}>{doc.title || 'Untitled'}</Text>
                        <View style={[S.chip, { backgroundColor: st.bg }]}>
                          <Text style={[S.chipText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                      <View style={S.rowBottom}>
                        {doc.dueDate ? (
                          <View style={S.dueRow}>
                            <Ionicons
                              name={overdue ? 'warning-outline' : 'calendar-outline'}
                              size={11}
                              color={overdue ? '#f87171' : T.textMuted}
                            />
                            <Text style={[S.dueText, overdue && { color: '#f87171', fontWeight: '600' }]}>
                              {overdue ? 'Overdue · ' : ''}
                              {new Date(doc.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                        ) : (
                          <Text style={S.noDate}>No due date</Text>
                        )}
                        <Text style={S.createdText}>
                          {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = (T) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bgPage },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: T.bgPage,
  },

  // Header
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: T.textPrimary,
    letterSpacing: -1,
    flex: 1,
  },
  countBubble: {
    backgroundColor: T.accent,
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.bgInput,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: T.textPrimary,
    padding: 0,
  },

  // Pills
  pillsRow: {
    gap: 8,
    paddingBottom: 16,
    paddingRight: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.bgInput,
  },
  pillActive: {
    backgroundColor: T.accent,
  },
  pillText: {
    fontSize: 13,
    color: T.textMuted,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  listCard: {
    backgroundColor: T.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginVertical: 14,
    marginLeft: 14,
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    justifyContent: 'center',
    gap: 5,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textPrimary,
    flex: 1,
    letterSpacing: -0.2,
  },
  chip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 12,
    color: T.textMuted,
  },
  noDate: {
    fontSize: 12,
    color: T.textMuted,
    opacity: 0.5,
  },
  createdText: {
    fontSize: 12,
    color: T.textMuted,
    opacity: 0.5,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: T.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: T.textMuted,
  },
});