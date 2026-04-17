import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { adminService, type ConsultantSummary } from '../services/adminService';
import { authService } from '../services/authService';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

export function AdminDashboardScreen(): React.JSX.Element {
  const [summaries, setSummaries] = useState<ConsultantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminService.getConsultantSummaries();
    setSummaries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLogout = async () => {
    await authService.signOut();
    router.replace('/login');
  };

  const totalConsultations = summaries.reduce((s, c) => s + c.totalConsultations, 0);
  const avgScore =
    summaries.length > 0
      ? Math.round(summaries.reduce((s, c) => s + c.avgScore, 0) / summaries.length)
      : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>관리자 대시보드</Text>
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>전체 현황</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalConsultations}</Text>
            <Text style={styles.summaryLabel}>총 상담</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: getScoreColor(avgScore) }]}>
              {avgScore}점
            </Text>
            <Text style={styles.summaryLabel}>평균 점수</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summaries.length}</Text>
            <Text style={styles.summaryLabel}>상담원</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>상담원별 현황</Text>

        {loading ? (
          <ActivityIndicator color="#4A9EFF" style={{ marginTop: 32 }} />
        ) : summaries.length === 0 ? (
          <Text style={styles.emptyText}>등록된 상담원이 없습니다.</Text>
        ) : (
          summaries.map((consultant) => (
            <TouchableOpacity
              key={consultant.userId}
              style={styles.consultantRow}
              activeOpacity={0.75}
              onPress={() =>
                router.push({
                  pathname: '/admin-detail',
                  params: {
                    userId: consultant.userId,
                    name: consultant.name,
                  },
                })
              }
            >
              <View style={styles.consultantInfo}>
                <Text style={styles.consultantName}>{consultant.name}</Text>
                {consultant.lastConsultationAt && (
                  <Text style={styles.consultantMeta}>
                    최근 {formatDate(consultant.lastConsultationAt)}
                  </Text>
                )}
              </View>
              <View style={styles.consultantStats}>
                <Text style={styles.statText}>{consultant.totalConsultations}건</Text>
                <Text style={[styles.statScore, { color: getScoreColor(consultant.avgScore) }]}>
                  {consultant.avgScore}점
                </Text>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  headerTitle: {
    color: '#E5E7EB',
    fontSize: 17,
    fontWeight: '700',
  },
  logoutText: {
    color: '#4A9EFF',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#E5E7EB',
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  consultantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  consultantInfo: {
    flex: 1,
  },
  consultantName: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  consultantMeta: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  consultantStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  statScore: {
    fontSize: 15,
    fontWeight: '700',
  },
  arrowText: {
    color: '#4B5563',
    fontSize: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
  },
});
