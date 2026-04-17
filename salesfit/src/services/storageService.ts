import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Consultation, StoredConsultation } from '../types';

const CONSULTATIONS_KEY = 'salesfit_consultations';
const CONSULTATION_PREFIX = 'salesfit_consultation_';

class StorageService {
  async saveConsultation(consultation: Consultation): Promise<void> {
    try {
      await AsyncStorage.setItem(CONSULTATION_PREFIX + consultation.id, JSON.stringify(consultation));

      const report = consultation.report;
      const endedAt = consultation.endedAt ?? Date.now();
      const overallScore = report
        ? Math.round(
            (report.customerNeedsScore + report.productExplanationScore + report.closingTimingScore) / 3,
          )
        : 0;

      const summary: StoredConsultation = {
        id: consultation.id,
        startedAt: consultation.startedAt,
        endedAt,
        durationMs: endedAt - consultation.startedAt,
        overallScore,
        reportSummary: report?.customerNeedsAnalysis ?? '',
        hasReport: report !== undefined,
      };

      const existing = await this.getConsultations();
      const filtered = existing.filter((c) => c.id !== consultation.id);
      await AsyncStorage.setItem(CONSULTATIONS_KEY, JSON.stringify([summary, ...filtered]));
    } catch (error) {
      console.error('StorageService: saveConsultation error', error);
    }
  }

  async getConsultations(): Promise<StoredConsultation[]> {
    try {
      const data = await AsyncStorage.getItem(CONSULTATIONS_KEY);
      if (!data) return [];
      return (JSON.parse(data) as StoredConsultation[]).sort((a, b) => b.startedAt - a.startedAt);
    } catch (error) {
      console.error('StorageService: getConsultations error', error);
      return [];
    }
  }

  async getConsultationById(id: string): Promise<Consultation | null> {
    try {
      const data = await AsyncStorage.getItem(CONSULTATION_PREFIX + id);
      if (!data) return null;
      return JSON.parse(data) as Consultation;
    } catch (error) {
      console.error('StorageService: getConsultationById error', error);
      return null;
    }
  }

  async deleteConsultation(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONSULTATION_PREFIX + id);
      const existing = await this.getConsultations();
      const updated = existing.filter((c) => c.id !== id);
      await AsyncStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('StorageService: deleteConsultation error', error);
    }
  }
}

export const storageService = new StorageService();
