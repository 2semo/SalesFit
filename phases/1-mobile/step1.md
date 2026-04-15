# Step 1: mobile-foundation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 로컬 DB 스키마, SQLite 마이그레이션 전략, 환경변수 섹션
- `/docs/ADR.md` — ADR-005(SQLite)
- `/mobile/package.json`
- `/mobile/tsconfig.json`
- `/server/types/index.ts` (서버 타입 참고 — 모바일 타입과 일관성 유지)

## 작업

모바일 앱의 기반이 되는 타입, 상수, SQLite DB 레이어를 구현한다.

### `/mobile/types/index.ts`

모바일 전체에서 사용하는 TypeScript 타입. 서버 타입과 호환되어야 한다.

```typescript
// 서버와 공유하는 타입 (서버 types/index.ts와 동일하게 유지)
export type CustomerTrait = '가격민감형' | '브랜드신뢰형' | '기능탐색형' | '빠른결정형' | '신중비교형';

export interface TranscriptSegment {
  text: string;
  timestamp_s: number;
}

export interface CoachingEvent {
  type: 'realtime' | 'silence';
  content: string;
  timestamp_s: number;
}

// 모바일 전용 타입
export interface Session {
  id: string;           // UUID v4
  user_id: string;
  started_at: string;   // ISO 8601
  ended_at?: string;
  duration_s?: number;
  status: 'completed' | 'interrupted';
  review_status: 'pending' | 'completed' | 'failed';
}

export interface CoachingCard {
  customerTrait: CustomerTrait;
  coachingMessage: string;
  actions: string[];
}

export interface SilencePoint {
  point: string;
}

export interface ReviewReport {
  summary: { duration: number; customerTrait: string; mainCategory: string; };
  strengths: Array<{ point: string; quote?: string; }>;
  weaknesses: Array<{ point: string; situation?: string; }>;
  actions: [string, string, string];
}

export interface AudioChunk {
  uri: string;
  chunkIndex: number;
  timestamp: number;
}
```

### `/mobile/constants/config.ts`

```typescript
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
export const SILENCE_THRESHOLD_DB = -50;
export const SILENCE_DURATION_MS = 5000;
export const CHUNK_DURATION_MS = 15000;
export const CHUNK_OVERLAP_MS = 1000;
export const COACHING_COOLDOWN_MS = 30000;
export const SILENCE_COOLDOWN_MS = 30000;
export const STT_TIMEOUT_MS = 10000;
export const REVIEW_TIMEOUT_MS = 60000;
export const MIN_SEGMENTS_FOR_COACHING = 3;
export const MAX_CHUNK_QUEUE_SIZE = 5;
export const TRANSCRIPT_VIEW_MAX = 50;
```

### `/mobile/db/client.ts`

expo-sqlite 싱글톤 클라이언트.

```typescript
import * as SQLite from 'expo-sqlite';

export function getDb(): SQLite.SQLiteDatabase
```

- 싱글톤 패턴. 앱 전체에서 하나의 DB 인스턴스 공유.
- DB 이름: `salescoach.db`

### `/mobile/db/migrations/001_initial.sql`

ARCHITECTURE.md의 로컬 DB 스키마 섹션을 그대로 SQL로 작성한다:
- `schema_migrations` 테이블
- `sessions` 테이블 (인덱스 포함)
- `transcripts` 테이블 (인덱스 포함)
- `coaching_events` 테이블 (인덱스 포함)
- `reviews` 테이블

모든 CREATE 문은 `IF NOT EXISTS`를 사용한다 (멱등성 보장).

### `/mobile/db/migrate.ts`

마이그레이션 실행기.

```typescript
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void>
```

- `schema_migrations` 테이블에서 이미 적용된 버전 확인
- `migrations/` 디렉토리의 `.sql` 파일을 버전순으로 실행
- 각 마이그레이션을 트랜잭션으로 실행
- 성공 시 `schema_migrations`에 버전 기록
- 롤백 없음 — 실패해도 이전 상태 유지 (ADR-005)

### `/mobile/db/repositories/sessionRepository.ts`

```typescript
export interface SessionRepository {
  create(session: Omit<Session, 'review_status'> & { review_status?: Session['review_status'] }): Promise<void>;
  findById(id: string): Promise<Session | null>;
  findAll(userId: string): Promise<Session[]>;
  updateReviewStatus(id: string, status: Session['review_status']): Promise<void>;
  delete(id: string): Promise<void>;
}
export function createSessionRepository(db: SQLite.SQLiteDatabase): SessionRepository
```

### `/mobile/db/repositories/transcriptRepository.ts`

```typescript
export interface TranscriptRepository {
  bulkInsert(sessionId: string, segments: Array<TranscriptSegment & { chunk_index: number }>): Promise<void>;
  findBySession(sessionId: string): Promise<Array<TranscriptSegment & { id: string; chunk_index: number }>>;
}
export function createTranscriptRepository(db: SQLite.SQLiteDatabase): TranscriptRepository
```

### `/mobile/db/repositories/coachingEventRepository.ts`

```typescript
export interface CoachingEventRepository {
  bulkInsert(sessionId: string, events: CoachingEvent[]): Promise<void>;
  findBySession(sessionId: string): Promise<Array<CoachingEvent & { id: string }>>;
}
export function createCoachingEventRepository(db: SQLite.SQLiteDatabase): CoachingEventRepository
```

### `/mobile/db/repositories/reviewRepository.ts`

```typescript
export interface ReviewRepository {
  upsert(sessionId: string, report: ReviewReport): Promise<void>;
  findBySession(sessionId: string): Promise<ReviewReport | null>;
}
export function createReviewRepository(db: SQLite.SQLiteDatabase): ReviewRepository
```

각 Repository는 parameterized query만 사용한다. SQL 문자열 직접 연결 절대 금지.

### 테스트: `/mobile/__tests__/db.test.ts`

expo-sqlite를 mock한다:
```typescript
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
```

테스트 케이스:
- `sessionRepository.create` → `db.runAsync`가 올바른 SQL로 호출됨
- `transcriptRepository.bulkInsert` → 여러 세그먼트를 트랜잭션으로 삽입
- `reviewRepository.upsert` → JSON 직렬화 후 저장

## Acceptance Criteria

```bash
cd mobile
npm test -- --testPathPattern="db.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/1-mobile/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "mobile/ 기반 레이어 구현: types/index.ts, constants/config.ts, SQLite 클라이언트+마이그레이션+4개 Repository. db.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- Repository에서 SQL 문자열을 직접 연결하지 마라. 이유: SQL Injection 취약점.
- `expo-sqlite`의 deprecated API(`openDatabase` 동기 버전)를 사용하지 마라. 이유: SDK 52는 비동기 API(`openDatabaseAsync`)를 사용한다.
- `constants/config.ts`에 실제 API URL을 하드코딩하지 마라. 이유: `EXPO_PUBLIC_API_URL` 환경변수로 관리해야 한다.
