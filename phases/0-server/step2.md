# Step 2: server-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — API 스키마 섹션을 집중해서 읽어라
- `/server/package.json`
- `/server/tsconfig.json`

## 작업

`server/types/index.ts` 파일 하나에 서버 전체에서 사용하는 TypeScript 타입을 정의한다.
ARCHITECTURE.md의 API 스키마를 그대로 타입으로 표현한다.

### `/server/types/index.ts`

아래 타입들을 모두 `export` 한다:

**유저 관련**
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface RegisterRequest { email: string; password: string; name: string; }
export interface LoginRequest { email: string; password: string; }
export interface AuthResponse { token: string; user: User; }
```

**STT 관련**
```typescript
export interface STTResponse {
  text: string;
  chunkIndex: number;
  duration: number;
}
```

**코칭 관련**
```typescript
export type CustomerTrait =
  | '가격민감형'
  | '브랜드신뢰형'
  | '기능탐색형'
  | '빠른결정형'
  | '신중비교형';

export interface TranscriptSegment {
  text: string;
  timestamp_s: number;
}

export interface CoachingEvent {
  type: 'realtime' | 'silence';
  content: string;
  timestamp_s: number;
}

export interface AnalyzeRequest {
  transcript: TranscriptSegment[];
  previousCoachings: string[];
}

export interface AnalyzeResponse {
  customerTrait: CustomerTrait;
  coachingMessage: string;
  actions: string[];
}

export interface SilenceRequest {
  transcript: TranscriptSegment[];
  contextSummary?: string;
}

export interface SilenceResponse {
  points: [string, string, string];
}

export interface ReviewRequest {
  transcript: TranscriptSegment[];
  coachingEvents: CoachingEvent[];
  sessionDuration: number;
}

export interface ReviewSummary {
  duration: number;
  customerTrait: string;
  mainCategory: string;
}

export interface ReviewStrength { point: string; quote?: string; }
export interface ReviewWeakness { point: string; situation?: string; }

export interface ReviewResponse {
  summary: ReviewSummary;
  strengths: ReviewStrength[];
  weaknesses: ReviewWeakness[];
  actions: [string, string, string];
}
```

**에러 응답**
```typescript
export interface ApiError {
  error: string;
  message: string;
}
```

**JWT Payload**
```typescript
export interface JwtPayload {
  userId: string;
  email: string;
}
```

## Acceptance Criteria

```bash
cd server
npx tsc --noEmit
```

타입 에러 없이 컴파일 통과.

## 검증 절차

1. `cd server && npx tsc --noEmit` 실행한다.
2. `phases/0-server/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "server/types/index.ts 생성: User, Auth, STT, Coaching(Analyze/Silence/Review), ApiError, JwtPayload 타입 정의"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- 타입을 여러 파일로 분산하지 마라. 이유: 서버 타입은 `server/types/index.ts` 단일 파일에서 관리한다 (ARCHITECTURE.md 구조).
- 구현 코드(함수, 클래스)를 이 파일에 넣지 마라. 이유: 타입 정의만 포함한다.
- `any` 타입을 사용하지 마라. 이유: CLAUDE.md TypeScript strict mode.
