# 아키텍처: SalesCoach

## 디렉토리 구조

```
salescoach/
├── mobile/                            # React Native + Expo 앱
│   ├── app/                           # Expo Router 페이지
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── onboarding.tsx         # 온보딩 슬라이드 3장 (최초 1회)
│   │   ├── (main)/
│   │   │   ├── _layout.tsx            # 탭 네비게이터
│   │   │   ├── index.tsx              # 홈 (상담 대기 / 진행 중)
│   │   │   ├── consultation.tsx       # 상담 진행 화면
│   │   │   ├── settings.tsx           # 설정 화면 (무음 임계값 등)
│   │   │   └── history/
│   │   │       ├── index.tsx          # 세션 목록 + 검색/필터
│   │   │       └── [sessionId].tsx    # 세션 상세 / 복기 리포트
│   │   └── _layout.tsx                # 루트 레이아웃 (인증 가드)
│   ├── components/
│   │   ├── CoachingCard.tsx           # 실시간 코칭 카드 (slide-up 오버레이)
│   │   ├── SilenceAlert.tsx           # 무음 감지 소구 포인트 카드
│   │   ├── TranscriptView.tsx         # 실시간 자막 스크롤뷰
│   │   ├── RecordButton.tsx           # 녹음 FAB (대기/녹음 중 상태)
│   │   └── ReviewReport.tsx           # 복기 리포트 렌더러
│   ├── hooks/
│   │   ├── useAudioRecorder.ts        # expo-av 녹음 + 15초 청크 분할
│   │   ├── useSilenceDetector.ts      # 오디오 레벨 모니터링 + 쿨다운
│   │   ├── useConsultation.ts         # 상담 세션 오케스트레이터 (일시정지 포함)
│   │   ├── useTranscriptAccumulator.ts # 청크 텍스트 중복 제거 + 누적
│   │   └── useWakeLock.ts             # expo-keep-awake 래퍼 (상담 중 화면 유지)
│   ├── services/                      # 서버 API 클라이언트 (axios)
│   │   ├── api.ts                     # axios 인스턴스 + 인터셉터
│   │   ├── auth.ts
│   │   ├── stt.ts
│   │   └── coaching.ts
│   ├── store/
│   │   ├── authStore.ts               # Zustand: JWT, 사용자 정보
│   │   └── sessionStore.ts            # Zustand: 진행 중인 상담 상태
│   ├── db/
│   │   ├── client.ts                  # expo-sqlite 싱글톤
│   │   ├── migrations/
│   │   │   └── 001_initial.sql
│   │   └── repositories/
│   │       ├── sessionRepository.ts
│   │       ├── transcriptRepository.ts
│   │       ├── coachingEventRepository.ts
│   │       └── reviewRepository.ts
│   ├── types/
│   │   └── index.ts                   # 공유 TypeScript 타입
│   ├── constants/
│   │   └── config.ts                  # 서버 URL, 임계값 상수
│   └── utils/
│       ├── audioChunk.ts              # 청크 오버랩 중복 제거 유틸
│       └── errorHandler.ts            # 공통 에러 처리 유틸
│
├── server/                            # Next.js 15 API 서버
│   ├── app/
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register/route.ts
│   │       │   ├── login/route.ts
│   │       │   └── me/route.ts
│   │       ├── stt/
│   │       │   └── route.ts
│   │       └── coaching/
│   │           ├── analyze/route.ts
│   │           ├── silence/route.ts
│   │           └── review/route.ts
│   ├── lib/
│   │   ├── whisper.ts                 # OpenAI Whisper 클라이언트
│   │   ├── gemini.ts                  # Google Gemini 클라이언트 + 프롬프트
│   │   ├── auth.ts                    # JWT 생성 / 검증
│   │   ├── db.ts                      # Vercel Postgres 클라이언트 싱글톤
│   │   └── rateLimit.ts               # 엔드포인트별 요청 제한
│   ├── middleware.ts                  # JWT 검증 미들웨어
│   ├── types/
│   │   └── index.ts
│   └── .env.local                     # 환경 변수 (아래 목록 참조)
│
└── docs/
```

---

## 환경 변수

### server/.env.local
```
OPENAI_API_KEY=                # Whisper API 키
GOOGLE_GENERATIVE_AI_API_KEY=  # Gemini API 키
JWT_SECRET=                    # JWT 서명 비밀키 (최소 32자 랜덤)
JWT_EXPIRES_IN=7d              # JWT 유효기간
ALLOWED_ORIGINS=               # CORS 허용 출처 (모바일 앱 URL)
POSTGRES_URL=                  # Vercel Postgres 연결 URL (유저 DB)
POSTGRES_URL_NON_POOLING=      # Vercel Postgres 마이그레이션용
```

