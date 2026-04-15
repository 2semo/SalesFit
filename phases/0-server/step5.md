# Step 5: server-auth

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — API 스키마(auth 섹션), DB 스키마(users 테이블)
- `/server/types/index.ts`
- `/server/lib/auth.ts`
- `/server/lib/db.ts`
- `/server/lib/apiResponse.ts`
- `/server/lib/withAuth.ts`
- `/server/lib/rateLimit.ts`

## 작업

인증 API 라우트 3개를 구현한다.

### `/server/app/api/auth/register/route.ts`

`POST /api/auth/register`

요청: `{ email, password, name }`
- email 형식 검증 (정규식)
- password 최소 8자 검증
- name 비어있지 않음 검증
- 검증 실패 → `400 { error: 'VALIDATION_ERROR', message: string }`
- 이메일 중복 → `409 { error: 'EMAIL_EXISTS', message: string }`
- 성공 → `200 { token, user: { id, email, name } }`

구현 순서:
1. 입력 검증
2. `db.queryOne`으로 이메일 중복 체크
3. `hashPassword`로 비밀번호 해싱
4. `db.query`로 INSERT
5. `signToken`으로 JWT 생성
6. 응답 반환

Rate limit: IP당 10 req/min.

### `/server/app/api/auth/login/route.ts`

`POST /api/auth/login`

요청: `{ email, password }`
- 유저 없거나 비밀번호 불일치 → `401 { error: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' }`
- 성공 → `200 { token, user }`

보안: 유저 없음과 비밀번호 불일치를 동일한 에러로 처리한다 (사용자 열거 공격 방지).

Rate limit: IP당 10 req/min.

### `/server/app/api/auth/me/route.ts`

`GET /api/auth/me`

`withAuth` HOF로 감싼다.
- 성공 → `200 { user: { id, email, name } }` (password 필드 절대 포함하지 않음)

### 테스트: `/server/__tests__/auth.test.ts`

`lib/db.ts`를 jest mock으로 대체한다 (`jest.mock('@/lib/db')`).

테스트 케이스:
- `POST /register`: 유효한 입력 → 200 + token, 이메일 중복 → 409, 짧은 비밀번호 → 400, 잘못된 이메일 형식 → 400
- `POST /login`: 올바른 자격증명 → 200 + token, 잘못된 비밀번호 → 401, 없는 이메일 → 401
- `GET /me`: 유효한 토큰 → 200 + user, 토큰 없음 → 401

Next.js Route Handler 테스트 방법:
```typescript
import { POST } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';

const req = new NextRequest('http://localhost/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email: 'test@test.com', password: 'password123', name: '테스터' }),
  headers: { 'Content-Type': 'application/json' },
});
const res = await POST(req);
const data = await res.json();
```

## Acceptance Criteria

```bash
cd server
npm test -- --testPathPattern="auth.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/0-server/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "인증 라우트 3개 구현: POST /api/auth/register(검증+중복체크), POST /api/auth/login(자격증명 검증), GET /api/auth/me(withAuth). auth.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `GET /me` 응답에 `password` 필드를 포함하지 마라. 이유: 비밀번호 해시 노출은 보안 취약점.
- DB mock 없이 실제 DB를 호출하는 테스트를 작성하지 마라. 이유: 테스트 환경에 DB가 없다.
- 유저 없음과 비밀번호 불일치를 다른 에러 메시지로 구분하지 마라. 이유: 사용자 열거(enumeration) 공격 방지.
