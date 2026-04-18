import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { adminService } from '../services/adminService';
import { useAdminGuard } from '../hooks/useAdminGuard';
import type { StoredConsultation } from '../types';
import { getCoachingLevel, getTitle } from '../utils/title';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

function ScoreBar({ label, score }: { label: string; score: number }): React.JSX.Element {
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${score}%` as `${number}%`, backgroundColor: getScoreColor(score) }]} />
      </View>
      <Text style={[barStyles.score, { color: getScoreColor(score) }]}>{score}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    width: 70,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: '#2C2C2C',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  score: {
    fontSize: 12,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
});

export function ConsultantDetailScreen(): React.JSX.Element {
  useAdminGuard();
  const params = useLocalSearchParams<{ userId: string; name: string }>();
  const [consultations, setConsultations] = useState<StoredConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgScores, setAvgScores] = useState({ needs: 0, product: 0, closing: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminService.getConsultationsByUser(params.userId);
    setConsultations(data);

    const summaries = await adminService.getConsultantSummaries();
    const found = summaries.find((s) => s.userId === params.userId);
    if (found) {
      setAvgScores({
        needs: found.avgNeedsScore,
        product: found.avgProductScore,
        closing: found.avgClosingScore,
      });
    }

    setLoading(false);
  }, [params.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConsultationPress = async (item: StoredConsultation) => {
    if (!item.hasReport) return;
    const report = await adminService.getReportDetail(item.id);
    if (!report) return;
    router.push({
      pathname: '/report',
      params: {
        data: JSON.stringify({ id: item.id, startedAt: item.startedAt, endedAt: item.endedAt, status: 'completed', transcript: [], coachingMessages: [], report }),
        consultantName: params.name,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{params.name} {getTitle(params.name)}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {!loading && consultations.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>평균 점수</Text>
            <ScoreBar label="고객 니즈" score={avgScores.needs} />
            <ScoreBar label="제품 설명" score={avgScores.product} />
            <ScoreBar label="클로징" score={avgScores.closing} />
          </View>
        )}

        <Text style={styles.sectionTitle}>상담 이력</Text>

        {loading ? (
          <ActivityIndicator color="#4A9EFF" style={{ marginTop: 32 }} />
        ) : consultations.length === 0 ? (
          <Text style={styles.emptyText}>상담 이력이 없습니다.</Text>
        ) : (
          consultations.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.row, !item.hasReport && styles.rowDisabled]}
              activeOpacity={item.hasReport ? 0.75 : 1}
              onPress={() => void handleConsultationPress(item)}
            >
              <View style={styles.rowInfo}>
                <View style={styles.rowNameRow}>
                  <Text style={styles.rowName}>{params.name} {getTitle(params.name)}</Text>
                </View>
                <Text style={styles.rowDate}>{formatDate(item.startedAt)}</Text>
                <Text style={styles.rowDuration}>{formatDuration(item.durationMs)}</Text>
              </View>
              <View style={styles.rowRight}>
                {item.hasReport ? (
                  <>
                    {(() => {
                      const lvl = getCoachingLevel(item.overallScore);
                      return (
                        <View style={[styles.levelBadge, { backgroundColor: lvl.color + '22', borderColor: lvl.color }]}>
                          <Text style={[styles.levelText, { color: lvl.color }]}>{lvl.emoji} {lvl.label}</Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.arrowText}>›</Text>
                  </>
                ) : (
                  <Text style={styles.noReport}>리포트 없음</Text>
                )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  backText: {
    color: '#4A9EFF',
    fontSize: 15,
    width: 48,
  },
  headerTitle: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  chartCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowInfo: {
    flex: 1,
  },
  rowNameRow: {
    marginBottom: 2,
  },
  rowName: {
    color: '#4A9EFF',
    fontSize: 11,
    fontWeight: '600',
  },
  rowDate: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  rowDuration: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  arrowText: {
    color: '#4B5563',
    fontSize: 20,
  },
  noReport: {
    color: '#4B5563',
    fontSize: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
  },
});