### mobile/constants/config.ts
```typescript
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL; // 서버 URL
export const SILENCE_THRESHOLD_DB = -50;   // 무음 감지 임계값
export const SILENCE_DURATION_MS = 5000;   // 무음 지속 시간
export const CHUNK_DURATION_MS = 15000;    // STT 청크 단위
export const CHUNK_OVERLAP_MS = 1000;      // 청크 오버랩
export const COACHING_COOLDOWN_MS = 30000; // 코칭 카드 쿨다운
export const SILENCE_COOLDOWN_MS = 30000;  // 무음 카드 쿨다운
export const STT_TIMEOUT_MS = 10000;       // STT 요청 타임아웃
export const REVIEW_TIMEOUT_MS = 60000;    // 복기 리포트 타임아웃
export const MIN_SEGMENTS_FOR_COACHING = 3;// 코칭 시작 최소 세그먼트 수
```

---

## 데이터 흐름

### 실시간 코칭 흐름 (상세)

```
[expo-av 오디오 레코더]
  │
  ├─ 100ms마다 오디오 레벨 측정 → useSilenceDetector
  │
  └─ 15초마다 청크 생성 (m4a, 1초 오버랩)
        │
        ▼
  [useAudioRecorder] → FormData (audio/m4a)
        │
        ▼
  POST /api/stt
  {
    audio: File,        // m4a 청크
    chunkIndex: number, // 순서 (중복 제거용)
    overlapMs: 1000     // 앞 청크와 오버랩 시간
  }
        │
        ▼
  [server: whisper.ts] → OpenAI Whisper API
  - 포맷: audio/m4a
  - 언어: ko (한국어 고정)
  - 응답: { text: string, duration: number }
        │
        ▼
  [mobile: useTranscriptAccumulator]
  - 오버랩 구간 중복 텍스트 제거 (앞 청크 끝 20자 vs 현재 청크 시작 비교)
  - sessionStore.transcriptSegments 에 append
        │
        ▼
  [코칭 트리거: 새 세그먼트 2개 추가 + 쿨다운 30초 경과]
        │
        ▼
  POST /api/coaching/analyze
  {
    transcript: TranscriptSegment[],  // 전체 누적 트랜스크립트
    previousCoachings: string[]       // 직전 코칭 카드 3개 (중복 방지)
  }
        │
        ▼
  [server: gemini.ts] → Gemini API
        │
        ▼
  CoachingCard 표시
```

### 무음 감지 흐름 (상세)

```
[useSilenceDetector]
  - 100ms 주기로 오디오 레벨 측정
  - level < SILENCE_THRESHOLD_DB (-50dB) 가 SILENCE_DURATION_MS (5000ms) 지속
  - lastSilenceAt 체크: 쿨다운 30초 미경과 시 이벤트 무시
        │
        ▼
  POST /api/coaching/silence
  {
    transcript: TranscriptSegment[],  // 현재까지 트랜스크립트 (비어 있을 수 있음)
    contextSummary?: string           // 직전 코칭 카드 내용
  }
        │
        ▼
  SilenceAlert 카드 표시
  - 대화 재개 감지 (level > -40dB) 또는 사용자 탭 → 닫힘
```

### 상담 종료 + 복기 흐름 (상세)

```
[종료 버튼 탭]
  → 확인 팝업
  → 마지막 청크 STT 완료 대기 (최대 30초 타임아웃)
  → SQLite 저장 순서:
      1. sessions (INSERT)
      2. transcripts (BULK INSERT - 청크별 세그먼트)
      3. coaching_events (BULK INSERT - 코칭 카드 이력)
  → POST /api/coaching/review
      {
        transcript: TranscriptSegment[],
        coachingEvents: CoachingEvent[],
        sessionDuration: number
      }
  → 로딩 (최대 60초 타임아웃)
  → SQLite 저장: reviews (INSERT)
  → 복기 리포트 화면
```

---

## API 스키마

### POST /api/auth/register
```typescript
// Request
{
  email: string;    // 이메일 형식 검증
  password: string; // 최소 8자
  name: string;     // 표시 이름
}

// Response 200
{
  token: string;   // JWT
  user: { id: string; email: string; name: string; }
}

// Response 400 (검증 실패)
{ error: "VALIDATION_ERROR"; message: string; }

// Response 409 (이메일 중복)
{ error: "EMAIL_EXISTS"; message: string; }
```

