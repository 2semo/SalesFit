const mockAsyncStorage: Record<string, string> = {};

const mockSetItem = jest.fn((key: string, value: string) => {
  mockAsyncStorage[key] = value;
  return Promise.resolve();
});
const mockGetItem = jest.fn((key: string) => {
  return Promise.resolve(mockAsyncStorage[key] ?? null);
});
const mockRemoveItem = jest.fn((key: string) => {
  delete mockAsyncStorage[key];
  return Promise.resolve();
});

// Lazy wrappers: factories are hoisted above variable declarations,
// so we defer the actual fn lookup to call-time (same pattern as geminiService.test.ts).
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: (...args: unknown[]) => mockSetItem(...(args as [string, string])),
    getItem: (...args: unknown[]) => mockGetItem(...(args as [string])),
    removeItem: (...args: unknown[]) => mockRemoveItem(...(args as [string])),
  },
}));

import { storageService } from '../storageService';
import type { Consultation, ReviewReport } from '../../types';

function makeConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'c-001',
    startedAt: 1000000,
    endedAt: 1060000,
    status: 'completed',
    transcript: [],
    coachingMessages: [],
    ...overrides,
  };
}

function makeReport(overrides: Partial<ReviewReport> = {}): ReviewReport {
  return {
    consultationId: 'c-001',
    customerNeedsScore: 80,
    customerNeedsAnalysis: '고객 니즈를 잘 파악했습니다.',
    recommendedScripts: ['추천 멘트'],
    productExplanationScore: 70,
    productExplanationFeedback: '제품 설명이 명확했습니다.',
    closingTimingScore: 75,
    closingTimingFeedback: '클로징 타이밍이 좋았습니다.',
    improvementPoints: ['개선점'],
    suggestions: ['제안'],
    generatedAt: Date.now(),
    totalDurationMs: 60000,
    ...overrides,
  };
}

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory storage between tests
    Object.keys(mockAsyncStorage).forEach((k) => {
      delete mockAsyncStorage[k];
    });
  });

  describe('saveConsultation', () => {
    test('saves full consultation to AsyncStorage', async () => {
      const consultation = makeConsultation();

      await storageService.saveConsultation(consultation);

      expect(mockSetItem).toHaveBeenCalledWith(
        'salesfit_consultation_c-001',
        JSON.stringify(consultation),
      );
    });

    test('adds StoredConsultation summary to the list', async () => {
      const report = makeReport();
      const consultation = makeConsultation({ report });

      await storageService.saveConsultation(consultation);

      const listCall = mockSetItem.mock.calls.find(([key]) => key === 'salesfit_consultations');
      expect(listCall).toBeDefined();
      const list = JSON.parse(listCall![1] as string) as unknown[];
      expect(list).toHaveLength(1);
    });

    test('overallScore is average of 3 scores when report exists', async () => {
      const report = makeReport({
        customerNeedsScore: 90,
        productExplanationScore: 60,
        closingTimingScore: 75,
      });
      const consultation = makeConsultation({ report });

      await storageService.saveConsultation(consultation);

      const listCall = mockSetItem.mock.calls.find(([key]) => key === 'salesfit_consultations');
      const list = JSON.parse(listCall![1] as string) as Array<{ overallScore: number }>;
      expect(list[0].overallScore).toBe(Math.round((90 + 60 + 75) / 3));
    });

    test('does not throw when AsyncStorage fails', async () => {
      mockSetItem.mockRejectedValueOnce(new Error('Storage full'));

      await expect(storageService.saveConsultation(makeConsultation())).resolves.not.toThrow();
    });
  });

  describe('getConsultations', () => {
    test('returns empty array when nothing is stored', async () => {
      const result = await storageService.getConsultations();
      expect(result).toEqual([]);
    });

    test('returns stored consultations sorted by startedAt descending', async () => {
      const c1 = makeConsultation({ id: 'c-001', startedAt: 1000 });
      const c2 = makeConsultation({ id: 'c-002', startedAt: 3000 });
      await storageService.saveConsultation(c1);
      await storageService.saveConsultation(c2);

      const result = await storageService.getConsultations();

      expect(result[0].id).toBe('c-002');
      expect(result[1].id).toBe('c-001');
    });

    test('returns empty array when AsyncStorage fails', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('IO Error'));

      const result = await storageService.getConsultations();
      expect(result).toEqual([]);
    });
  });

  describe('getConsultationById', () => {
    test('returns Consultation when found', async () => {
      const consultation = makeConsultation();
      await storageService.saveConsultation(consultation);

      const result = await storageService.getConsultationById('c-001');
      expect(result).toEqual(consultation);
    });

    test('returns null when not found', async () => {
      const result = await storageService.getConsultationById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteConsultation', () => {
    test('removes consultation from storage and list', async () => {
      await storageService.saveConsultation(makeConsultation({ id: 'c-001' }));
      await storageService.saveConsultation(makeConsultation({ id: 'c-002' }));

      await storageService.deleteConsultation('c-001');

      const result = await storageService.getConsultations();
      expect(result.find((c) => c.id === 'c-001')).toBeUndefined();
      expect(result.find((c) => c.id === 'c-002')).toBeDefined();
    });
  });
});
