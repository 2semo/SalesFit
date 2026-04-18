import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getCoachingLevel } from '../utils/title';

interface ReportSectionProps {
  icon: string;
  title: string;
  score?: number;
  children: React.ReactNode;
}

export function ReportSection({ icon, title, score, children }: ReportSectionProps): React.JSX.Element {
  const level = score !== undefined ? getCoachingLevel(score) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        {level !== null && (
          <View style={[styles.badge, { backgroundColor: level.color + '22', borderColor: level.color }]}>
            <Text style={[styles.badgeText, { color: level.color }]}>
              {level.emoji} {level.label}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    gap: 4,
  },
});
