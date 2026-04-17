// mockGenerateContent is declared here, but jest.mock() factories are hoisted above
// module-level code by Babel, so the variable is `undefined` when the factory runs.
// The lazy wrapper `(...args) => mockGenerateContent(...args)` defers the lookup
// to call-time (when mockGenerateContent is already jest.fn()), avoiding the issue.
const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      // Lazy wrapper: reads mockGenerateContent at call-time, not at factory-time.
      generateContent: (...args: unknown[]) => mockGenerateContent(...(args as [])),
    })),
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64audiodata=='),
}));

import { geminiService } from '../geminiService';

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transcribeAudio', () => {
    test('returns TranscriptSegment with transcribed text from API response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '안녕하세요, 오늘 어떤 제품을 찾으시나요?' },
      });

      const result = await geminiService.transcribeAudio('file://chunk.m4a', 0);

      expect(result.text).toBe('안녕하세요, 오늘 어떤 제품을 찾으시나요?');
      expect(result.chunkIndex).toBe(0);
      expect(typeof result.id).toBe('string');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    test('returns empty-text TranscriptSegment when API call fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      const result = await geminiService.transcribeAudio('file://chunk.m4a', 2);

      expect(result.text).toBe('');
      expect(result.chunkIndex).toBe(2);
    });
  });

  describe('getCoachingTips', () => {
    test('returns CoachingMessage array when API returns valid JSON', async () => {
      const mockTips = [
        {
          type: 'needs',
          title: '고객 니즈 파악',
          message: '고객의 필요를 더 구체적으로 물어보세요.',
          suggestion: '"어떤 용도로 사용하실 예정인가요?"',
        },
      ];
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockTips) },
      });

      const result = await geminiService.getCoachingTips('고객: 세탁기 찾아요');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('needs');
      expect(result[0].title).toBe('고객 니즈 파악');
    });

    test('returns empty array when API response is not valid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '이것은 유효하지 않은 텍스트 응답입니다.' },
      });

      const result = await geminiService.getCoachingTips('대화 내용');

      expect(result).toEqual([]);
    });

    test('returns empty array when API call fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await geminiService.getCoachingTips('대화 내용');

      expect(result).toEqual([]);
    });
  });

  describe('generateReport', () => {
    test('returns parsed ReviewReport when API responds with valid JSON', async () => {
      const mockReport = {
        customerNeedsScore: 80,
        customerNeedsAnalysis: '고객 니즈를 잘 파악했습니다.',
        recommendedScripts: ['추천 멘트 1'],
        productExplanationScore: 75,
        productExplanationFeedback: '제품 설명이 명확했습니다.',
        closingTimingScore: 70,
        closingTimingFeedback: '클로징 타이밍이 적절했습니다.',
        improvementPoints: ['개선점 1'],
        suggestions: ['제안 1'],
      };
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockReport) },
      });

      const result = await geminiService.generateReport('전체 대화', 120000, 'consultation-1');

      expect(result.consultationId).toBe('consultation-1');
      expect(result.customerNeedsScore).toBe(80);
      expect(result.totalDurationMs).toBe(120000);
    });

    test('returns default ReviewReport when API call fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await geminiService.generateReport('전체 대화', 60000, 'consultation-2');

      expect(result.consultationId).toBe('consultation-2');
      expect(result.customerNeedsScore).toBe(50);
      expect(result.customerNeedsAnalysis).toBe('분석 실패');
      expect(result.productExplanationScore).toBe(50);
      expect(result.closingTimingScore).toBe(50);
      expect(result.totalDurationMs).toBe(60000);
    });

    test('returns default ReviewReport when API response is not valid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '분석 중 오류가 발생했습니다.' },
      });

      const result = await geminiService.generateReport('전체 대화', 30000, 'consultation-3');

      expect(result.consultationId).toBe('consultation-3');
      expect(result.customerNeedsScore).toBe(50);
      expect(result.customerNeedsAnalysis).toBe('분석 실패');
    });
  });
});
