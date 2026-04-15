# Step 5: mobile-components

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 상태 관리(sessionStore 인터페이스), 성능 고려사항
- `/docs/PRD.md` — 핵심 기능 상세(코칭 카드 UX, 무음 카드, 복기 리포트), 물리적 폰 사용 시나리오
- `/docs/UI_GUIDE.md` (있으면)
- `/mobile/types/index.ts`
- `/mobile/store/sessionStore.ts`
- `/mobile/store/authStore.ts`

## 작업

UI 컴포넌트 5개를 구현한다.
모든 컴포넌트는 NativeWind(Tailwind 클래스)로 스타일링한다.
다크 모드 전용 (PRD 제약사항 — 라이트 모드 미지원).

### `/mobile/components/CoachingCard.tsx`

실시간 코칭 카드. 화면 하단 1/4에 표시.

PRD의 코칭 카드 UX 핵심 설계 구현:
- **접힌 상태(기본)**: 고객 성향 태그 + 핵심 키워드(coachingMessage 앞 10자) + 상향 화살표 아이콘
- **펼친 상태(탭 후)**: 전체 coachingMessage + actions 1~2개

```typescript
interface CoachingCardProps {
  card: CoachingCard;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onDismiss: () => void;
}
export function CoachingCard({ card, isExpanded, onExpand, onCollapse, onDismiss }: CoachingCardProps)
```

- 슬라이드업 애니메이션: `Animated.spring` 또는 `react-native-reanimated`
- 위로 스와이프 → `onDismiss`
- 고객 성향별 이모지 표시 (PRD 5종 분류)
- 배경색: `bg-surface` (화면과 동화되어 고객이 식별하기 어렵게)
- 고객이 봐도 "AI 코칭 중"임을 알 수 없는 중립적 UI

### `/mobile/components/SilenceAlert.tsx`

무음 감지 소구 포인트 카드.

```typescript
interface SilenceAlertProps {
  points: SilencePoint[];
  onDismiss: () => void;
}
export function SilenceAlert({ points, onDismiss }: SilenceAlertProps)
```

- 오렌지 테두리 (`border-orange-400`)
- 소구 포인트 3개를 번호 목록으로 표시
- 탭 → `onDismiss`
- 진동은 이 컴포넌트가 아닌 상위에서 처리

### `/mobile/components/TranscriptView.tsx`

실시간 자막 스크롤뷰.

```typescript
interface TranscriptViewProps {
  segments: TranscriptSegment[];
}
export function TranscriptView({ segments }: TranscriptViewProps)
```

- `FlatList` + 가상화로 최대 50개만 렌더링 (ARCHITECTURE.md 메모리 관리)
- 새 세그먼트 추가 시 자동 스크롤 맨 아래
- 작은 글씨(`text-xs`), 낮은 불투명도 (`opacity-50`) — 고객이 봐도 괜찮은 수준
- `[일시정지]`, `[인식 불가 구간]` 텍스트는 이탤릭 처리

### `/mobile/components/RecordButton.tsx`

녹음 FAB(Floating Action Button).

```typescript
type RecordButtonStatus = 'idle' | 'recording' | 'paused' | 'processing';

interface RecordButtonProps {
  status: RecordButtonStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}
export function RecordButton({ status, onStart, onPause, onResume, onEnd }: RecordButtonProps)
```

상태별 UI:
- `idle`: 파란 원 버튼 "상담 시작"
- `recording`: 빨간 원(녹음 중 표시) + 일시정지 버튼 + 종료 버튼
- `paused`: 회색 + 재개 버튼 + 종료 버튼
- `processing`: 스피너 (비활성화)

### `/mobile/components/ReviewReport.tsx`

복기 리포트 렌더러.

```typescript
interface ReviewReportProps {
  report: ReviewReport;
  sessionDuration: number;
}
export function ReviewReport({ report, sessionDuration }: ReviewReportProps)
```

PRD의 리포트 구성 구현:
- 상담 요약 헤더 (총 시간, 고객 성향, 주요 카테고리)
- 잘한 점 카드 (초록 테두리, `border-green-500`) — quote 있으면 인용구 표시
- 아쉬운 점 카드 (빨간 테두리, `border-red-500`) — situation 있으면 상황 표시
- 개선 액션 3개 (파란 테두리, `border-blue-500`)
- `ScrollView`로 스크롤 가능

### 테스트: `/mobile/__tests__/components.test.tsx`

`@testing-library/react-native` 사용.
expo-av, expo-keep-awake 등 네이티브 모듈 mock.

테스트 케이스:
- `CoachingCard`: 접힌 상태 렌더링, 탭 후 펼쳐짐, 고객 성향 이모지 표시
- `SilenceAlert`: 3개 소구 포인트 렌더링, 탭 시 onDismiss 호출
- `TranscriptView`: segments 렌더링, 50개 초과 시 최근 50개만 표시
- `RecordButton`: 각 status별 올바른 버튼 렌더링
- `ReviewReport`: 잘한 점/아쉬운 점/액션 렌더링

## Acceptance Criteria

```bash
cd mobile
npm test -- --testPathPattern="components.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/1-mobile/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "UI 컴포넌트 5개 구현: CoachingCard(슬라이드업+접힘/펼침), SilenceAlert(오렌지), TranscriptView(FlatList 50개 제한), RecordButton(4상태), ReviewReport(강점/약점/액션). components.test.tsx 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `CoachingCard`에 "AI 코칭", "AI가 분석 중" 같은 텍스트를 표시하지 마라. 이유: PRD 제약사항 — 고객에게 AI 코칭 사용 사실이 노출되면 안 된다.
- `TranscriptView`에서 `FlatList` 대신 `ScrollView` + map을 사용하지 마라. 이유: 장시간 상담 시 수백 개의 세그먼트가 누적되면 메모리/성능 문제가 발생한다.
- 컴포넌트 내부에서 store를 직접 import하지 마라. 이유: props로 데이터를 받아야 테스트가 용이하다. store 연결은 화면(screen) 레이어에서 한다.
