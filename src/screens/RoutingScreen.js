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
  Modal,
  Animated,
} from 'react-native';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { useIsFocused } from '@react-navigation/native';

export default function RoutingScreen() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const T = useThemeStore((state) => state);
  const isFocused = useIsFocused();
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;
 

  const fetchPending = async () => {
    try {
      const [pendingRes, docsRes, usersRes] = await Promise.all([
        client.get('/routing/pending'),
        client.get('/Documents'),
        client.get('/Users'),
      ]);

      const docs  = docsRes.data;
      const users = usersRes.data;

      const enriched = pendingRes.data.map((item) => {
        const matchedDoc  = docs.find((d) => d.id === item.documentId);
        const matchedUser = users.find((u) => u.id === item.fromUserId);
        return {
          ...item,
          document: matchedDoc  || item.document,
          fromUser: matchedUser || item.fromUser,
        };
      });

      setPending(enriched);
    } catch (err) {
      console.log('Fetch pending error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPending();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  const handleApprove = async (documentId, eventId) => {
    Alert.alert(
      'Approve Document',
      'Are you sure you want to approve this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(true);
            try {
              await client.patch(`/Documents/${documentId}/routing/${eventId}/approve`);
              Alert.alert('Success', 'Document approved successfully.');
              fetchPending();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to approve document.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectPress = (documentId, eventId) => {
    setSelectedEvent({ documentId, eventId });
    setRejectReason('');
    setRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      await client.patch(
        `/Documents/${selectedEvent.documentId}/routing/${selectedEvent.eventId}/reject`,
        { reason: rejectReason }
      );
      setRejectModal(false);
      Alert.alert('Success', 'Document rejected.');
      fetchPending();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to reject document.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    const S = styles(T);
    return (
      <View style={S.centered}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  const S = styles(T);
  return (
    <Animated.View key={`${isFocused}-${T.isDark}`} style={[S.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.title}>Pending Approvals</Text>
        <View style={S.countBadge}>
          <Text style={S.countText}>{pending.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={S.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {pending.length === 0 ? (
          <View style={S.emptyCard}>
            <Text style={S.emptyIcon}>✓</Text>
            <Text style={S.emptyTitle}>All caught up!</Text>
            <Text style={S.emptyText}>No documents pending your approval.</Text>
          </View>
        ) : (
          pending.map((item) => (
            <View key={item.id} style={S.card}>
              <Text style={S.cardTitle}>
                {item.document?.title || 'Untitled Document'}
              </Text>

              <View style={S.cardMeta}>
                <Text style={S.metaLabel}>From:</Text>
                <Text style={S.metaValue}>
                  {item.fromUser?.fullName || item.fromUser?.username || 'System'}
                </Text>
              </View>

              {item.note ? (
                <View style={S.noteBox}>
                  <Text style={S.noteText}>{item.note}</Text>
                </View>
              ) : null}

              <Text style={S.dateText}>
                {new Date(item.timestamp).toLocaleDateString()} at{' '}
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>

              {/* Action Buttons */}
              <View style={S.actions}>
                <TouchableOpacity
                  style={S.approveBtn}
                  onPress={() => handleApprove(item.documentId, item.id)}
                  disabled={actionLoading}
                >
                  <Text style={S.approveBtnText}>✓ Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={S.rejectBtn}
                  onPress={() => handleRejectPress(item.documentId, item.id)}
                  disabled={actionLoading}
                >
                  <Text style={S.rejectBtnText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModal(false)}
      >
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Reject Document</Text>
            <Text style={S.modalSubtitle}>Please provide a reason for rejection.</Text>

            <TextInput
              style={S.modalInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#8f98a0"
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={S.modalActions}>
              <TouchableOpacity
                style={S.modalCancel}
                onPress={() => setRejectModal(false)}
              >
                <Text style={S.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={S.modalReject}
                onPress={handleRejectConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={S.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = (T) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
    paddingTop: 56,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: T.textPrimary,
  },
  countBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    backgroundColor: T.bgCard,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: T.textMuted,
  },
  metaValue: {
    fontSize: 13,
    color: T.textSecondary,
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: T.bgInput,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#4a7fa5',
  },
  noteText: {
    fontSize: 12,
    color: T.textMuted,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 11,
    color: T.textMuted,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  approveBtnText: {
    color: '#4ade80',
    fontWeight: '700',
    fontSize: 14,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  rejectBtnText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: T.bgCard,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: T.bgCard,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: T.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: T.textMuted,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: T.bgInput,
    borderWidth: 1,
    borderColor: T.borderInput,
    borderRadius: 10,
    padding: 12,
    color: T.textPrimary,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: T.bgInput,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  modalCancelText: {
    color: T.textMuted,
    fontWeight: '600',
  },
  modalReject: {
    flex: 1,
    backgroundColor: '#f87171',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  modalRejectText: {
    color: '#fff',
    fontWeight: '700',
  },
});