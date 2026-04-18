import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ConsultationHistoryItem } from '../components/ConsultationHistoryItem';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import type { StoredConsultation } from '../types';

export function HomeScreen(): React.JSX.Element {
  const [consultations, setConsultations] = useState<StoredConsultation[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    authService.getCurrentUser().then((user) => {
      if (user) setUserName(user.name);
    }).catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        const data = await storageService.getConsultations();
        if (active) {
          setConsultations(data);
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, []),
  );

  const handleStartSession = useCallback(() => {
    router.push('/session');
  }, []);

  const handlePressItem = useCallback((id: string) => {
    router.push({ pathname: '/report', params: { consultationId: id } });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.titleRow}>
          <View style={styles.titleSection}>
            <Text style={styles.appTitle}>SalesFit</Text>
            {userName ? (
              <Text style={styles.appSubtitle}>{userName} 매니저님, 안녕하세요 👋</Text>
            ) : (
              <Text style={styles.appSubtitle}>가전제품 상담 AI 코치</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/help')} activeOpacity={0.7} style={styles.helpBtn}>
            <Text style={styles.helpBtnText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* CTA button */}
        <TouchableOpacity style={styles.ctaButton} onPress={handleStartSession} activeOpacity={0.8}>
          <Text style={styles.ctaText}>상담 시작하기  🎙</Text>
        </TouchableOpacity>

        {/* History section */}
        <Text style={styles.sectionHeader}>최근 상담 이력</Text>

        {consultations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 상담 이력이 없습니다</Text>
          </View>
        ) : (
          <FlatList
            data={consultations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConsultationHistoryItem item={item} onPress={() => handlePressItem(item.id)} />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  titleSection: {
    flex: 1,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  appSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  ctaButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  helpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  helpBtnText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 32,
  },
  separator: {
    height: 8,
  },
});
