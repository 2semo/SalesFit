# Step 1: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/PRD.md`
- `/CLAUDE.md`
- `salesfit/src/` (디렉토리 구조 확인)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`salesfit/src/types/index.ts` 파일을 생성하라. 이 파일은 앱 전체에서 공유하는 TypeScript 타입을 정의한다.

### 정의할 타입

**TranscriptSegment** — 녹음 청크 1개의 변환 결과
```typescript
interface TranscriptSegment {
  id: string;           // 고유 ID (timestamp 기반)
  text: string;         // 변환된 텍스트
  timestamp: number;    // 녹음 시작 후 경과 시간 (ms)
  chunkIndex: number;   // 몇 번째 청크인지 (0부터)
}
```

**CoachingType** — 코칭 메시지의 종류
```typescript
type CoachingType = 'needs' | 'product' | 'closing' | 'improvement';
```

**CoachingMessage** — 실시간 코칭 팁 1개
```typescript
interface CoachingMessage {
  id: string;
  type: CoachingType;
  title: string;        // 짧은 제목 (예: "고객 니즈 파악 기회")
  message: string;      // 구체적인 코칭 내용
  suggestion: string;   // 추천 멘트 또는 행동 제안
  timestamp: number;    // 생성 시각 (Date.now())
}
```

**ReviewReport** — 상담 종료 후 복기 리포트 (PRD의 4개 항목)
```typescript
interface ReviewReport {
  consultationId: string;
  // 고객 니즈 파악률 + 추천 멘트
  customerNeedsScore: number;       // 0~100
  customerNeedsAnalysis: string;    // 니즈 파악 분석 텍스트
  recommendedScripts: string[];     // 추천 멘트 목록 (3~5개)
  // 제품 설명 명확도
  productExplanationScore: number;  // 0~100
  productExplanationFeedback: string;
  // 클로징 타이밍
  closingTimingFeedback: string;
  closingTimingScore: number;       // 0~100
  // 아쉬운 점 + 개선 제안
  improvementPoints: string[];      // 아쉬운 점 목록
  suggestions: string[];            // 이렇게 하면 좋을 것 목록
  // 메타
  generatedAt: number;              // Date.now()
  totalDurationMs: number;          // 상담 총 시간
}
```

**ConsultationStatus** — 상담 상태
```typescript
type ConsultationStatus = 'recording' | 'processing' | 'completed' | 'error';
```

**Consultation** — 상담 세션 전체
```typescript
interface Consultation {
  id: string;
  startedAt: number;              // Date.now()
  endedAt?: number;
  status: ConsultationStatus;
  transcript: TranscriptSegment[];
  coachingMessages: CoachingMessage[];
  report?: ReviewReport;
}
```

**StoredConsultation** — AsyncStorage에 저장되는 요약본 (목록 표시용)
```typescript
interface StoredConsultation {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  overallScore: number;           // (3개 score 평균)
  reportSummary: string;          // 한 줄 요약
  hasReport: boolean;
}
```

### 추가 규칙

- 모든 타입은 `export`한다.
- `interface`와 `type` 중 데이터 구조는 `interface`, 유니온/리터럴은 `type`을 사용한다.
- 타입 파일에 런타임 코드(함수, 클래스, 상수)를 넣지 않는다. 타입 정의만 포함한다.

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit      # 타입 에러 없음
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - `salesfit/src/types/index.ts` 존재 확인
   - 모든 interface/type이 export되어 있는지 확인
   - 런타임 코드(함수, 클래스, 상수)가 없는지 확인
3. `phases/0-mvp/index.json`의 step 1 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "src/types/index.ts 생성. Consultation, TranscriptSegment, CoachingMessage, ReviewReport, StoredConsultation 등 7개 타입/인터페이스 정의 완료."`
   - 실패 → 에러/블록 처리

## 금지사항

- 타입 파일에 함수나 클래스를 넣지 마라. 이유: 타입 레이어와 로직 레이어를 분리해야 한다.
- `any` 타입을 사용하지 마라. 이유: strict 모드의 목적을 훼손한다.
- 기존 테스트를 깨뜨리지 마라.
