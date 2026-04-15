# Step 6: mobile-screens

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 디렉토리 구조(app/ 라우팅), 상태 관리, 네트워크 상태 처리
- `/docs/ADR.md` — ADR-008(Expo Router), ADR-006(JWT)
- `/docs/PRD.md` — 사용자 여정, 핵심 기능 상세(기능 1~6), 에러 케이스 전체
- `/mobile/types/index.ts`
- `/mobile/store/authStore.ts`
- `/mobile/store/sessionStore.ts`
- `/mobile/services/auth.ts`
- `/mobile/services/coaching.ts`
- `/mobile/hooks/useConsultation.ts`
- `/mobile/components/CoachingCard.tsx`
- `/mobile/components/SilenceAlert.tsx`
- `/mobile/components/TranscriptView.tsx`
- `/mobile/components/RecordButton.tsx`
- `/mobile/components/ReviewReport.tsx`
- `/mobile/db/client.ts`
- `/mobile/db/migrate.ts`
- `/mobile/db/repositories/sessionRepository.ts`
- `/mobile/db/repositories/transcriptRepository.ts`
- `/mobile/db/repositories/coachingEventRepository.ts`
- `/mobile/db/repositories/reviewRepository.ts`

## 작업

전체 화면과 Expo Router 레이아웃을 구현한다.
ARCHITECTURE.md의 디렉토리 구조를 정확히 따른다.

### 레이아웃 파일

**`/mobile/app/_layout.tsx`** (루트 레이아웃 — 기존 파일 교체)

```typescript
// QueryClient 초기화, 앱 시작 시 DB 마이그레이션 실행
// authStore.token 확인 → 없으면 /(auth)/login으로 리다이렉트
// NetInfo 리스너 등록 → sessionStore.setOffline()
// <Stack> 또는 <Slot> 렌더링
```

- 앱 시작 시 `runMigrations(db)` 호출
- `@tanstack/react-query`의 `QueryClientProvider` 래핑
- JWT 만료 체크: `authStore.token`이 없으면 `/(auth)/login`으로 이동

**`/mobile/app/(auth)/_layout.tsx`**

인증 화면 레이아웃. 로그인 상태면 `/(main)/`으로 리다이렉트.

**`/mobile/app/(main)/_layout.tsx`**

탭 네비게이터 레이아웃:
- 탭 1: 홈 (`index`) — 아이콘: mic
- 탭 2: 히스토리 (`history/index`) — 아이콘: list
- 탭 3: 설정 (`settings`) — 아이콘: settings
- 다크 배경 (`backgroundColor: '#0F0F1A'`)

### 인증 화면

**`/mobile/app/(auth)/login.tsx`**

PRD 기능 5(로그인) 구현:
- 이메일, 비밀번호 입력 필드
- [로그인] 버튼 → `loginApi()` → `authStore.setAuth()` → `/(main)/`으로 이동
- 오류: "이메일 또는 비밀번호가 올바르지 않습니다" 토스트
- [회원가입] 링크 → `/(auth)/register`

**`/mobile/app/(auth)/register.tsx`**

- 이름, 이메일, 비밀번호 입력
- [회원가입] → `registerApi()` → `setAuth()` → onboarding으로 이동
- 서버 400/409 에러 메시지 표시

**`/mobile/app/(auth)/onboarding.tsx`**

PRD 최초 설치 시나리오:
- 슬라이드 3장 (FlatList 또는 ScrollView + dot indicator):
  1. "상담 시작 전 폰을 테이블에 세워두세요"
  2. "AI가 고객 성향을 파악해 코칭 카드를 보내드려요"
  3. "상담 후 복기 리포트로 실력을 키우세요"
- 마지막 슬라이드 [시작하기] → 마이크 권한 요청 → 허용 시 `/(main)/`, 거부 시 권한 안내 화면

### 메인 화면

**`/mobile/app/(main)/index.tsx`** (홈)

PRD 일반 상담 플로우:
- 상태가 `idle`이면: 큰 "상담 시작" 버튼
- 상태가 `recording`/`paused`이면: 상담 진행 UI
  - `TranscriptView` (화면 상단 2/3)
  - `CoachingCard` (하단 오버레이, `isExpanded` 연동)
  - `SilenceAlert` (코칭 카드 위, 우선순위 높음)
  - `RecordButton` (하단 FAB)
  - 오프라인 배너: `sessionStore.isOffline === true`이면 상단에 "서버 연결 없음 — 코칭 일시 중단" 표시
