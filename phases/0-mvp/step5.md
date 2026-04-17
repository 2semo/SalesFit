# Step 5: report-screen

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/services/geminiService.ts`
- `salesfit/src/screens/SessionScreen.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

상담 종료 후 복기 리포트 화면을 구현하라. SessionScreen에서 전달받은 Consultation 데이터로 리포트를 생성하고 표시한다.

### 1. storageService

`salesfit/src/services/storageService.ts` 생성:

```typescript
// AsyncStorage 키 상수
const CONSULTATIONS_KEY = 'salesfit_consultations';

async function saveConsultation(consultation: Consultation): Promise<void>
async function getConsultations(): Promise<StoredConsultation[]>
async function getConsultationById(id: string): Promise<Consultation | null>
async function deleteConsultation(id: string): Promise<void>
```

- `saveConsultation`: Consultation 전체를 저장하고, StoredConsultation 요약도 별도 목록에 추가
- `getConsultations`: StoredConsultation[] 반환 (목록 표시용, 최신순 정렬)
- 저장 실패 시 console.error 후 throw하지 않음

### 2. ReportScreen

`salesfit/src/screens/ReportScreen.tsx` 생성:

**데이터 수신**: Expo Router의 `useLocalSearchParams`로 `consultationId`를 받아 storageService에서 로드. 또는 navigation params로 Consultation 객체 직접 전달 (구현 편의에 따라 선택).

**화면 구성 (스크롤 가능)**:

```
┌─────────────────────────────┐
│  ← 뒤로    상담 리포트        │  ← 헤더
│  2026.04.17  |  00:15:32    │  ← 날짜 + 상담 시간
├─────────────────────────────┤
│  종합 점수: 78점             │  ← 3개 score 평균, 원형 게이지
├─────────────────────────────┤
│  🎯 고객 니즈 파악  85점     │  ← Section 1
│  [분석 텍스트]              │
│  추천 멘트:                 │
│  • "..."                   │
│  • "..."                   │
├─────────────────────────────┤
│  📦 제품 설명 명확도  70점   │  ← Section 2
│  [피드백 텍스트]            │
├─────────────────────────────┤
│  🤝 클로징 타이밍  75점      │  ← Section 3
│  [피드백 텍스트]            │
├─────────────────────────────┤
│  💡 이렇게 해보세요          │  ← Section 4 (아쉬운점+개선제안)
│  아쉬운 점:                 │
│  • "..."                   │
│  개선 제안:                 │
│  • "..."                   │
└─────────────────────────────┘
```

**동작**:
- 화면 진입 시 `geminiService.generateReport` 호출 (로딩 스피너 표시)
- 리포트 생성 완료 시 화면 표시 + `storageService.saveConsultation` 자동 저장
- 각 Section은 `ReportSection` 컴포넌트로 분리
- 점수 표시: 80이상 초록, 60~79 주황, 59이하 빨강

### 3. ReportSection 컴포넌트

`salesfit/src/components/ReportSection.tsx` 생성:

```typescript
interface ReportSectionProps {
  icon: string;
  title: string;
  score?: number;         // 없는 경우도 있음 (Section 4)
  children: React.ReactNode;
}
```

- 섹션 카드 스타일: #1E1E1E 배경, 16px 패딩, 12px 라운드

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
npx jest src/services/__tests__/storageService.test.ts   # storageService 테스트도 작성
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - ReportScreen이 geminiService를 직접 호출하지 않고 있는지 (geminiService 호출은 허용 — report는 이 화면에서만 생성)
   - storageService가 React에 의존하지 않는지 확인
3. `phases/0-mvp/index.json`의 step 5 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "storageService, ReportScreen, ReportSection 컴포넌트 생성. 4개 항목 리포트 표시, AsyncStorage 저장, 점수별 색상 처리."`
   - 실패 → 에러/블록 처리

## 금지사항

- 리포트 생성 실패 시 빈 화면을 보여주지 마라. 이유: 사용자 경험 파괴. 에러 메시지 + "다시 시도" 버튼을 표시하라.
- AsyncStorage 저장 실패가 앱을 크래시시키지 않도록 하라. 이유: 저장 실패해도 리포트는 볼 수 있어야 한다.
- 기존 테스트를 깨뜨리지 마라.
