# Step 2: supabase-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/lib/supabase.ts`
- `salesfit/src/services/storageService.ts`
- `salesfit/src/services/authService.ts`
- `salesfit/src/hooks/useConsultation.ts`

## 작업

AsyncStorage 기반 storageService를 Supabase로 교체하라. 기존 인터페이스를 유지해 다른 파일 변경을 최소화한다.

### 1. storageService.ts 교체

`salesfit/src/services/storageService.ts`를 Supabase 기반으로 재작성:

```typescript
// 상담 저장 (consultations + consultation_reports 테이블)
async function saveConsultation(consultation: Consultation): Promise<void>

// 내 상담 목록 조회 (최신순, StoredConsultation 형태)
async function getConsultations(): Promise<StoredConsultation[]>

// 상담 상세 조회
async function getConsultationById(id: string): Promise<Consultation | null>

// 상담 삭제
async function deleteConsultation(id: string): Promise<void>
```

구현 요구사항:
- `saveConsultation`: `consultations` 테이블에 저장 후, report가 있으면 `consultation_reports`에도 저장
- `getConsultations`: 현재 로그인 사용자의 상담만 조회 (RLS가 자동 필터링)
- `overall_score`: `(customerNeedsScore + productExplanationScore + closingTimingScore) / 3` 계산
- 저장/조회 실패 시 console.error 후 빈 배열/null 반환 (앱 크래시 방지)
- AsyncStorage import 완전 제거

### 2. ReportScreen 업데이트

`salesfit/src/screens/ReportScreen.tsx`에서:
- 리포트 생성 완료 시 `storageService.saveConsultation` 호출 (기존과 동일하게 유지)
- 변경 없이 동작해야 함 (인터페이스 유지 덕분)

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - `@react-native-async-storage/async-storage` import가 storageService에서 완전 제거됐는지 확인
   - supabase 클라이언트가 `src/lib/supabase.ts`에서만 import되는지 확인
3. Supabase 대시보드 → Table Editor에서 저장된 데이터 확인 가능한지 검증
4. `phases/1-admin-dashboard/index.json`의 step 2 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "storageService를 Supabase 기반으로 교체. consultations + consultation_reports 테이블 저장/조회. 기존 인터페이스 유지로 다른 파일 변경 없음."`

## 금지사항

- storageService의 함수 시그니처를 변경하지 마라. 이유: ReportScreen, HomeScreen이 이 인터페이스에 의존한다.
- AsyncStorage를 완전히 제거하라. 이유: 두 저장소를 동시에 사용하면 데이터 불일치가 발생한다.
- 기존 테스트를 깨뜨리지 마라.