### POST /api/auth/login
```typescript
// Request
{ email: string; password: string; }

// Response 200
{ token: string; user: { id: string; email: string; name: string; } }

// Response 401
{ error: "INVALID_CREDENTIALS"; message: "이메일 또는 비밀번호가 올바르지 않습니다"; }
```

### POST /api/stt
```typescript
// Request (multipart/form-data)
{
  audio: File;         // m4a 포맷, 최대 25MB
  chunkIndex: number;  // 0부터 시작
  overlapMs: number;   // 오버랩 시간 (ms)
}

// Response 200
{
  text: string;        // Whisper 인식 텍스트
  chunkIndex: number;  // 요청과 동일 (순서 검증용)
  duration: number;    // 청크 길이 (초)
}

// Response 400
{ error: "INVALID_AUDIO"; message: string; }

// Response 413
{ error: "FILE_TOO_LARGE"; message: "최대 25MB"; }

// Response 503 (Whisper API 다운)
{ error: "STT_UNAVAILABLE"; message: string; }
```

### POST /api/coaching/analyze
```typescript
// Request
{
  transcript: Array<{
    text: string;
    timestamp_s: number;
  }>;
  previousCoachings: string[]; // 직전 3개 코칭 멘트 (중복 방지)
}

// Response 200
{
  customerTrait: "가격민감형" | "브랜드신뢰형" | "기능탐색형" | "빠른결정형" | "신중비교형";
  coachingMessage: string;    // 최대 50자
  actions: string[];          // 1~2개 행동 제안
}

// Response 204 (코칭 없음 - 데이터 부족)
// (빈 응답)

// Response 503 (Gemini 다운)
{ error: "COACHING_UNAVAILABLE"; message: string; }
```

### POST /api/coaching/silence
```typescript
// Request
{
  transcript: Array<{ text: string; timestamp_s: number; }>;
  contextSummary?: string;
}

// Response 200
{
  points: [string, string, string]; // 소구 포인트 정확히 3개
}

// Response 503
{ error: "COACHING_UNAVAILABLE"; message: string; }
```

### POST /api/coaching/review
```typescript
// Request
{
  transcript: Array<{ text: string; timestamp_s: number; }>;
  coachingEvents: Array<{
    type: "realtime" | "silence";
    content: string;
    timestamp_s: number;
  }>;
  sessionDuration: number; // 초
}

// Response 200
{
  summary: {
    duration: number;
    customerTrait: string;
    mainCategory: string;
  };
  strengths: Array<{ point: string; quote?: string; }>;   // 잘한 점 + 발화 인용
  weaknesses: Array<{ point: string; situation?: string; }>; // 아쉬운 점 + 상황
  actions: [string, string, string]; // 개선 액션 정확히 3개
}

// Response 422 (트랜스크립트 비어 있음)
{ error: "INSUFFICIENT_DATA"; message: "대화 내용이 충분하지 않습니다"; }

// Response 503
{ error: "REVIEW_UNAVAILABLE"; message: string; }
```

---

## 서버 DB 스키마 (Vercel Postgres)

서버는 유저 계정 정보만 저장한다. 상담 데이터는 기기 SQLite에 저장.

```sql
-- 유저 테이블
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  password   TEXT NOT NULL,   -- bcrypt 해시 (salt rounds: 12)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

> 유저 데이터가 서버에만 있으므로, 앱을 재설치하거나 기기를 교체해도 로그인만 하면 계정은 유지된다.
> 단, 상담 데이터는 SQLite에 있어 기기 교체 시 소실된다 (Phase 2에서 클라우드 동기화 예정).

---

## 로컬 DB 스키마 (expo-sqlite)

```sql
-- 스키마 버전 관리
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL
);

-- 상담 세션
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,           -- UUID v4
  user_id       TEXT NOT NULL,
  started_at    TEXT NOT NULL,              -- ISO 8601
  ended_at      TEXT,
  duration_s    INTEGER,
  status        TEXT NOT NULL DEFAULT 'completed',
                                            -- 'completed' | 'interrupted'
  review_status TEXT NOT NULL DEFAULT 'pending'
                                            -- 'pending' | 'completed' | 'failed'
);

