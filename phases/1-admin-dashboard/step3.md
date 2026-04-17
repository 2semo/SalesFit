# Step 3: admin-dashboard

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/lib/supabase.ts`
- `salesfit/src/services/authService.ts`
- `salesfit/src/screens/ReportScreen.tsx`

## 작업

관리자 전용 대시보드 화면을 구현하라. 모든 상담원의 상담 데이터를 조회하고 분석한다.

### 1. AdminService

`salesfit/src/services/adminService.ts` 생성:

```typescript
interface ConsultantSummary {
  userId: string;
  name: string;
  email: string;
  totalConsultations: number;
  avgScore: number;
  avgNeedsScore: number;
  avgProductScore: number;
  avgClosingScore: number;
  lastConsultationAt: string | null;
}

// 전체 상담원 요약 통계
async function getConsultantSummaries(): Promise<ConsultantSummary[]>

// 특정 상담원의 상담 목록
async function getConsultationsByUser(userId: string): Promise<StoredConsultation[]>

// 특정 상담의 리포트 상세
async function getReportDetail(consultationId: string): Promise<ReviewReport | null>
```

- 관리자 계정으로만 호출 가능 (RLS가 서버에서 강제)
- `profiles` JOIN `consultations` JOIN `consultation_reports` 쿼리

### 2. AdminDashboardScreen

`salesfit/src/screens/AdminDashboardScreen.tsx` 생성:

**레이아웃 (다크 테마, 스크롤 가능)**:

```
┌─────────────────────────────┐
│  관리자 대시보드   [로그아웃] │  ← 헤더
├─────────────────────────────┤
│  전체 현황                  │
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │총상담 │ │평균  │ │상담원││  ← 요약 카드 3개
│  │  42  │ │ 78점 │ │  5명 ││
│  └──────┘ └──────┘ └──────┘│
├─────────────────────────────┤
│  상담원별 현황               │
│  ┌───────────────────────┐  │
│  │ 김영업   12건  82점 → │  │  ← ConsultantRow
│  │ 이판매    8건  75점 → │  │
│  │ 박상담    6건  71점 → │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**상담원 클릭 시** → ConsultantDetailScreen으로 이동

### 3. ConsultantDetailScreen

`salesfit/src/screens/ConsultantDetailScreen.tsx` 생성:

- 특정 상담원의 상담 이력 목록
- 각 상담 클릭 → 기존 ReportScreen 재사용 (reportData를 params로 전달)
- 4개 항목 평균 점수 막대 차트 (간단한 View width % 방식)

### 4. 라우트 추가

`salesfit/app/admin.tsx`:
```typescript
import AdminDashboardScreen from '@/screens/AdminDashboardScreen';
export default AdminDashboardScreen;
```

`salesfit/app/admin-detail.tsx`:
```typescript
import ConsultantDetailScreen from '@/screens/ConsultantDetailScreen';
export default ConsultantDetailScreen;
```

`salesfit/app/_layout.tsx`에 admin, admin-detail 라우트 추가.

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
npx expo export --platform web   # 빌드 에러 없음
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - admin 라우트가 consultant role 사용자에게 노출되지 않는지 확인 (LoginScreen에서 role 기반 라우팅)
   - AdminDashboardScreen이 adminService만 사용하는지 확인
3. `phases/1-admin-dashboard/index.json`의 step 3 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "adminService, AdminDashboardScreen, ConsultantDetailScreen 생성. 관리자 대시보드 (전체현황, 상담원별통계, 리포트열람) 구현. app/admin.tsx, app/admin-detail.tsx 라우트 추가."`

## 금지사항

- AdminDashboardScreen에서 supabase 클라이언트를 직접 import하지 마라. 이유: 모든 DB 접근은 서비스 레이어를 통해야 한다.
- 관리자 화면을 consultant에게 노출하지 마라. 이유: role 기반 접근 제어가 핵심이다.
- 기존 테스트를 깨뜨리지 마라.
