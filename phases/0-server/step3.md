# Step 3: server-lib

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 보안, 환경변수, 오디오 처리 섹션
- `/docs/ADR.md` — ADR-006(JWT), ADR-003(Gemini), ADR-002(Whisper), ADR-015(Postgres)
- `/server/types/index.ts`
- `/server/.env.test`

## 작업

`server/lib/` 아래 5개 유틸리티 파일을 구현한다.
테스트 환경에서는 실제 외부 API를 호출하지 않는다 — 환경변수 `POSTGRES_URL=mock` 일 때 DB mock, API 호출은 jest에서 별도 mock한다.

### `/server/lib/auth.ts`

JWT 생성/검증 + 비밀번호 해싱 유틸리티.

```typescript
import { JwtPayload } from '@/types';

export function signToken(payload: JwtPayload): string
export function verifyToken(token: string): JwtPayload
export async function hashPassword(password: string): Promise<string>
export async function comparePassword(plain: string, hashed: string): Promise<boolean>
```

- JWT: `jsonwebtoken` 사용. `JWT_SECRET` 환경변수 필수. `JWT_EXPIRES_IN` 환경변수로 만료 시간 설정(기본 `7d`).
- 비밀번호 해싱: `bcryptjs` 사용. salt rounds = 12 (ARCHITECTURE.md 보안 섹션).
- `verifyToken`이 실패하면 `Error`를 throw한다. 호출자가 401 처리.

### `/server/lib/db.ts`

Vercel Postgres 클라이언트 싱글톤.

```typescript
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]>
export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>
```

- `POSTGRES_URL` 환경변수가 `'mock'`이면 실제 DB 연결 없이 빈 결과 반환 (테스트용).
- `POSTGRES_URL`이 실제 URL이면 `@vercel/postgres`의 `sql` 태그드 템플릿 또는 `db.query` 사용.
- parameterized query만 사용한다. SQL 문자열 직접 연결 절대 금지 (SQL Injection 방지 — ARCHITECTURE.md 보안 섹션).

### `/server/lib/whisper.ts`

OpenAI Whisper API 클라이언트.

```typescript
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<{ text: string; duration: number }>
```

- `openai` 패키지 사용. `OPENAI_API_KEY` 환경변수 필수.
- 언어: `ko` 고정 (ARCHITECTURE.md 오디오 처리 섹션).
- 파일 크기 25MB 초과 시 `Error('FILE_TOO_LARGE')` throw.
- Whisper API 실패 시 `Error('STT_UNAVAILABLE')` throw.
- 오디오는 서버 메모리에서만 처리. 디스크에 저장하지 마라 (ARCHITECTURE.md 보안).

### `/server/lib/gemini.ts`

Google Gemini API 클라이언트 + 프롬프트.

```typescript
import { AnalyzeRequest, AnalyzeResponse, SilenceRequest, SilenceResponse, ReviewRequest, ReviewResponse } from '@/types';

export async function analyzeTranscript(req: AnalyzeRequest): Promise<AnalyzeResponse | null>
export async function analyzeSilence(req: SilenceRequest): Promise<SilenceResponse>
export async function generateReview(req: ReviewRequest): Promise<ReviewResponse>
```

- `@google/generative-ai` 패키지 사용. `GOOGLE_GENERATIVE_AI_API_KEY` 환경변수 필수. 모델: `gemini-1.5-pro`.
- `analyzeTranscript`: 데이터 불충분(transcript 3개 미만) 시 `null` 반환 — 204 No Content 용.
- Gemini 응답이 JSON 파싱 실패 시 `Error('COACHING_UNAVAILABLE')` throw.
- 각 함수의 Gemini 프롬프트는 ARCHITECTURE.md의 "Gemini 프롬프트 구조" 섹션을 그대로 구현한다.

### `/server/lib/rateLimit.ts`

엔드포인트별 요청 제한 (in-memory, 서버리스 환경 대응).

```typescript
export function rateLimit(config: {
  windowMs: number;
  max: number;
  keyGenerator: (req: Request) => string;
}): (req: Request) => boolean  // true = 허용, false = 차단
```

- ARCHITECTURE.md Rate Limiting 섹션의 설정값대로 구현:
  - `/api/stt`: 60 req/min per user
  - `/api/coaching/*`: 4 req/min per user
  - `/api/auth/*`: 10 req/min per IP
- in-memory Map으로 구현. 서버리스 Cold Start 시 초기화됨 — MVP에서는 허용.

### 테스트: `/server/__tests__/lib.test.ts`

아래 항목을 테스트한다:

- `auth.ts`: `hashPassword` → `comparePassword` 라운드트립, `signToken` → `verifyToken` 라운드트립, 잘못된 토큰 검증 시 throw
- `db.ts`: `POSTGRES_URL=mock` 환경에서 `query` 호출 시 빈 배열 반환
- `rateLimit.ts`: 제한 초과 시 `false` 반환

Whisper, Gemini는 이 step에서 테스트하지 않는다 (외부 API — route 테스트에서 mock 처리).

## Acceptance Criteria

```bash
cd server
npm test -- --testPathPattern="lib.test"
npx tsc --noEmit
```

테스트 통과, 타입 에러 없음.

## 검증 절차

1. `cd server && npm test -- --testPathPattern="lib.test" && npx tsc --noEmit` 실행한다.
2. `phases/0-server/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "server/lib/ 5개 파일 구현: auth(JWT+bcrypt), db(Postgres+mock), whisper(OpenAI), gemini(Gemini 3종 프롬프트), rateLimit(in-memory). lib.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `lib/db.ts`에서 SQL 문자열을 직접 연결(concatenation)하지 마라. 이유: SQL Injection 취약점.
- `lib/whisper.ts`에서 오디오 파일을 `fs.writeFile`로 디스크에 저장하지 마라. 이유: Vercel 서버리스 환경은 파일시스템이 읽기 전용이며, 보안 정책상 오디오를 서버에 저장하지 않는다.
- `POSTGRES_URL` 체크 없이 실제 DB 연결을 시도하지 마라. 이유: 테스트 환경에서 DB 연결 실패로 모든 테스트가 깨진다.
- 각 lib 파일에서 다른 lib 파일을 순환 import하지 마라.
