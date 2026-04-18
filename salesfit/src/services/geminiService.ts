import { GoogleGenerativeAI } from '@google/generative-ai';

import { PRODUCT_GUIDE } from '../assets/guides/productGuide';
import type { CoachingMessage, ReviewReport, TranscriptSegment } from '../types';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

class GeminiService {
  async transcribeAudio(chunkBase64: string, chunkIndex: number): Promise<TranscriptSegment> {
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            data: chunkBase64,
            mimeType: 'audio/webm',
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
      const prompt = `당신은 롯데하이마트 가전제품 영업 코치입니다. 아래 제품 가이드를 참고해 상담원의 대화를 분석하고, 즉시 적용 가능한 코칭 팁을 JSON 배열로 반환하세요.

[이번 주 제품 가이드]
${PRODUCT_GUIDE}

[상담 대화]
${transcript}

반환 형식 (JSON 배열만 반환, 다른 텍스트 없이):
[{ "type": "needs"|"product"|"closing"|"improvement"|"recommend", "title": "...", "message": "...", "suggestion": "..." }]

- type 기준:
  - needs: 고객 니즈 파악 코칭
  - product: 제품 설명 방법 코칭
  - closing: 클로징 기회 포착
  - improvement: 개선 필요 사항
  - recommend: 상담 맥락에 딱 맞는 중점모델 추천 (고객이 특정 제품 카테고리에 관심을 보일 때만 사용)
- recommend 타입은 반드시 가이드의 실제 모델명, 가격, 핵심 혜택을 title에 포함하고 suggestion에 구체적 추천 멘트 작성
- 코칭할 포인트가 없으면 [] 반환.`;

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

  async chat(userMessage: string, consultationContext: string): Promise<string> {
    try {
      const systemPrompt = `당신은 롯데하이마트 가전제품 영업 전문 AI 코치입니다. 아래 제품 가이드와 상담 내용을 바탕으로 매니저와 대화하며 실질적인 조언을 드립니다. 반말하지 말고 존댓말을 사용하세요. 답변은 간결하고 실용적으로 작성하세요.

[이번 주 제품 가이드]
${PRODUCT_GUIDE}

[현재 상담 내용]
${consultationContext || '(상담 내용 없음)'}`;

      const result = await model.generateContent(`${systemPrompt}\n\n[매니저 질문]\n${userMessage}`);
      return result.response.text().trim();
    } catch (error) {
      console.error('GeminiService: chat error', error);
      return '죄송합니다, 잠시 후 다시 시도해 주세요.';
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
      const prompt = `당신은 롯데하이마트 가전제품 영업 코치입니다. 아래 제품 가이드와 상담 대화를 분석해 복기 리포트를 JSON으로 반환하세요.

[이번 주 제품 가이드]
${PRODUCT_GUIDE}

[상담 대화]
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
