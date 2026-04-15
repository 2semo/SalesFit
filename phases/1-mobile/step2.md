# Step 2: mobile-store

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 상태 관리 섹션(authStore, sessionStore 인터페이스)
- `/docs/ADR.md` — ADR-006(JWT), ADR-009(Zustand)
- `/mobile/types/index.ts`
- `/mobile/constants/config.ts`

## 작업

Zustand 스토어 2개를 구현한다.

### `/mobile/store/authStore.ts`

ARCHITECTURE.md의 `AuthStore` 인터페이스를 그대로 구현한다.

```typescript
interface AuthStore {
  token: string | null;
  user: { id: string; email: string; name: string; } | null;
  setAuth: (token: string, user: { id: string; email: string; name: string }) => void;
  clearAuth: () => void;
}
```

- `zustand/persist` 미들웨어 + `expo-secure-store` storage 어댑터로 영속화한다.
- SecureStore 어댑터:
  ```typescript
  const secureStorage = {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
  ```
- store key: `'auth-storage'`

### `/mobile/store/sessionStore.ts`

ARCHITECTURE.md의 `SessionStore` 인터페이스를 그대로 구현한다.

```typescript
interface SessionStore {
  sessionId: string | null;
  status: 'idle' | 'recording' | 'paused' | 'processing' | 'reviewing';
  transcriptSegments: TranscriptSegment[];
  currentCoachingCard: CoachingCard | null;
  isCoachingCardExpanded: boolean;
  currentSilenceAlert: SilencePoint[] | null;
  lastCoachingAt: number;
  lastSilenceAt: number;
  chunkQueue: AudioChunk[];
  isOffline: boolean;
  isCoachingInFlight: boolean;
  pausedAt: number | null;
  // actions
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  appendSegment: (segment: TranscriptSegment) => void;
  setCoachingCard: (card: CoachingCard | null) => void;
  expandCoachingCard: () => void;
  collapseCoachingCard: () => void;
  setSilenceAlert: (points: SilencePoint[] | null) => void;
  enqueueChunk: (chunk: AudioChunk) => void;
  dequeueChunk: () => AudioChunk | null;
  setOffline: (offline: boolean) => void;
}
```

Action 구현 규칙:
- `startSession`: `sessionId`를 UUID v4로 생성, `status: 'recording'`, 타임스탬프 초기화
- `pauseSession`: `status: 'paused'`, `pausedAt: Date.now()`
- `resumeSession`: `status: 'recording'`, `pausedAt: null`
- `endSession`: 전체 상태 초기화 (`idle`)
- `enqueueChunk`: 큐 크기가 `MAX_CHUNK_QUEUE_SIZE(5)` 초과 시 가장 오래된 청크 드랍
- `dequeueChunk`: 큐에서 첫 번째 청크 반환 후 제거 (없으면 `null`)

UUID 생성: `crypto.randomUUID()` 사용 (React Native 0.74+에서 지원).

sessionStore는 영속화하지 않는다. 앱 재시작 시 초기화.

### 테스트: `/mobile/__tests__/store.test.ts`

`expo-secure-store`를 mock한다:
```typescript
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
```

테스트 케이스:

**authStore:**
- `setAuth` → token과 user가 저장됨
- `clearAuth` → token과 user가 null로 초기화됨

**sessionStore:**
- `startSession` → `status: 'recording'`, `sessionId` 생성됨
- `pauseSession` → `status: 'paused'`, `pausedAt` 설정됨
- `resumeSession` → `status: 'recording'`, `pausedAt: null`
- `endSession` → 전체 초기화
- `appendSegment` → `transcriptSegments`에 추가됨
- `enqueueChunk` → 6번째 청크 enqueue 시 첫 번째 드랍, 큐 크기 5 유지
- `setCoachingCard` + `expandCoachingCard` → 카드 설정 및 확장 상태 변경

## Acceptance Criteria

```bash
cd mobile
npm test -- --testPathPattern="store.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/1-mobile/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Zustand 스토어 2개 구현: authStore(SecureStore 영속화), sessionStore(청크큐 MAX_QUEUE_SIZE 드랍 포함). store.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `sessionStore`에 `persist` 미들웨어를 적용하지 마라. 이유: 세션 상태는 앱 재시작 시 초기화되어야 한다. 녹음 중 상태가 재시작 후 복원되면 UX가 깨진다.
- `zustand/devtools`를 production 빌드에 포함하지 마라. 이유: 불필요한 번들 크기 증가.
- `transcriptSegments`를 store에서 직접 변경하지 마라. 이유: Zustand immer 패턴 또는 spread 복사로 불변성을 유지해야 한다.