-- 트랜스크립트 세그먼트
CREATE TABLE IF NOT EXISTS transcripts (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES sessions(id),
  chunk_index  INTEGER NOT NULL,
  text         TEXT NOT NULL,
  timestamp_s  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id, timestamp_s);

-- 코칭 이벤트 로그
CREATE TABLE IF NOT EXISTS coaching_events (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES sessions(id),
  type         TEXT NOT NULL,               -- 'realtime' | 'silence'
  content      TEXT NOT NULL,               -- JSON 직렬화
  timestamp_s  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coaching_session ON coaching_events(session_id);

-- 복기 리포트
CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL UNIQUE REFERENCES sessions(id),
  summary      TEXT NOT NULL,               -- JSON
  strengths    TEXT NOT NULL,               -- JSON array
  weaknesses   TEXT NOT NULL,               -- JSON array
  actions      TEXT NOT NULL,               -- JSON array (3개)
  created_at   TEXT NOT NULL
);
```

---

## 상태 관리

### Zustand: authStore
```typescript
interface AuthStore {
  token: string | null;
  user: { id: string; email: string; name: string; } | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}
// token은 expo-secure-store에도 동기화
```

### Zustand: sessionStore
```typescript
interface SessionStore {
  sessionId: string | null;
  status: 'idle' | 'recording' | 'paused' | 'processing' | 'reviewing';
  //                               ^^^^^^ 일시정지 상태 추가
  transcriptSegments: TranscriptSegment[];
  currentCoachingCard: CoachingCard | null;
  isCoachingCardExpanded: boolean;  // 카드 접힘/펼침 상태
  currentSilenceAlert: SilencePoint[] | null;
  lastCoachingAt: number;    // timestamp (쿨다운 계산)
  lastSilenceAt: number;     // timestamp (쿨다운 계산)
  chunkQueue: AudioChunk[];  // 업로드 대기 중인 청크
  isOffline: boolean;        // 네트워크 상태
  isCoachingInFlight: boolean; // Gemini 요청 중 여부 (중복 방지)
  pausedAt: number | null;   // 일시정지 시작 타임스탬프
  // actions
  startSession: () => void;
  pauseSession: () => void;   // 일시정지
  resumeSession: () => void;  // 재개
  endSession: () => void;
  appendSegment: (segment: TranscriptSegment) => void;
  setCoachingCard: (card: CoachingCard | null) => void;
  expandCoachingCard: () => void;
  collapseCoachingCard: () => void;
  setSilenceAlert: (points: SilencePoint[] | null) => void;
}
```

---

## 에러 핸들링 전략

### 계층별 에러 처리

```
[Mobile Services Layer]
  - 모든 API 요청은 axios 인터셉터를 통과
  - 401 응답 → authStore.clearAuth() → 로그인 화면 리다이렉트
  - 네트워크 오류 → 재시도 로직 (아래 참조)
  - 503 응답 → 기능별 fallback (아래 참조)

[Server Routes Layer]
  - 모든 에러는 { error: string; message: string } 형식으로 통일
  - Whisper/Gemini API 에러 → 503 변환 후 반환
  - 예외 없이 try-catch로 감쌈

[SQLite Layer]
  - 쓰기 실패 → 에러 로그 + UI 토스트 표시
  - 읽기 실패 → 빈 배열 반환 + 에러 로그 (앱 크래시 방지)
```

### 재시도 로직

| 요청 | 재시도 횟수 | 간격 | 재시도 조건 |
|------|------------|------|------------|
| STT 청크 | 2회 | 1초, 3초 | 네트워크 오류, 5xx |
| coaching/analyze | 없음 | - | 실패 시 다음 주기에 자연스럽게 재시도 |
| coaching/silence | 없음 | - | 다음 silence 이벤트까지 대기 |
| coaching/review | 없음 | - | 사용자가 히스토리에서 수동 재시도 |

### 기능별 Fallback

| API 실패 | Fallback 동작 |
|----------|--------------|
| STT 실패 | 녹음 유지, 트랜스크립트에 `[인식 불가 구간]` 삽입 |
| coaching/analyze 실패 | 코칭 카드 없음. 상담 진행에 영향 없음 |
| coaching/silence 실패 | 무음 카드 없음. 상담 진행에 영향 없음 |
| coaching/review 실패 | 세션/트랜스크립트 SQLite 저장 유지. 리포트는 나중에 재생성 가능 |
| 서버 전체 다운 | 녹음만 진행. 코칭 없음. 종료 시 데이터 로컬 저장 |

---

## 오디오 처리 상세

### 포맷 스펙
```
컨테이너: m4a (AAC)
샘플레이트: 16000 Hz (Whisper 권장)
채널: 1 (모노, 파일 크기 절감)
비트레이트: 32kbps
15초 청크 예상 크기: ≈ 0.5~0.7MB (Whisper 25MB 제한 대비 안전)
```

### 청크 오버랩 중복 제거 알고리즘
```
1. 이전 청크의 Whisper 텍스트 마지막 20자 추출 → tail
2. 현재 청크의 Whisper 텍스트 앞부분에서 tail 검색
3. 매치 발견 시 매치 이후 텍스트만 사용
4. 매치 없을 시 (무음 구간 등) 전체 텍스트 사용

