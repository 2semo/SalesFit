# Step 4: session-screen

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/PRD.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/services/audioService.ts`
- `salesfit/src/services/geminiService.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

상담 진행 화면을 구현하라. 녹음 제어, 실시간 자막, 코칭 팁 표시를 담당한다.

### 1. useConsultation 훅

`salesfit/src/hooks/useConsultation.ts` 생성:

```typescript
interface ConsultationState {
  isRecording: boolean;
  isProcessing: boolean;   // Gemini API 호출 중
  consultation: Consultation | null;
  elapsedMs: number;
  error: string | null;
}

interface ConsultationActions {
  startConsultation: () => Promise<void>;
  stopConsultation: () => Promise<Consultation>;  // report 화면으로 넘길 Consultation 반환
}

function useConsultation(): ConsultationState & ConsultationActions
```

내부 동작:
- `startConsultation`: 권한 요청 → audioService.startRecording 호출 → 청크 콜백에서 geminiService.transcribeAudio + getCoachingTips 호출 → state 업데이트
- `stopConsultation`: audioService.stopRecording → consultation 상태를 completed로 업데이트 → Consultation 반환
- `elapsedMs`: 1초마다 업데이트하는 setInterval 사용 (cleanup 필수)
- useReducer로 상태 관리

### 2. SessionScreen

`salesfit/src/screens/SessionScreen.tsx` 생성:

**레이아웃 (다크 테마 #121212 배경)**:

```
┌─────────────────────────────┐
│  ● 녹음 중  00:03:42         │  ← 상단 상태바 (빨간 점 애니메이션 + 타이머)
├─────────────────────────────┤
│                             │
│  [실시간 자막 스크롤 영역]    │  ← 대화 텍스트 누적 표시 (자동 스크롤)
│  ...                        │
│                             │
├─────────────────────────────┤
│  💡 AI 코칭                  │  ← 코칭 팁 패널 (최신 3개만 표시)
│  ┌───────────────────────┐  │
│  │ 고객 니즈 파악 기회     │  │
│  │ 냉장고 용량 니즈 확인   │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│      [ 상담 종료 ]           │  ← 종료 버튼 (빨간 배경)
└─────────────────────────────┘
```

**동작**:
- 화면 진입 즉시 상담 시작 (마이크 권한 없으면 Alert 표시 후 뒤로 이동)
- 코칭 팁: 최신 3개만 표시. 새 팁 추가 시 위에서 슬라이드 인 애니메이션
- "상담 종료" 버튼 탭 → `stopConsultation()` → `router.push('/report', { consultation })` 형태로 이동
- 처리 중 상태(`isProcessing`)일 때 자막 영역에 로딩 인디케이터 표시

### 3. CoachingCard 컴포넌트

`salesfit/src/components/CoachingCard.tsx` 생성:

```typescript
interface CoachingCardProps {
  message: CoachingMessage;
}
```

- `type`에 따라 아이콘/색상 다름: needs(🎯 파랑), product(📦 초록), closing(🤝 주황), improvement(💡 노랑)
- 카드 배경: #1E1E1E, 테두리: type별 포인트 색상

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
npx jest src/hooks/__tests__/useConsultation.test.ts   # 테스트 파일도 함께 작성
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - SessionScreen이 geminiService/audioService를 직접 import하지 않고 useConsultation 훅을 통해서만 사용하는지 확인
   - CLAUDE.md CRITICAL 규칙 ("화면 컴포넌트에서 직접 API 호출 금지") 위반 없는지 확인
3. `phases/0-mvp/index.json`의 step 4 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "useConsultation 훅, SessionScreen, CoachingCard 컴포넌트 생성. 녹음 제어, 실시간 자막, 코칭 팁 표시 구현."`
   - 실패 → 에러/블록 처리

## 금지사항

- SessionScreen에서 geminiService나 audioService를 직접 import하지 마라. 이유: 비즈니스 로직은 훅에 집중해야 한다.
- 코칭 팁을 무제한으로 누적 표시하지 마라. 이유: 화면이 넘쳐 현재 팁을 못 본다. 최신 3개만 표시한다.
- 기존 테스트를 깨뜨리지 마라.
