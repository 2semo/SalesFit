# Step 1: auth-flow

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/lib/supabase.ts`
- `salesfit/app/_layout.tsx`
- `salesfit/src/screens/HomeScreen.tsx`

## 작업

### 1. 타입 추가

`salesfit/src/types/index.ts`에 추가:

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'consultant' | 'admin';
  createdAt: string;
}
```

### 2. AuthService

`salesfit/src/services/authService.ts` 생성:

```typescript
// 이메일/비밀번호 로그인
async function signIn(email: string, password: string): Promise<UserProfile>

// 로그아웃
async function signOut(): Promise<void>

// 현재 로그인된 사용자 프로필 조회
async function getCurrentUser(): Promise<UserProfile | null>
```

- `supabase.auth.signInWithPassword` 사용
- 로그인 성공 시 `profiles` 테이블에서 role 포함 프로필 조회 후 반환
- 실패 시 에러 메시지 throw (한국어: "이메일 또는 비밀번호가 올바르지 않습니다.")

### 3. LoginScreen

`salesfit/src/screens/LoginScreen.tsx` 생성:

**레이아웃 (다크 테마)**:
```
┌─────────────────────────────┐
│                             │
│   Lotte Himart SalesFit     │  ← 앱 타이틀
│   AI 영업 코치              │
│                             │
│   [이메일 입력]             │
│   [비밀번호 입력]           │
│                             │
│   [ 로그인 ]                │  ← 파란색 버튼
│                             │
│   에러 메시지 표시          │
└─────────────────────────────┘
```

- 로그인 성공 시:
  - role === 'admin' → `/admin` 으로 이동
  - role === 'consultant' → `/` (홈) 으로 이동
- 로딩 중 버튼 비활성화

### 4. app/_layout.tsx 업데이트

앱 시작 시 인증 상태 확인:
- 로그인 안 된 상태 → `/login` 으로 리다이렉트
- 로그인 된 상태 → 기존 플로우 유지

`salesfit/app/login.tsx` 추가:
```typescript
import LoginScreen from '@/screens/LoginScreen';
export default LoginScreen;
```

Stack에 login 라우트 추가. 헤더 숨김 처리.

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit
```

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - LoginScreen이 authService를 직접 import하는지 확인 (훅 불필요, 단순 화면)
   - 비밀번호 필드에 `secureTextEntry` 적용되어 있는지 확인
3. `phases/1-admin-dashboard/index.json`의 step 1 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "authService (signIn/signOut/getCurrentUser), LoginScreen, app/login.tsx 생성. 로그인 후 role 기반 라우팅 (consultant→홈, admin→/admin) 구현."`

## 금지사항

- 비밀번호를 AsyncStorage나 로컬에 저장하지 마라. 이유: 보안 위협. Supabase 세션이 자동 관리한다.
- 관리자 role 체크를 클라이언트에서만 하지 마라. 이유: RLS가 서버에서 강제한다.
- 기존 테스트를 깨뜨리지 마라.
