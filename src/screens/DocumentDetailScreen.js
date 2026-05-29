import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import useThemeStore from '../store/themeStore';

const statusMap = {
  0: { label: 'Draft',     color: '#8f98a0', bg: 'rgba(143,152,160,0.12)' },
  1: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  2: { label: 'Approved',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  3: { label: 'Rejected',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  4: { label: 'Archived',  color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
};

const routingStatusMap = {
  0: 'Draft', 1: 'In Review', 2: 'Approved', 3: 'Rejected', 4: 'Archived',
};

export default function DocumentDetailScreen({ route, navigation }) {
  const { doc } = route.params;
  const T = useThemeStore((state) => state);

  const [history, setHistory]           = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const status  = statusMap[doc.status] ?? statusMap[0];
  const overdue = doc.dueDate &&
    new Date(doc.dueDate) < new Date() &&
    doc.status !== 2 && doc.status !== 4;

  const fetchHistory = async () => {
    try {
      const res = await client.get(`/Documents/${doc.id}/routing`);
      setHistory(res.data);
    } catch (err) {
      console.log('Routing history error:', err);
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const routingEventStatus = (event) => {
    if (event.statusAfter !== null && event.statusAfter !== undefined) {
      return routingStatusMap[event.statusAfter] ?? '—';
    }
    return null;
  };

  const S = styles(T);

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
        }
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Document Info Card */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <Text style={S.docTitle}>{doc.title || 'Untitled'}</Text>
            <View style={[S.badge, { backgroundColor: status.bg }]}>
              <Text style={[S.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {doc.content ? (
            <Text style={S.content}>{doc.content}</Text>
          ) : null}

          <View style={S.divider} />

          <MetaRow T={T} label="Created" value={formatDate(doc.createdAt)} />
          <MetaRow T={T} label="Updated" value={formatDate(doc.updatedAt)} />

          {doc.dueDate ? (
            <MetaRow
              T={T}
              label="Due Date"
              value={formatDate(doc.dueDate)}
              valueStyle={overdue ? S.overdueText : null}
              suffix={overdue ? '  ⚠ Overdue' : null}
              suffixStyle={S.overdueText}
            />
          ) : (
            <MetaRow T={T} label="Due Date" value="No due date" />
          )}

          {doc.fileName ? (
            <>
              <View style={S.divider} />
              <TouchableOpacity
                style={S.fileBtn}
                onPress={() => doc.fileUrl && Linking.openURL(doc.fileUrl)}
              >
                <Text style={S.fileBtnText}>📄  {doc.fileName}</Text>
                <Text style={S.fileDownload}>Open</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={S.divider} />
              <Text style={S.noFile}>No file attached</Text>
            </>
          )}
        </View>

        {/* Routing History Card */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>Routing History</Text>

          {loadingHistory ? (
            <ActivityIndicator color={T.accent} style={{ marginVertical: 24 }} />
          ) : history.length === 0 ? (
            <Text style={S.emptyText}>No routing history yet.</Text>
          ) : (
            history.map((event, index) => {
              const afterStatus = routingEventStatus(event);
              return (
                <View key={event.id}>
                  <View style={S.eventRow}>
                    <View style={S.timelineCol}>
                      <View style={S.timelineDot} />
                      {index < history.length - 1 && <View style={S.timelineLine} />}
                    </View>
                    <View style={S.eventContent}>
                      <View style={S.eventHeader}>
                        <Text style={S.eventFrom}>
                          {event.fromUser?.fullName || event.fromUser?.username || 'Unknown'}
                        </Text>
                        <Text style={S.eventArrow}> → </Text>
                        <Text style={S.eventTo}>
                          {event.toUser?.fullName || event.toUser?.username || 'Unknown'}
                        </Text>
                      </View>
                      {afterStatus ? (
                        <View style={S.eventStatusRow}>
                          <Text style={S.eventStatusLabel}>Status set to </Text>
                          <Text style={S.eventStatusValue}>{afterStatus}</Text>
                        </View>
                      ) : null}
                      {event.note ? (
                        <View style={S.noteBox}>
                          <Text style={S.noteText}>{event.note}</Text>
                        </View>
                      ) : null}
                      <Text style={S.eventDate}>{formatDateTime(event.timestamp)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ T, label, value, valueStyle, suffix, suffixStyle }) {
  const S = styles(T);
  return (
    <View style={S.metaRow}>
      <Text style={S.metaLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[S.metaValue, valueStyle]}>{value}</Text>
        {suffix ? <Text style={suffixStyle}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = (T) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bgPage },
  scroll: { padding: 20, paddingBottom: 40 },
  backBtn:  { marginBottom: 16 },
  backText: { color: T.textAccent, fontSize: 14 },
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
    flex: 1,
    lineHeight: 24,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  content: {
    fontSize: 13,
    color: T.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: T.divider,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaLabel: { fontSize: 13, color: T.textMuted },
  metaValue: { fontSize: 13, color: T.textSecondary, fontWeight: '500' },
  overdueText: { color: '#f87171', fontWeight: '600' },
  fileBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.bgDeep,
    borderRadius: 10,
    padding: 12,
  },
  fileBtnText:   { color: T.textSecondary, fontSize: 13, flex: 1 },
  fileDownload:  { color: T.textAccent, fontSize: 13, fontWeight: '600' },
  noFile:        { color: T.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 16,
  },
  emptyText: {
    color: T.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  eventRow: { flexDirection: 'row', marginBottom: 4 },
  timelineCol: { width: 24, alignItems: 'center', marginRight: 12 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: T.accent, marginTop: 4,
  },
  timelineLine: {
    width: 2, flex: 1,
    backgroundColor: T.border,
    marginTop: 4, marginBottom: -4,
    alignSelf: 'center',
  },
  eventContent: { flex: 1, paddingBottom: 20 },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  eventFrom:  { fontSize: 13, fontWeight: '600', color: T.textPrimary },
  eventArrow: { fontSize: 13, color: T.textMuted },
  eventTo:    { fontSize: 13, fontWeight: '600', color: T.textAccent },
  eventStatusRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  eventStatusLabel: { fontSize: 12, color: T.textMuted },
  eventStatusValue: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  noteBox: {
    backgroundColor: T.bgDeep,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: T.accent,
  },
  noteText:  { fontSize: 12, color: T.textSecondary, lineHeight: 18 },
  eventDate: { fontSize: 11, color: T.textMuted },
});