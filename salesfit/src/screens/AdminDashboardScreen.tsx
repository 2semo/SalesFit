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
import { useAdminGuard } from '../hooks/useAdminGuard';
import { getTitle } from '../utils/title';

type Tab = 'performance' | 'usage';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}분`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

function getActivityStatus(lastAt: string | null): { label: string; color: string } {
  if (!lastAt) return { label: '미사용', color: '#4B5563' };
  const diffDays = Math.floor((Date.now() - new Date(lastAt).getTime()) / 86400000);
  if (diffDays <= 7) return { label: '활성', color: '#22c55e' };
  if (diffDays <= 30) return { label: '보통', color: '#f97316' };
  return { label: '비활성', color: '#ef4444' };
}

export function AdminDashboardScreen(): React.JSX.Element {
  useAdminGuard();
  const [summaries, setSummaries] = useState<ConsultantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('performance');

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
  const activeCount = summaries.filter(
    (c) => c.lastConsultationAt && Date.now() - new Date(c.lastConsultationAt).getTime() <= 7 * 86400000
  ).length;

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
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>활성 (7일)</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'performance' && styles.tabBtnActive]}
            onPress={() => setTab('performance')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'performance' && styles.tabTextActive]}>
              성과 현황
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'usage' && styles.tabBtnActive]}
            onPress={() => setTab('usage')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'usage' && styles.tabTextActive]}>
              사용 현황
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#4A9EFF" style={{ marginTop: 32 }} />
        ) : summaries.length === 0 ? (
          <Text style={styles.emptyText}>등록된 상담원이 없습니다.</Text>
        ) : tab === 'performance' ? (
          <>
            <Text style={styles.sectionTitle}>상담원별 성과</Text>
            {summaries.map((consultant) => (
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
                  <Text style={styles.consultantName}>{consultant.name} {getTitle(consultant.name)}</Text>
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
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>이용자별 사용 현황</Text>
            {summaries
              .slice()
              .sort((a, b) => {
                const aLast = a.lastConsultationAt ? new Date(a.lastConsultationAt).getTime() : 0;
                const bLast = b.lastConsultationAt ? new Date(b.lastConsultationAt).getTime() : 0;
                return bLast - aLast;
              })
              .map((consultant) => {
                const status = getActivityStatus(consultant.lastConsultationAt);
                return (
                  <TouchableOpacity
                    key={consultant.userId}
                    style={styles.usageRow}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push({
                        pathname: '/admin-detail',
                        params: { userId: consultant.userId, name: consultant.name },
                      })
                    }
                  >
                    <View style={styles.usageTop}>
                      <Text style={styles.consultantName}>{consultant.name} {getTitle(consultant.name)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + '22', borderColor: status.color }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>

                    <View style={styles.usageStats}>
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatValue}>{consultant.totalConsultations}</Text>
                        <Text style={styles.usageStatLabel}>총 상담</Text>
                      </View>
                      <View style={styles.usageDivider} />
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatValue}>{consultant.weekConsultations}</Text>
                        <Text style={styles.usageStatLabel}>이번 주</Text>
                      </View>
                      <View style={styles.usageDivider} />
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatValue}>{consultant.monthConsultations}</Text>
                        <Text style={styles.usageStatLabel}>이번 달</Text>
                      </View>
                      <View style={styles.usageDivider} />
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatValue}>
                          {consultant.totalDurationMs > 0 ? formatDuration(consultant.totalDurationMs) : '-'}
                        </Text>
                        <Text style={styles.usageStatLabel}>총 시간</Text>
                      </View>
                    </View>

                    <View style={styles.usageBottom}>
                      {consultant.lastConsultationAt && (
                        <Text style={styles.lastSeen}>
                          마지막 이용: {formatDate(consultant.lastConsultationAt)}
                        </Text>
                      )}
                      <Text style={styles.arrowText}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </>
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
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#E5E7EB',
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#2C2C2C',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#E5E7EB',
    fontWeight: '700',
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
  usageRow: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  usageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  usageStat: {
    flex: 1,
    alignItems: 'center',
  },
  usageStatValue: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '700',
  },
  usageStatLabel: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  usageDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#3C3C3C',
  },
  usageBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastSeen: {
    color: '#4B5563',
    fontSize: 11,
  },
});