- 무음 감지: `useSilenceDetector`의 `onSilenceDetected` → `Haptics.impactAsync()` + `analyzeSilence()` → `setSilenceAlert()`

**`/mobile/app/(main)/consultation.tsx`**

상담 종료 → 복기 분석 로딩 화면:
- 순서대로 텍스트 표시 (PRD 기능 4 로딩 순서):
  1. "대화 내용을 정리하고 있어요..." (5초)
  2. "고객 성향을 분석하고 있어요..." (10초)
  3. "잘한 점과 개선할 점을 찾고 있어요..." (20초)
  4. "마무리하고 있어요..." (30초+)
- `generateReview()` 완료 → SQLite 저장 → `/(main)/history/[sessionId]`로 이동
- 60초 타임아웃 → "리포트 생성 실패" + [재시도] 버튼

**`/mobile/app/(main)/settings.tsx`**

PRD 기능 6:
- 계정 섹션: 이름/이메일 표시, [로그아웃] 버튼 → `clearAuth()` → `/(auth)/login`
- 코칭 설정: 무음 감지 임계값 3단계 선택 (-60/-50/-40 dB), 무음 감지 ON/OFF
- 앱 정보: 버전, [온보딩 다시 보기]

### 히스토리 화면

**`/mobile/app/(main)/history/index.tsx`**

PRD 복기 열람 플로우:
- `sessionRepository.findAll(userId)` → 세션 목록
- FlatList로 렌더링: 날짜, 상담 시간, 고객 성향 태그, review_status
- 필터: 이번 주 / 이번 달 / 전체
- 좌 스와이프 → 삭제 확인 팝업 → `sessionRepository.delete()`
- `review_status === 'failed'`인 세션: [리포트 재생성] 버튼 표시
- React Query `useQuery`로 목록 조회 + 캐싱

**`/mobile/app/(main)/history/[sessionId].tsx`**

세션 상세 + 복기 리포트:
- `reviewRepository.findBySession(sessionId)` → `ReviewReport` 컴포넌트
- 리포트 없고 `review_status === 'failed'` → [재생성] 버튼 → `generateReview()` 재호출
- [전체 트랜스크립트 보기] 토글 (기본 닫힘)
- [메모 추가] — 짧은 텍스트 입력 → SQLite sessions 테이블 메모 필드 저장

### DB 연동 (SQLite 저장 순서 준수)

`useConsultation.end()` 호출 시 ARCHITECTURE.md의 저장 순서 준수:
1. `sessions` INSERT
2. `transcripts` BULK INSERT
3. `coaching_events` BULK INSERT
4. `POST /api/coaching/review` 호출
5. `reviews` INSERT

이 로직은 `consultation.tsx` 화면 또는 `useConsultation` 훅에서 처리한다.

### 테스트: `/mobile/__tests__/screens.test.tsx`

store, services, hooks, db를 모두 mock한다.

테스트 케이스:
- `login.tsx`: 이메일/비밀번호 입력 → loginApi 호출됨, 성공 시 navigation
- `index.tsx (홈)`: idle 상태 → "상담 시작" 버튼 표시, recording 상태 → TranscriptView + RecordButton 표시
- `history/index.tsx`: 세션 목록 렌더링

## Acceptance Criteria

```bash
cd mobile
npm test
npx tsc --noEmit
```

전체 모바일 테스트 통과, 타입 에러 없음.

## 검증 절차

1. `cd mobile && npm test && npx tsc --noEmit` 실행한다.
2. `phases/1-mobile/index.json`의 step 6을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "전체 화면 구현: 인증(login/register/onboarding), 메인(home/consultation/settings), 히스토리(index/[sessionId]). Expo Router 레이아웃, DB 연동, React Query 캐싱. 전체 모바일 테스트 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- 화면에서 API 키를 직접 사용하지 마라. 이유: CLAUDE.md CRITICAL 규칙.
- `consultation.tsx` 로딩 화면에서 뒤로 가기를 허용하지 마라. 이유: 복기 분석 중 뒤로 가면 데이터 저장이 중단된다. `gestureEnabled: false` 설정.
- 히스토리 화면에서 삭제 시 확인 팝업 없이 바로 삭제하지 마라. 이유: PRD 명세 — 좌 스와이프 후 삭제 확인 팝업 필수.
- `/(main)/index.tsx`에서 코칭 카드에 "AI" 또는 "인공지능" 텍스트를 표시하지 마라. 이유: PRD 제약 — 고객에게 AI 코칭 사실 비노출.
