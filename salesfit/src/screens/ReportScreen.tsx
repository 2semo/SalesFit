import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AIChatPanel } from '../components/AIChatPanel';
import { ReportSection } from '../components/ReportSection';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import type { Consultation, ReviewReport } from '../types';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  return [String(h).padStart(2, '0'), String(min).padStart(2, '0'), String(sec).padStart(2, '0')].join(
    ':',
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

export function ReportScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ data: string }>();
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    async function generate() {
      try {
        const parsed = JSON.parse(params.data) as Consultation;
        setConsultation(parsed);

        const fullTranscript = parsed.transcript.map((s) => s.text).join('\n');
        const durationMs = (parsed.endedAt ?? Date.now()) - parsed.startedAt;

        const generated = await geminiService.generateReport(fullTranscript, durationMs, parsed.id);
        setReport(generated);

        const consultationWithReport: Consultation = {
          ...parsed,
          report: generated,
        };
        await storageService.saveConsultation(consultationWithReport);
      } catch (e) {
        setError('리포트 생성에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    }

    void generate();
  }, [params.data]);

  const handleRetry = () => {
    setError(null);
    setReport(null);
    setLoading(true);
    // Re-trigger by re-running the effect via a key or just inline
    async function retry() {
      try {
        if (!consultation) return;
        const fullTranscript = consultation.transcript.map((s) => s.text).join('\n');
        const durationMs = (consultation.endedAt ?? Date.now()) - consultation.startedAt;
        const generated = await geminiService.generateReport(
          fullTranscript,
          durationMs,
          consultation.id,
        );
        setReport(generated);
        await storageService.saveConsultation({ ...consultation, report: generated });
      } catch {
        setError('리포트 생성에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    }
    void retry();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A9EFF" />
        <Text style={styles.loadingText}>리포트 생성 중...</Text>
      </View>
    );
  }

  if (error || !report || !consultation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? '리포트를 불러올 수 없습니다.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const overallScore = Math.round(
    (report.customerNeedsScore + report.productExplanationScore + report.closingTimingScore) / 3,
  );
  const durationMs = (consultation.endedAt ?? Date.now()) - consultation.startedAt;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상담 리포트</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TouchableOpacity style={styles.chatFab} onPress={() => setChatOpen(true)} activeOpacity={0.8}>
        <Text style={styles.chatFabText}>💬</Text>
      </TouchableOpacity>

      <AIChatPanel
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        consultationContext={
          report
            ? `[리포트 요약]\n고객니즈: ${report.customerNeedsScore}점 - ${report.customerNeedsAnalysis}\n제품설명: ${report.productExplanationScore}점 - ${report.productExplanationFeedback}\n클로징: ${report.closingTimingScore}점 - ${report.closingTimingFeedback}\n개선점: ${report.improvementPoints.join(', ')}`
            : ''
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Meta info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDate(consultation.startedAt)}</Text>
          <Text style={styles.metaSep}>|</Text>
          <Text style={styles.metaText}>{formatDuration(durationMs)}</Text>
        </View>

        {/* Overall score */}
        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>종합 점수</Text>
          <Text style={[styles.overallScore, { color: getScoreColor(overallScore) }]}>
            {overallScore}점
          </Text>
        </View>

        {/* Section 1: Customer Needs */}
        <ReportSection icon="🎯" title="고객 니즈 파악" score={report.customerNeedsScore}>
          <Text style={styles.bodyText}>{report.customerNeedsAnalysis}</Text>
          {report.recommendedScripts.length > 0 && (
            <>
              <Text style={styles.subHeading}>추천 멘트:</Text>
              {report.recommendedScripts.map((script, i) => (
                <Text key={i} style={styles.bulletItem}>
                  • {script}
                </Text>
              ))}
            </>
          )}
        </ReportSection>

        {/* Section 2: Product Explanation */}
        <ReportSection icon="📦" title="제품 설명 명확도" score={report.productExplanationScore}>
          <Text style={styles.bodyText}>{report.productExplanationFeedback}</Text>
        </ReportSection>

        {/* Section 3: Closing Timing */}
        <ReportSection icon="🤝" title="클로징 타이밍" score={report.closingTimingScore}>
          <Text style={styles.bodyText}>{report.closingTimingFeedback}</Text>
        </ReportSection>

        {/* Section 4: Improvement */}
        <ReportSection icon="💡" title="이렇게 해보세요">
          {report.improvementPoints.length > 0 && (
            <>
              <Text style={styles.subHeading}>아쉬운 점:</Text>
              {report.improvementPoints.map((point, i) => (
                <Text key={i} style={styles.bulletItem}>
                  • {point}
                </Text>
              ))}
            </>
          )}
          {report.suggestions.length > 0 && (
            <>
              <Text style={styles.subHeading}>개선 제안:</Text>
              {report.suggestions.map((suggestion, i) => (
                <Text key={i} style={styles.bulletItem}>
                  • {suggestion}
                </Text>
              ))}
            </>
          )}
        </ReportSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  backArrow: {
    color: '#4A9EFF',
    fontSize: 15,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  metaSep: {
    color: '#4B5563',
    fontSize: 13,
  },
  overallCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overallLabel: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  overallScore: {
    fontSize: 28,
    fontWeight: '700',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  chatFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  chatFabText: {
    fontSize: 22,
  },
  bodyText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 20,
  },
  subHeading: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 2,
  },
  bulletItem: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 4,
  },
});
