# Step 1: server-init

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/package.json` (루트 — 이전 step에서 생성됨)

## 작업

`server/` 디렉토리에 Next.js 15 App Router 프로젝트를 설정한다.
UI 없이 API Routes만 사용하는 서버다 (ADR-004).

### 생성할 파일

**`/server/package.json`**

dependencies:
- `next`: `^15.0.0`
- `react`: `^18.0.0`
- `react-dom`: `^18.0.0`
- `@vercel/postgres`: `^0.10.0`
- `openai`: `^4.0.0`
- `@google/generative-ai`: `^0.21.0`
- `bcryptjs`: `^2.4.3`
- `jsonwebtoken`: `^9.0.0`

devDependencies:
- `typescript`: `^5.0.0`
- `@types/node`: `^20.0.0`
- `@types/react`: `^18.0.0`
- `@types/bcryptjs`: `^2.4.6`
- `@types/jsonwebtoken`: `^9.0.0`
- `eslint`: `^8.0.0`
- `eslint-config-next`: `^15.0.0`
- `jest`: `^29.0.0`
- `jest-environment-jsdom`: `^29.0.0`
- `@types/jest`: `^29.0.0`
- `ts-jest`: `^29.0.0`
- `dotenv`: `^16.0.0`

scripts:
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest --passWithNoTests"
}
```

**`/server/tsconfig.json`**

Next.js 15 표준 tsconfig. strict mode 활성화.
`paths` 설정: `"@/*": ["./*"]`

**`/server/next.config.ts`**

```typescript
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {};
export default nextConfig;
```

**`/server/jest.config.ts`**

- `testEnvironment`: `node`
- `transform`: ts-jest 사용
- `setupFiles`: `['dotenv/config']` — `.env.test` 자동 로드
- `moduleNameMapper`: `{"^@/(.*)$": "<rootDir>/$1"}`
- `testPathPattern`: `**/__tests__/**/*.test.ts`
- dotenv config 설정: `{ path: '.env.test' }`

**`/server/.eslintrc.json`**

```json
{ "extends": ["next/core-web-vitals", "next/typescript"] }
```

**`/server/app/layout.tsx`**

Next.js App Router가 요구하는 최소한의 루트 레이아웃. API 서버이므로 실제 UI 없음.

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body>{children}</body></html>;
}
```

**`/server/app/page.tsx`**

```typescript
export default function Home() {
  return <div>SalesCoach API Server</div>;
}
```

### 디렉토리 구조 확인

완료 후 `server/` 아래 아래 디렉토리가 존재해야 한다:
```
server/
├── app/
│   ├── api/          (빈 디렉토리 — 이후 step에서 채움)
│   ├── layout.tsx
│   └── page.tsx
├── lib/              (빈 디렉토리 — 이후 step에서 채움)
├── types/            (빈 디렉토리 — 이후 step에서 채움)
├── __tests__/        (빈 디렉토리 — 이후 step에서 채움)
├── package.json
├── tsconfig.json
├── next.config.ts
├── jest.config.ts
└── .eslintrc.json
```

## Acceptance Criteria

```bash
cd server
npm install
npm run build
npm test
```

빌드 에러 없음, 테스트 통과 (테스트 파일이 없으므로 `--passWithNoTests`로 통과).

## 검증 절차

1. `cd server && npm install && npm run build && npm test` 실행한다.
2. `phases/0-server/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "server/ Next.js 15 프로젝트 설정 완료: package.json, tsconfig, jest.config, next.config 생성, npm install 및 빌드 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - npm install / 네트워크 문제 → `"status": "blocked"`, `"blocked_reason": "npm install 실패: {에러}"`

## 금지사항

- `src/` 디렉토리 구조를 사용하지 마라. 이유: ARCHITECTURE.md는 `app/`, `lib/`, `types/` 를 server/ 루트 바로 아래에 정의한다.
- UI 페이지를 만들지 마라. 이유: 이 서버는 API Routes 전용이다 (ADR-004). `app/page.tsx`는 Next.js 요구사항상 필요한 최소 파일만.
- `app/api/` 하위에 라우트 파일을 만들지 마라. 이유: 라우트는 이후 step에서 각각 구현한다.
