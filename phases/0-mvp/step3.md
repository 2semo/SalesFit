# Step 3: gemini-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/services/audioService.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`salesfit/src/services/geminiService.ts`를 생성하라. Google Gemini 1.5 Flash API를 통해 STT(음성→텍스트), 실시간 코칭, 복기 리포트를 처리하는 서비스다.

### GeminiService 클래스 인터페이스

```typescript
class GeminiService {
  // 오디오 파일 URI → 텍스트 변환
  // audioUri: expo-av가 생성한 m4a 파일 경로
  async transcribeAudio(audioUri: string, chunkIndex: number): Promise<TranscriptSegment>

  // 누적된 대화 텍스트 → 코칭 메시지 생성
  // transcript: 지금까지의 전체 대화 내용 (concatenated)
  // 반환: 이번 청크에서 발견된 새로운 코칭 포인트 (없으면 빈 배열)
  async getCoachingTips(transcript: string): Promise<CoachingMessage[]>

  // 전체 대화 → 복기 리포트 생성
  async generateReport(fullTranscript: string, durationMs: number, consultationId: string): Promise<ReviewReport>
}

export const geminiService = new GeminiService();
```

### 구현 요구사항

1. **API 초기화**:
   ```typescript
   import { GoogleGenerativeAI } from '@google/generative-ai';
   const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '');
   const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
   ```

2. **transcribeAudio**: 오디오 파일을 base64로 읽어 Gemini에 inline data로 전달.
   ```typescript
   // 파일 읽기: expo-file-system의 FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
   // mimeType: 'audio/m4a'
   // 프롬프트: "이 오디오를 한국어로 전사하라. 텍스트만 반환하라."
   ```

3. **getCoachingTips**: 대화 텍스트를 분석해 코칭 포인트를 추출.
   - 프롬프트에 반드시 포함할 것: "당신은 가전제품 영업 코치입니다. 상담원의 대화를 분석해 즉시 적용 가능한 코칭 팁을 JSON 배열로 반환하세요."
   - 반환 형식: `[{ "type": "needs"|"product"|"closing"|"improvement", "title": "...", "message": "...", "suggestion": "..." }]`
   - 코칭할 포인트가 없으면 `[]` 반환
   - JSON.parse 파싱 실패 시 빈 배열 반환 (앱 크래시 방지)

4. **generateReport**: PRD의 4개 항목을 구조화된 JSON으로 반환하도록 프롬프트 작성.
   - 반환 형식: ReviewReport 타입과 동일한 구조의 JSON
   - 점수(score)는 0~100 정수
   - 파싱 실패 시 기본값(모든 score 50, 텍스트 "분석 실패")을 가진 ReviewReport 반환

5. **에러 처리**: 모든 API 호출은 try/catch로 감싸고, 실패 시 로깅 후 기본값 반환. throw하지 않는다.

### 테스트 파일

`salesfit/src/services/__tests__/geminiService.test.ts` 작성:

- `@google/generative-ai`를 mock 처리: `jest.mock('@google/generative-ai')`
- `transcribeAudio`: API 응답 mock → TranscriptSegment 반환 확인
- `getCoachingTips`: 잘못된 JSON 응답 시 빈 배열 반환 확인
- `generateReport`: API 실패 시 기본값 ReviewReport 반환 확인

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
npx jest src/services/__tests__/geminiService.test.ts
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - API 키가 코드에 하드코딩되어 있지 않은지 확인
   - React import가 없는지 확인
   - 에러 시 throw 대신 기본값 반환하는지 확인
3. `phases/0-mvp/index.json`의 step 3 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "src/services/geminiService.ts 생성. GeminiService 클래스 (STT, 코칭 팁, 복기 리포트). JSON 파싱 안전 처리, 에러 시 기본값 반환. 유닛 테스트 3개 통과."`
   - 실패 → 에러/블록 처리

## 금지사항

- API 키를 코드에 직접 쓰지 마라. 이유: 보안 위협.
- API 호출 실패 시 throw하지 마라. 이유: 녹음 중 API 오류가 앱 전체를 중단시키면 안 된다.
- Gemini 2.0 이상 모델을 사용하지 마라. 이유: 무료 티어는 1.5 Flash까지만 안정적이다.
- 기존 테스트를 깨뜨리지 마라.