주의: 완벽한 중복 제거보다 자연스러운 누락 허용 우선.
      트랜스크립트 완벽성보다 코칭 품질에 집중.
```

### 무음 감지 알고리즘
```
입력: expo-av의 onRecordingStatusUpdate 콜백 (100ms 주기)
측정값: metering (dBFS)

상태 머신:
  SPEAKING:  level >= -50dB → 유지 / level < -50dB → SILENT_CANDIDATE 진입 (타이머 시작)
  SILENT_CANDIDATE: 5000ms 경과 → SILENT 이벤트 발생 / level >= -50dB → SPEAKING 복귀
  COOLDOWN: 이벤트 발생 후 30000ms → 다시 SPEAKING 상태로

-40dB: 대화 재개 감지 임계값 (silence보다 10dB 높게 설정 — 히스테리시스)
```

---

## 보안

| 항목 | 구현 |
|------|------|
| API 키 보호 | server/.env.local 에만 저장. mobile에 절대 포함 안 함 |
| JWT 저장 | expo-secure-store (iOS Keychain / Android Keystore) |
| HTTPS 강제 | 서버 배포 시 Vercel HTTPS. 개발 시에도 ngrok HTTPS |
| CORS | server/middleware.ts에서 ALLOWED_ORIGINS만 허용 |
| 요청 인증 | /api/stt, /api/coaching/* 는 Authorization: Bearer {token} 필수 |
| 비밀번호 해싱 | bcrypt (salt rounds: 12) |
| 오디오 파일 | 서버 메모리에서만 처리, 디스크 저장 없음 (Whisper API 직접 스트림) |
| SQL Injection | expo-sqlite parameterized query 사용 (직접 문자열 연결 금지) |

---

## 성능 고려사항

### 메모리 관리 (장시간 상담)
```
- 트랜스크립트 뷰: 최근 50개 세그먼트만 렌더링 (FlatList + 가상화)
- 전체 transcriptSegments: sessionStore에 무제한 누적 (코칭 분석용)
  → 60분 상담 기준 약 240개 세그먼트, JSON ≈ 50KB (허용 범위)
- 오디오 버퍼: 청크 생성 즉시 서버로 전송 후 로컬 파일 삭제
```

### 동시성
```
- STT 요청: 청크 단위로 순차 전송 (병렬 전송 안 함)
  → 순서 보장 + Whisper API 과부하 방지
- coaching/analyze: 이전 요청 응답 대기 중이면 새 요청 skip
  → isCoachingInFlight 플래그로 관리
- SQLite 쓰기: 상담 종료 시점에 일괄 트랜잭션으로 처리
  → 상담 중 실시간 DB 쓰기 최소화
