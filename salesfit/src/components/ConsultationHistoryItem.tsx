import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { StoredConsultation } from '../types';

interface ConsultationHistoryItemProps {
  item: StoredConsultation;
  onPress: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day}  ${h}:${min}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  if (h > 0) {
    return `${h}시간 ${min}분 ${sec}초`;
  }
  return `${min}분 ${sec}초`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

export function ConsultationHistoryItem({ item, onPress }: ConsultationHistoryItemProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
        <Text style={styles.duration}>상담 시간: {formatDuration(item.durationMs)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.score, { color: getScoreColor(item.overallScore) }]}>
          {item.overallScore}점
        </Text>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  date: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  duration: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
  },
  arrow: {
    color: '#6B7280',
    fontSize: 16,
  },
});
