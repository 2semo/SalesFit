# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`

## 작업

모노레포 루트 구조를 설정한다. `mobile/`과 `server/` 두 워크스페이스를 가진 npm workspaces 기반 모노레포다.

### 생성할 파일

**`/package.json`** (루트)
```json
{
  "name": "salescoach",
  "private": true,
  "workspaces": ["mobile", "server"]
}
```

**`/.gitignore`**
아래 항목을 포함한다:
- `node_modules/`
- `.env.local`, `.env.*.local`, `.env`
- `server/.next/`
- `mobile/.expo/`
- `mobile/android/`, `mobile/ios/`
- `*.log`
- `.DS_Store`
- `coverage/`
- `phases/**/*-output.json`

**`/server/.env.local`** (템플릿 — 실제 값 없이 키 이름만)
```
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=
```

**`/server/.env.test`** (테스트 전용 환경변수)
```
OPENAI_API_KEY=test-openai-key
GOOGLE_GENERATIVE_AI_API_KEY=test-gemini-key
JWT_SECRET=test-jwt-secret-minimum-32-characters-long
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
POSTGRES_URL=mock
POSTGRES_URL_NON_POOLING=mock
```

**`/mobile/constants/config.ts`** 는 이 step에서 만들지 않는다. mobile-foundation step에서 생성한다.

## Acceptance Criteria

```bash
# 루트에서 실행
ls package.json
ls server/.env.local
ls server/.env.test
cat .gitignore | grep "node_modules"
```

모두 존재하면 통과.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `.gitignore`에 `.env.local`이 포함되어 있는지 확인한다.
3. `phases/0-server/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "모노레포 루트 구조 설정: package.json(workspaces), .gitignore, server/.env.local 템플릿, server/.env.test 생성"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `server/.env.local`에 실제 API 키 값을 넣지 마라. 이유: 보안 — 템플릿 파일은 git에 커밋되므로 값이 비어 있어야 한다.
- `node_modules`를 설치하지 마라. 이유: 이 step은 구조 설정만 한다. 의존성 설치는 server-init step에서 한다.
- 기존 `scripts/` 디렉토리와 `.claude/` 디렉토리를 수정하지 마라.
