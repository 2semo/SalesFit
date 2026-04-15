# Step 3: mobile-services

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — axios 인터셉터 구조, 네트워크 상태 처리, 에러 핸들링 전략, 재시도 로직 섹션
- `/mobile/types/index.ts`
- `/mobile/constants/config.ts`
- `/mobile/store/authStore.ts`
- `/mobile/store/sessionStore.ts`

## 작업

서버 API 호출 클라이언트를 구현한다.

### `/mobile/services/api.ts`

axios 인스턴스 + 인터셉터.

ARCHITECTURE.md의 "axios 인터셉터 구조" 섹션을 그대로 구현한다:

```typescript
import axios from 'axios';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

// 요청 인터셉터: 모든 요청에 JWT 자동 첨부
// 응답 인터셉터: 401 → clearAuth + 로그인 리다이렉트, 네트워크 오류 → setOffline(true)
```

- Expo Router의 `router.replace('/(auth)/login')`으로 리다이렉트.
- 네트워크 오류(응답 없음): `sessionStore.setOffline(true)`.

### `/mobile/services/auth.ts`

```typescript
export async function registerApi(email: string, password: string, name: string): Promise<AuthResponse>
export async function loginApi(email: string, password: string): Promise<AuthResponse>
export async function getMeApi(): Promise<User>
```

타입은 `server/types/index.ts`와 동일한 구조 사용 (`mobile/types/index.ts`에서 import).

### `/mobile/services/stt.ts`

```typescript
export async function transcribeChunk(
  audioUri: string,
  chunkIndex: number,
  overlapMs: number
): Promise<STTResponse>
```

- `FormData`로 m4a 파일 전송.
- STT_TIMEOUT_MS(10초) 타임아웃.
- 재시도 로직: 실패 시 최대 2회 재시도 (1초, 3초 간격) — 네트워크 오류 또는 5xx에만 재시도.
- 413 에러는 재시도하지 않는다.

### `/mobile/services/coaching.ts`

```typescript
export async function analyzeTranscript(
  transcript: TranscriptSegment[],
  previousCoachings: string[]
): Promise<CoachingCard | null>  // 204 응답 시 null

export async function analyzeSilence(
  transcript: TranscriptSegment[],
  contextSummary?: string
): Promise<SilencePoint[]>

export async function generateReview(
  transcript: TranscriptSegment[],
  coachingEvents: CoachingEvent[],
  sessionDuration: number
): Promise<ReviewReport>
```

- `analyzeTranscript`: 서버 204 응답 시 `null` 반환.
- `generateReview`: REVIEW_TIMEOUT_MS(60초) 타임아웃.

### 테스트: `/mobile/__tests__/services.test.ts`

axios를 mock한다:
```typescript
jest.mock('axios');
import axios from 'axios';
const mockAxios = axios as jest.Mocked<typeof axios>;
```

또는 `axios-mock-adapter` 사용.

테스트 케이스:
- `registerApi`: axios.post 호출됨, AuthResponse 반환
- `loginApi`: 401 시 에러 throw
- `transcribeChunk`: FormData로 POST, STTResponse 반환
- `transcribeChunk`: 5xx 에러 시 2회 재시도 후 throw
- `analyzeTranscript`: 204 응답 시 null 반환
- `analyzeSilence`: SilencePoint 배열 반환

## Acceptance Criteria

```bash
cd mobile
npm test -- --testPathPattern="services.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/1-mobile/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "모바일 API 서비스 구현: axios 인터셉터(JWT+401+오프라인), auth/stt/coaching 클라이언트, STT 재시도(2회). services.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `services/` 파일에서 API 키를 하드코딩하지 마라. 이유: CLAUDE.md CRITICAL 규칙 — API 키는 server/에서만 사용한다.
- `stt.ts`에서 4xx 에러에 재시도하지 마라. 이유: 4xx는 클라이언트 오류이므로 재시도해도 결과가 같다. 413(파일 너무 큼)은 특히 재시도 의미 없음.
- `coaching.ts`의 `analyzeTranscript`에서 204를 에러로 처리하지 마라. 이유: 204는 데이터 부족 상황의 정상 응답이다.
