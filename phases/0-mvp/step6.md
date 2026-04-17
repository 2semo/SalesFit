# Step 6: home-navigation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/PRD.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/services/storageService.ts`
- `salesfit/src/screens/SessionScreen.tsx`
- `salesfit/src/screens/ReportScreen.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

홈 화면, 네비게이션 설정, 상담 이력 목록을 구현하라. 앱의 진입점이다.

### 1. Expo Router 레이아웃 완성

`salesfit/app/_layout.tsx` 업데이트:

```typescript
// 다크 테마 적용, Stack 네비게이터 설정
// 화면 목록: index(홈), session(상담), report(리포트)
// 헤더: 기본 숨김, 각 화면에서 개별 설정
```

`salesfit/app/index.tsx`:
```typescript
import HomeScreen from '@/screens/HomeScreen';
export default HomeScreen;
```

`salesfit/app/session.tsx`:
```typescript
import SessionScreen from '@/screens/SessionScreen';
export default SessionScreen;
```

`salesfit/app/report.tsx`:
```typescript
import ReportScreen from '@/screens/ReportScreen';
export default ReportScreen;
```

### 2. HomeScreen

`salesfit/src/screens/HomeScreen.tsx` 생성:

**레이아웃**:

```
┌─────────────────────────────┐
│                             │
│  SalesFit                   │  ← 앱 타이틀
│  가전제품 상담 AI 코치        │  ← 서브타이틀
│                             │
│  ┌───────────────────────┐  │
│  │    상담 시작하기  🎙    │  │  ← 메인 CTA 버튼 (파란색 #4A9EFF)
│  └───────────────────────┘  │
│                             │
│  최근 상담 이력              │  ← 섹션 헤더
│  ┌───────────────────────┐  │
│  │ 2026.04.17  15:32     │  │  ← ConsultationHistoryItem
│  │ 상담 시간: 12분 34초   │  │
│  │ 종합 점수: 78점  →    │  │
│  └───────────────────────┘  │
│  ...                        │
└─────────────────────────────┘
```

**동작**:
- `useFocusEffect`로 화면 포커스될 때마다 이력 목록 새로고침 (상담 완료 후 돌아왔을 때 반영)
- "상담 시작하기" → `router.push('/session')`
- 이력 아이템 탭 → `router.push('/report', { consultationId })`
- 이력 없을 때: "아직 상담 이력이 없습니다" 빈 상태 메시지

### 3. ConsultationHistoryItem 컴포넌트

`salesfit/src/components/ConsultationHistoryItem.tsx` 생성:

```typescript
interface ConsultationHistoryItemProps {
  item: StoredConsultation;
  onPress: () => void;
}
```

- 날짜/시간, 상담 시간, 종합 점수 표시
- 점수 색상: 80이상 초록, 60~79 주황, 59이하 빨강 (ReportScreen과 동일 규칙)

### 4. 전체 앱 다크 테마 설정

`salesfit/app/_layout.tsx`에서 `StatusBar`를 `light-content`로 설정하고, `Stack.Screen` 기본 옵션으로 아래 헤더 스타일 적용:

```typescript
screenOptions={{
  headerStyle: { backgroundColor: '#121212' },
  headerTintColor: '#FFFFFF',
  contentStyle: { backgroundColor: '#121212' },
}}
```

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
npx expo export --platform ios --platform android   # 빌드 에러 없음
npx jest                                             # 전체 테스트 통과
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - `app/` 라우트 파일들이 화면 컴포넌트를 단순 re-export만 하는지 확인
   - `useFocusEffect` cleanup이 제대로 등록되어 있는지 확인 (메모리 누수 방지)
   - 전체 타입 에러 0개 확인
3. `phases/0-mvp/index.json`의 step 6 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "HomeScreen, ConsultationHistoryItem 생성. Expo Router 네비게이션 (홈→상담→리포트) 완성. 다크 테마 전체 적용. 전체 테스트 통과."`
   - 실패 → 에러/블록 처리

## 금지사항

- `app/` 파일에 UI 로직을 넣지 마라. 이유: 라우트 파일은 화면 컴포넌트를 연결하는 역할만 한다.
- 이력 목록을 컴포넌트 mount 시 한 번만 로드하지 마라. 이유: 상담 완료 후 홈으로 돌아왔을 때 목록이 갱신되지 않는다. `useFocusEffect`를 사용하라.
- 기존 테스트를 깨뜨리지 마라.
