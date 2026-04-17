# Step 2: audio-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`salesfit/src/services/audioService.ts`를 생성하라. expo-av를 사용해 15초 청크 단위 오디오 녹음을 관리하는 서비스다.

### AudioService 클래스 인터페이스

```typescript
class AudioService {
  // 마이크 사용 권한 요청. 거부 시 false 반환.
  async requestPermissions(): Promise<boolean>

  // 녹음 시작. 15초 후 자동으로 청크를 완성하고 새 녹음 시작.
  // onChunkReady 콜백: 청크 URI가 준비될 때마다 호출됨.
  async startRecording(onChunkReady: (chunkUri: string, chunkIndex: number) => void): Promise<void>

  // 녹음 중지. 마지막 미완성 청크도 onChunkReady로 전달.
  async stopRecording(): Promise<void>

  // 현재 녹음 중인지 여부
  get isRecording(): boolean

  // 경과 시간 (ms)
  get elapsedMs(): number
}

export const audioService = new AudioService();
```

### 구현 요구사항

1. **권한 처리**: `Audio.requestPermissionsAsync()`로 마이크 권한 요청. 거부 시 false 반환.
2. **녹음 모드 설정**: `Audio.setAudioModeAsync`로 iOS/Android 공통 설정:
   - `allowsRecordingIOS: true`
   - `playsInSilentModeIOS: true`
3. **청크 방식**: `CHUNK_DURATION_MS = 15000` (15초). 내부적으로 `setInterval`로 15초마다 현재 녹음을 중지하고, URI를 `onChunkReady`에 전달한 후 새 녹음을 시작한다.
4. **오디오 품질**: `Audio.RecordingOptionsPresets.HIGH_QUALITY` 사용.
5. **에러 처리**: 녹음 도중 에러 발생 시 `isRecording`을 false로 설정하고 에러를 throw하지 않고 console.error로 기록한다. (앱이 크래시하면 안 됨)
6. **엣지 케이스**: `startRecording` 중복 호출 시 무시 (이미 녹음 중이면 아무것도 하지 않음).

### 테스트 파일

`salesfit/src/services/__tests__/audioService.test.ts`도 함께 작성하라:

- `requestPermissions`가 권한 거부 시 false를 반환하는지 테스트
- `startRecording` 중복 호출 시 두 번째 호출이 무시되는지 테스트
- `stopRecording`이 `isRecording`을 false로 만드는지 테스트

expo-av는 mock 처리: `jest.mock('expo-av')`.

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
npx jest src/services/__tests__/audioService.test.ts
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - React import가 없는지 확인 (서비스 레이어는 React에 의존하지 않는다)
   - `EXPO_PUBLIC_GEMINI_API_KEY` 같은 환경변수 참조가 없는지 확인 (오디오 서비스 책임 외)
3. `phases/0-mvp/index.json`의 step 2 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "src/services/audioService.ts 생성. AudioService 클래스 (15초 청크 녹음, 권한 요청, start/stop). 유닛 테스트 3개 통과."`
   - 실패 → 에러/블록 처리

## 금지사항

- React를 import하지 마라. 이유: 서비스 레이어는 React에 의존하지 않아야 한다.
- `CHUNK_DURATION_MS`를 5초 이하로 설정하지 마라. 이유: Gemini API 호출이 너무 잦아진다.
- 녹음 파일을 영구 저장하지 마라. 이유: 오디오 파일은 STT 변환 후 삭제해도 된다. 저장은 storageService 책임이다.
- 기존 테스트를 깨뜨리지 마라.
