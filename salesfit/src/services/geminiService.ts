import { GoogleGenerativeAI } from '@google/generative-ai';
import { readAsStringAsync } from 'expo-file-system/legacy';

import type { CoachingMessage, ReviewReport, TranscriptSegment } from '../types';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

class GeminiService {
  async transcribeAudio(audioUri: string, chunkIndex: number): Promise<TranscriptSegment> {
    try {
      const base64Audio = await readAsStringAsync(audioUri, { encoding: 'base64' });

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Audio,
            mimeType: 'audio/m4a',
          },
        },
        '이 오디오를 한국어로 전사하라. 텍스트만 반환하라.',
      ]);

      const text = result.response.text().trim();

      return {
        id: `segment-${chunkIndex}-${Date.now()}`,
        text,
        timestamp: Date.now(),
        chunkIndex,
      };
    } catch (error) {
      console.error('GeminiService: transcribeAudio error', error);
      return {
        id: `segment-${chunkIndex}-${Date.now()}`,
        text: '',
        timestamp: Date.now(),
        chunkIndex,
      };
    }
  }

  async getCoachingTips(transcript: string): Promise<CoachingMessage[]> {
    try {
      const prompt = `당신은 가전제품 영업 코치입니다. 상담원의 대화를 분석해 즉시 적용 가능한 코칭 팁을 JSON 배열로 반환하세요.

대화 내용:
${transcript}

반환 형식 (JSON 배열만 반환, 다른 텍스트 없이):
[{ "type": "needs"|"product"|"closing"|"improvement", "title": "...", "message": "...", "suggestion": "..." }]

코칭할 포인트가 없으면 [] 반환.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        type: string;
        title: string;
        message: string;
        suggestion: string;
      }>;

      return parsed.map((item) => ({
        id: `coaching-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: item.type as CoachingMessage['type'],
        title: item.title,
        message: item.message,
        suggestion: item.suggestion,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('GeminiService: getCoachingTips error', error);
      return [];
    }
  }

  async generateReport(
    fullTranscript: string,
    durationMs: number,
    consultationId: string,
  ): Promise<ReviewReport> {
    const defaultReport: ReviewReport = {
      consultationId,
      customerNeedsScore: 50,
      customerNeedsAnalysis: '분석 실패',
      recommendedScripts: [],
      productExplanationScore: 50,
      productExplanationFeedback: '분석 실패',
      closingTimingScore: 50,
      closingTimingFeedback: '분석 실패',
      improvementPoints: [],
      suggestions: [],
      generatedAt: Date.now(),
      totalDurationMs: durationMs,
    };

    try {
      const prompt = `당신은 가전제품 영업 코치입니다. 아래 상담 대화를 분석해 복기 리포트를 JSON으로 반환하세요.

상담 대화:
${fullTranscript}

반환 형식 (JSON만 반환, 다른 텍스트 없이):
{
  "customerNeedsScore": 0~100 정수,
  "customerNeedsAnalysis": "고객 니즈 파악 분석",
  "recommendedScripts": ["추천 멘트 1", "추천 멘트 2"],
  "productExplanationScore": 0~100 정수,
  "productExplanationFeedback": "제품 설명 피드백",
  "closingTimingScore": 0~100 정수,
  "closingTimingFeedback": "클로징 타이밍 피드백",
  "improvementPoints": ["아쉬운 점 1", "아쉬운 점 2"],
  "suggestions": ["개선 제안 1", "개선 제안 2"]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return defaultReport;

      const parsed = JSON.parse(jsonMatch[0]) as Partial<ReviewReport>;

      return {
        consultationId,
        customerNeedsScore: parsed.customerNeedsScore ?? 50,
        customerNeedsAnalysis: parsed.customerNeedsAnalysis ?? '분석 실패',
        recommendedScripts: parsed.recommendedScripts ?? [],
        productExplanationScore: parsed.productExplanationScore ?? 50,
        productExplanationFeedback: parsed.productExplanationFeedback ?? '분석 실패',
        closingTimingScore: parsed.closingTimingScore ?? 50,
        closingTimingFeedback: parsed.closingTimingFeedback ?? '분석 실패',
        improvementPoints: parsed.improvementPoints ?? [],
        suggestions: parsed.suggestions ?? [],
        generatedAt: Date.now(),
        totalDurationMs: durationMs,
      };
    } catch (error) {
      console.error('GeminiService: generateReport error', error);
      return defaultReport;
    }
  }
}

export const geminiService = new GeminiService();
