# Step 4: server-middleware

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 보안 섹션, axios 인터셉터 구조
- `/server/types/index.ts`
- `/server/lib/auth.ts`
- `/server/.env.test`

## 작업

Next.js 미들웨어와 API 라우트에서 공통으로 사용하는 인증/CORS 헬퍼를 구현한다.

### `/server/middleware.ts`

Next.js App Router 미들웨어. CORS 처리 담당.

- `ALLOWED_ORIGINS` 환경변수에 명시된 출처만 허용. 값이 없으면 개발 편의상 `*` 허용.
- preflight(`OPTIONS`) 요청에 적절한 헤더로 응답.
- `matcher`: `/api/:path*` — API 라우트에만 적용.

### `/server/lib/withAuth.ts`

API Route Handler를 감싸는 인증 HOF(Higher-Order Function).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { JwtPayload } from '@/types';

type AuthedHandler = (
  req: NextRequest,
  ctx: { params?: Record<string, string>; user: JwtPayload }
) => Promise<NextResponse>;

export function withAuth(handler: AuthedHandler): (req: NextRequest, ctx: unknown) => Promise<NextResponse>
```

동작:
1. `Authorization: Bearer {token}` 헤더 추출.
2. `verifyToken(token)` 호출. 실패 시 `401 { error: 'UNAUTHORIZED', message: '인증이 필요합니다' }` 반환.
3. 성공 시 `handler(req, { ...ctx, user: payload })` 호출.

### `/server/lib/apiResponse.ts`

일관된 API 응답 헬퍼.

```typescript
export function ok<T>(data: T, status?: number): NextResponse
export function error(code: string, message: string, status: number): NextResponse
```

- `error`는 항상 `{ error: string; message: string }` 형태 반환 (ARCHITECTURE.md API 스키마).

### 테스트: `/server/__tests__/middleware.test.ts`

- `withAuth`: 유효한 토큰 → handler 호출됨, 토큰 없음 → 401, 잘못된 토큰 → 401
- `apiResponse`: `ok(data)` → 200 JSON, `error(...)` → 지정 status + JSON 형태

## Acceptance Criteria

```bash
cd server
npm test -- --testPathPattern="middleware.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/0-server/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "server/middleware.ts(CORS), lib/withAuth.ts(JWT HOF), lib/apiResponse.ts(응답 헬퍼) 구현. middleware.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `middleware.ts`에서 DB 조회를 하지 마라. 이유: Next.js middleware는 Edge Runtime에서 실행되며, DB 클라이언트를 사용할 수 없다. JWT 검증만 수행한다.
- `withAuth`에서 직접 응답을 반환하는 대신 handler를 호출하지 않는 방식으로 설계하지 마라. 이유: HOF 패턴을 유지해야 각 라우트에서 일관성 있게 사용할 수 있다.
