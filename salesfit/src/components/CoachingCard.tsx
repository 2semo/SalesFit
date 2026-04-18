import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CoachingMessage, CoachingType } from '../types';

interface CoachingCardProps {
  message: CoachingMessage;
}

const TYPE_CONFIG: Record<
  CoachingType,
  { icon: string; color: string; label: string }
> = {
  needs: { icon: '🎯', color: '#4A9EFF', label: '니즈 파악' },
  product: { icon: '📦', color: '#22c55e', label: '제품 설명' },
  closing: { icon: '🤝', color: '#f97316', label: '클로징' },
  improvement: { icon: '💡', color: '#eab308', label: '개선' },
  recommend: { icon: '⭐', color: '#a855f7', label: '모델 추천' },
};

export function CoachingCard({ message }: CoachingCardProps): React.JSX.Element {
  const config = TYPE_CONFIG[message.type];

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={[styles.title, { color: config.color }]}>{message.title}</Text>
      </View>
      <Text style={styles.message}>{message.message}</Text>
      {message.suggestion ? (
        <Text style={styles.suggestion}>"{message.suggestion}"</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
