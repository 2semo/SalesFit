# Step 4: mobile-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 오디오 처리 상세(청크 오버랩, 무음 감지 알고리즘, 상태 머신), 백그라운드 오디오, Wake Lock, 동시성 섹션
- `/docs/ADR.md` — ADR-002(청크), ADR-007(m4a), ADR-016(Wake Lock), ADR-017(백그라운드 오디오)
- `/mobile/types/index.ts`
- `/mobile/constants/config.ts`
- `/mobile/store/sessionStore.ts`
- `/mobile/services/stt.ts`
- `/mobile/services/coaching.ts`

## 작업

5개 커스텀 훅을 구현한다.

### `/mobile/hooks/useAudioRecorder.ts`

expo-av를 사용한 오디오 녹음 + 15초 청크 분할.

```typescript
interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
}

export function useAudioRecorder(): UseAudioRecorderReturn
```

핵심 구현 사항:
- 녹음 설정: m4a(AAC), 16kHz, 모노, 32kbps (`isMeteringEnabled: true`)
- `CHUNK_DURATION_MS(15000)`마다 녹음 중단 → 파일 URI 저장 → 새 녹음 시작 (1초 오버랩)
- 각 청크 생성 시 `sessionStore.enqueueChunk({ uri, chunkIndex, timestamp })`
- 청크 URI는 업로드 완료 후 `FileSystem.deleteAsync`로 삭제
- iOS: `AVAudioSession` PlayAndRecord 카테고리 (백그라운드 오디오용)

### `/mobile/hooks/useSilenceDetector.ts`

오디오 레벨 모니터링 + 무음 상태 머신.

```typescript
interface UseSilenceDetectorProps {
  isRecording: boolean;
  onSilenceDetected: () => void;
}

export function useSilenceDetector({ isRecording, onSilenceDetector }: UseSilenceDetectorProps): void
```

ARCHITECTURE.md 무음 감지 알고리즘 상태 머신 그대로 구현:
- `SPEAKING`: level >= -50dB → 유지 / level < -50dB → SILENT_CANDIDATE (타이머 시작)
- `SILENT_CANDIDATE`: 5000ms 경과 → `onSilenceDetected()` / level >= -50dB → SPEAKING
- `COOLDOWN`: 이벤트 발생 후 30000ms 무시

expo-av의 `onRecordingStatusUpdate` 콜백에서 `metering` 값 사용.
`isRecording`이 false면 상태 머신 중단.

### `/mobile/hooks/useTranscriptAccumulator.ts`

청크 STT 결과 중복 제거 + 누적.

```typescript
interface UseTranscriptAccumulatorReturn {
  processChunk: (chunkIndex: number, text: string) => void;
}

export function useTranscriptAccumulator(): UseTranscriptAccumulatorReturn
```

ARCHITECTURE.md 청크 오버랩 중복 제거 알고리즘 구현:
1. 이전 청크 텍스트 마지막 20자 추출 → `tail`
2. 현재 청크 텍스트 앞부분에서 `tail` 검색
3. 매치 발견 시 매치 이후 텍스트만 사용
4. 매치 없을 시 전체 텍스트 사용
5. 결과를 `sessionStore.appendSegment({ text, timestamp_s: chunkIndex * 15 })`

### `/mobile/hooks/useWakeLock.ts`

expo-keep-awake 래퍼.

```typescript
export function useWakeLock(active: boolean): void
```

- `active`가 `true`이면 `activateKeepAwakeAsync()` 호출
- `active`가 `false`이면 `deactivateKeepAwake()` 호출
- useEffect dependency: `[active]`
- cleanup: unmount 시 `deactivateKeepAwake()`

### `/mobile/hooks/useConsultation.ts`

상담 세션 오케스트레이터 — 위 4개 훅을 조합한다.

```typescript
interface UseConsultationReturn {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  end: () => Promise<void>;
  status: SessionStore['status'];
}

export function useConsultation(): UseConsultationReturn
```

`start`:
1. `sessionStore.startSession()`
2. `useAudioRecorder.startRecording()`
3. Wake Lock 활성화

`pause`:
1. `sessionStore.pauseSession()`
2. `useAudioRecorder.pauseRecording()`
3. Wake Lock 비활성화

`resume`:
1. `sessionStore.resumeSession()`
2. `useAudioRecorder.resumeRecording()`
3. Wake Lock 활성화

`end`:
1. `useAudioRecorder.stopRecording()`
2. 마지막 청크 STT 완료 대기 (최대 30초)
3. `sessionStore.endSession()`
4. Wake Lock 비활성화

청크 업로드 루프:
- `sessionStore.chunkQueue`를 구독하여 청크가 생기면 `stt.transcribeChunk` 순차 호출
- STT 성공 → `transcriptAccumulator.processChunk()`
- 새 세그먼트 추가 후 코칭 트리거 체크: 새 세그먼트 2개 이상 + 쿨다운 경과 + `!isCoachingInFlight`
- 코칭 트리거 시: `sessionStore.isCoachingInFlight = true` → `coaching.analyzeTranscript()` → 카드 업데이트 → `isCoachingInFlight = false`

### 테스트: `/mobile/__tests__/hooks.test.ts`

모든 외부 모듈을 mock한다:
```typescript
jest.mock('expo-av');
jest.mock('expo-keep-awake');
jest.mock('@/services/stt');
jest.mock('@/services/coaching');
```

테스트 케이스:
- `useTranscriptAccumulator.processChunk`: 이전 텍스트 오버랩 제거 검증
  - 이전 청크 끝 "안녕하세요", 현재 청크 "안녕하세요 반갑습니다" → "반갑습니다"만 추가
  - 오버랩 없음 → 전체 텍스트 추가
- `useSilenceDetector`: 5초 무음 후 `onSilenceDetected` 호출됨 (jest fake timer 사용)
- `useSilenceDetector`: 쿨다운 중 재발생 무시
- `useWakeLock`: active=true → `activateKeepAwakeAsync` 호출, false → `deactivateKeepAwake` 호출

## Acceptance Criteria

```bash
cd mobile
npm test -- --testPathPattern="hooks.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/1-mobile/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "5개 훅 구현: useAudioRecorder(m4a 청크), useSilenceDetector(상태머신), useTranscriptAccumulator(오버랩 제거), useWakeLock, useConsultation(오케스트레이터). hooks.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `useConsultation`에서 STT 요청을 병렬로 보내지 마라. 이유: 순서 보장이 필요하다. 청크는 순차 전송한다 (ARCHITECTURE.md 동시성 섹션).
- `isCoachingInFlight` 체크 없이 `analyzeTranscript`를 호출하지 마라. 이유: 중복 Gemini 요청 방지.
- `useConsultation` 외부에서 `useAudioRecorder`를 직접 사용하지 마라. 이유: 세션 상태와 오디오 상태의 동기화는 useConsultation이 관리한다.
