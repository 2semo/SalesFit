import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ReportSectionProps {
  icon: string;
  title: string;
  score?: number;
  children: React.ReactNode;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

export function ReportSection({ icon, title, score, children }: ReportSectionProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        {score !== undefined ? (
          <Text style={[styles.score, { color: getScoreColor(score) }]}>{score}점</Text>
        ) : null}
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
  score: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    gap: 4,
  },
});