```

### Rate Limiting (서버)
```
/api/stt:               60 req/min per user
/api/coaching/analyze:  4 req/min per user  (30초 쿨다운 대비 여유)
/api/coaching/silence:  4 req/min per user
/api/coaching/review:   5 req/hour per user
/api/auth/*:            10 req/min per IP
```

---

## Gemini 프롬프트 구조

### coaching/analyze 프롬프트
```
역할: 가전제품 판매 전문 코치
입력: 상담 트랜스크립트 (누적), 이전 코칭 이력
출력: JSON { customerTrait, coachingMessage, actions }

핵심 지시:
- customerTrait은 반드시 지정된 5개 태그 중 하나만 선택
- coachingMessage는 50자 이내 한국어
- actions는 1~2개 구체적 행동 단위 (동사로 시작)
- 이전 코칭과 중복 금지
- 데이터가 불충분하면 null 반환 (억지로 분석하지 말 것)
```

### coaching/silence 프롬프트
```
역할: 가전제품 판매 전문 코치
입력: 현재까지 대화 내용, 직전 코칭 요약
출력: JSON { points: [string, string, string] }

핵심 지시:
- 현재 대화 맥락에서 고객 관심사를 파악해 소구 포인트 3개 제안
- 트랜스크립트 없으면 일반 가전 소구 포인트 3개 (에너지효율, 할부혜택, AS정책)
- 각 포인트는 20자 이내 한국어 액션 문장
```

### coaching/review 프롬프트
```
역할: 가전제품 판매 역량 개발 전문가
입력: 전체 트랜스크립트, 코칭 이벤트 이력, 상담 시간
출력: JSON { summary, strengths[], weaknesses[], actions[3] }

핵심 지시:
- strengths: 실제 발화를 인용해서 구체적으로 (quote 필드 포함)
- weaknesses: 개선이 필요한 구체적 상황 지목 (situation 필드 포함)
- actions: 반드시 3개, 다음 상담에서 바로 실행 가능한 단위
- 칭찬 일색으로 만들지 말 것. 개선점을 솔직하게 작성
```

---

## 백그라운드 오디오 전략

상담 중 앱이 백그라운드로 전환되어도 녹음이 유지되어야 한다.

### iOS
```
app.json 설정:
  "infoPlist": {
    "UIBackgroundModes": ["audio"],
    "NSMicrophoneUsageDescription": "상담 녹음을 위해 마이크 접근이 필요합니다."
  }

expo-av RecordingOptions:
  isMeteringEnabled: true,
  ios: { allowsRecording: true }

동작: 앱이 백그라운드 전환되어도 오디오 세션 유지.
      잠금화면에 "SalesCoach — 상담 녹음 중" 컨트롤 표시.
```

### Android
```
app.json 설정:
  "foregroundService": {
    "notificationTitle": "SalesCoach",
    "notificationBody": "상담 녹음 중입니다.",
    "notificationColor": "#3B82F6"
  }

동작: Foreground Service로 프로세스 유지.
      상태바에 영구 알림 표시 (Android 요구사항).
      사용자가 알림을 탭하면 앱으로 복귀.
```

### Wake Lock (화면 자동 꺼짐 방지)
```
패키지: expo-keep-awake

사용처: useWakeLock 훅
  - activateKeepAwakeAsync(): 상담 시작 시 호출
  - deactivateKeepAwake(): 상담 종료 / 일시정지 시 해제

주의: 일시정지 상태에서는 Wake Lock 해제 (배터리 절약)
      재개 시 재활성화
```

---

## SQLite 마이그레이션 전략

```
- 앱 시작 시 schema_migrations 테이블 확인
- 현재 앱 버전에 필요한 마이그레이션 순차 적용
- 각 마이그레이션은 멱등성 보장 (IF NOT EXISTS 사용)
- 마이그레이션 롤백 없음 (로컬 데이터 손실 방지 목적)
- 파일 위치: mobile/db/migrations/001_initial.sql, 002_add_status.sql ...
```

---

## axios 인터셉터 구조

```typescript
// mobile/services/api.ts

const api = axios.create({ baseURL: API_BASE_URL });

// 요청 인터셉터: 모든 요청에 JWT 자동 첨부
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 응답 인터셉터: 401 → 로그아웃, 네트워크 오류 → 오프라인 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      router.replace('/(auth)/login');
    }
    if (!error.response) {
      // 네트워크 오류 (서버 다운, 인터넷 없음)
      useSessionStore.getState().setOffline(true);
    }
    return Promise.reject(error);
  }
);
```

---

## 네트워크 상태 처리

```
앱 전체에 NetInfo 리스너 등록:
  - 연결 없음 → sessionStore.isOffline = true
  - 상담 중 오프라인 전환:
      · 녹음 유지 (로컬 오디오는 계속)
      · 청크 큐에 쌓음 (최대 5개 보관, 이후 드랍)
      · 화면 상단에 "서버 연결 없음 — 코칭 일시 중단" 배너 표시
  - 온라인 복귀:
      · isOffline = false
      · 배너 제거
      · 큐에 쌓인 청크 순차 전송 재시도 (최대 2회)
      · 실패 시 해당 청크 폐기 (타임아웃 75초 초과)
  - 상담 종료 시 오프라인 상태:
      · 세션/트랜스크립트 SQLite 저장 (항상 가능)
      · 복기 리포트 생성은 온라인 복귀 후 히스토리에서 수동 재시도
```
