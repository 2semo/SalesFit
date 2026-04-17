# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/PRD.md`
- `/CLAUDE.md`

## 작업

현재 디렉토리(`/Users/gim-ilgug/claude code/SalesFit`)에 Expo 모바일 앱 프로젝트를 초기화하라.

### 1. Expo 프로젝트 생성

```bash
npx create-expo-app@latest salesfit --template blank-typescript
cd salesfit
```

생성된 `salesfit/` 디렉토리가 프로젝트 루트가 된다. 이후 모든 작업은 이 디렉토리 안에서 진행한다.

### 2. 의존성 설치

```bash
npx expo install expo-av expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install @react-native-async-storage/async-storage
npm install @google/generative-ai
npm install --save-dev jest @types/jest jest-expo
```

### 3. 폴더 구조 생성

아래 디렉토리를 생성하라 (파일은 이후 step에서 채운다):

```
salesfit/
├── app/
│   └── _layout.tsx       # Expo Router 루트 레이아웃 (빈 스켈레톤)
├── src/
│   ├── screens/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── types/
```

### 4. 환경변수 파일

`.env.example` 파일 생성:
```
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

`.env` 파일은 생성하지 않는다 (사용자가 직접 만들도록 `.gitignore`에 `.env` 추가).

### 5. app.json 수정

`app.json`의 `expo.plugins`에 오디오 녹음 권한을 추가하라:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "상담 내용을 녹음하기 위해 마이크 접근이 필요합니다."
        }
      ]
    ]
  }
}
```

### 6. tsconfig.json

`strict: true`가 활성화되어 있는지 확인하고, `paths` 별칭을 추가하라:

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 7. jest.config.js

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: [],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx']
}
```

### 8. app/_layout.tsx 스켈레톤

Expo Router의 루트 레이아웃 파일을 생성하라 (내용은 step 6에서 완성):

```tsx
import { Stack } from 'expo-router';
export default function RootLayout() {
  return <Stack />;
}
```

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit      # 타입 에러 없음
npx expo export --platform ios --platform android   # 빌드 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `src/` 하위 5개 디렉토리 (screens, components, services, hooks, types) 존재 확인
   - `.env.example` 파일 존재 확인
   - `.gitignore`에 `.env` 포함 확인
3. 결과에 따라 `phases/0-mvp/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Expo TypeScript 프로젝트 초기화 완료. salesfit/ 디렉토리, src/ 구조, expo-av/Gemini 의존성, 환경변수 템플릿 생성."`
   - 수정 3회 실패 → `"status": "error"`, `"error_message": "구체적 에러"`
   - 외부 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"`

## 금지사항

- `.env` 파일을 직접 생성하지 마라. API 키는 사용자가 직접 입력해야 한다.
- `salesfit/` 외부 디렉토리를 수정하지 마라. 이유: 상위 디렉토리에 다른 프로젝트가 있을 수 있다.
- 기존 테스트를 깨뜨리지 마라.
