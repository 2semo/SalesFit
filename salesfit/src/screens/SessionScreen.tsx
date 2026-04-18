import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AIChatPanel } from '../components/AIChatPanel';
import { CoachingCard } from '../components/CoachingCard';
import { useConsultation } from '../hooks/useConsultation';
import type { CoachingMessage } from '../types';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

export function SessionScreen(): React.JSX.Element {
  const { isRecording, isProcessing, consultation, elapsedMs, error, startConsultation, stopConsultation } =
    useConsultation();

  useKeepAwake();

  const scrollViewRef = useRef<ScrollView>(null);
  const recordingDotOpacity = useRef(new Animated.Value(1)).current;
  const animMap = useRef<Map<string, Animated.Value>>(new Map());
  const prevCoachingCountRef = useRef(0);
  const [chatOpen, setChatOpen] = React.useState(false);

  // Start recording on mount
  useEffect(() => {
    void startConsultation();
  }, [startConsultation]);

  // Handle permission error: alert + go back
  useEffect(() => {
    if (error) {
      Alert.alert('오류', error, [{ text: '확인', onPress: () => router.back() }]);
    }
  }, [error]);

  // Animate red dot while recording
  useEffect(() => {
    if (!isRecording) {
      recordingDotOpacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(recordingDotOpacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(recordingDotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isRecording, recordingDotOpacity]);

  // Auto-scroll transcript to bottom on new segments
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [consultation?.transcript]);

  // Animate new coaching tips sliding in from top
  useEffect(() => {
    const messages = consultation?.coachingMessages ?? [];
    const newMessages = messages.slice(prevCoachingCountRef.current);

    newMessages.forEach((msg: CoachingMessage) => {
      if (!animMap.current.has(msg.id)) {
        const translateY = new Animated.Value(-24);
        animMap.current.set(msg.id, translateY);
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start();
      }
    });

    prevCoachingCountRef.current = messages.length;
  }, [consultation?.coachingMessages]);

  const handleStop = useCallback(async () => {
    try {
      const completedConsultation = await stopConsultation();
      router.push({
        pathname: '/report',
        params: {
          consultationId: completedConsultation.id,
          startedAt: String(completedConsultation.startedAt),
          endedAt: String(completedConsultation.endedAt ?? Date.now()),
          transcriptText: completedConsultation.transcript.map((s) => s.text).join('\n'),
        },
      });
    } catch (e) {
      Alert.alert('오류', '상담 종료 중 오류가 발생했습니다.');
    }
  }, [stopConsultation]);

  const latestCoaching = (consultation?.coachingMessages ?? []).slice(-3);
  const transcript = consultation?.transcript ?? [];

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <Animated.View style={[styles.recordingDot, { opacity: recordingDotOpacity }]} />
        <Text style={styles.statusText}>{isRecording ? '녹음 중' : '준비 중'}</Text>
        <Text style={styles.timer}>{formatTime(elapsedMs)}</Text>
      </View>

      {/* Transcript area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.transcriptArea}
        contentContainerStyle={styles.transcriptContent}
      >
        {transcript.length === 0 && !isProcessing ? (
          <Text style={styles.placeholderText}>상담 내용이 여기에 표시됩니다...</Text>
        ) : null}
        {transcript.map((seg) => (
          <Text key={seg.id} style={styles.transcriptText}>
            {seg.text}
          </Text>
        ))}
        {isProcessing ? (
          <Text style={styles.processingText}>분석 중...</Text>
        ) : null}
      </ScrollView>

      {/* Coaching panel */}
      <View style={styles.coachingPanel}>
        <Text style={styles.coachingHeader}>💡 AI 코칭</Text>
        {latestCoaching.length === 0 ? (
          <Text style={styles.coachingEmptyText}>코칭 팁이 여기에 표시됩니다</Text>
        ) : null}
        {latestCoaching.map((msg) => {
          const translateY = animMap.current.get(msg.id) ?? new Animated.Value(0);
          return (
            <Animated.View key={msg.id} style={{ transform: [{ translateY }] }}>
              <CoachingCard message={msg} />
            </Animated.View>
          );
        })}
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.chatButton} onPress={() => setChatOpen(true)} activeOpacity={0.8}>
          <Text style={styles.chatButtonText}>💬 AI 대화</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stopButton} onPress={() => void handleStop()} activeOpacity={0.8}>
          <Text style={styles.stopButtonText}>상담 종료</Text>
        </TouchableOpacity>
      </View>

      <AIChatPanel
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        consultationContext={(consultation?.transcript ?? []).map((s) => s.text).join('\n')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#D1D5DB',
    fontSize: 14,
    flex: 1,
  },
  timer: {
    color: '#9CA3AF',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  transcriptArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  transcriptContent: {
    paddingVertical: 16,
    gap: 8,
  },
  placeholderText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
  },
  transcriptText: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
  },
  processingText: {
    color: '#6B7280',
    fontSize: 13,
    fontStyle: 'italic',
  },
  coachingPanel: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 120,
  },
  coachingHeader: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  coachingEmptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 10,
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  stopButton: {
    flex: 2,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
