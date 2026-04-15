# Step 0: mobile-init

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 백그라운드 오디오, Wake Lock 섹션
- `/docs/ADR.md` — ADR-001(Expo Managed), ADR-008(Expo Router), ADR-011(NativeWind), ADR-017(백그라운드 오디오)
- `/package.json` (루트 — workspaces 확인)

## 작업

`mobile/` 디렉토리에 Expo SDK 52 프로젝트를 설정한다.
`npx create-expo-app`을 사용하지 말고 파일을 직접 생성한다 — interactive prompt가 없어야 하기 때문이다.

### `/mobile/package.json`

dependencies:
- `expo`: `~52.0.0`
- `expo-router`: `~4.0.0`
- `react`: `18.3.1`
- `react-native`: `0.76.5`
- `nativewind`: `^4.0.1`
- `tailwindcss`: `^3.4.0`
- `zustand`: `^5.0.0`
- `@tanstack/react-query`: `^5.0.0`
- `axios`: `^1.7.0`
- `expo-sqlite`: `~15.0.0`
- `expo-av`: `~15.0.0`
- `expo-secure-store`: `~14.0.0`
- `expo-keep-awake`: `~14.0.0`
- `expo-status-bar`: `~2.0.0`
- `@react-native-community/netinfo`: `^11.0.0`
- `react-native-safe-area-context`: `4.12.0`
- `react-native-screens`: `~4.3.0`

devDependencies:
- `typescript`: `^5.3.0`
- `@types/react`: `~18.3.0`
- `jest`: `^29.0.0`
- `jest-expo`: `~52.0.0`
- `@testing-library/react-native`: `^12.0.0`
- `@types/jest`: `^29.0.0`
- `babel-jest`: `^29.0.0`

scripts:
```json
{
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "test": "jest --passWithNoTests"
}
```

### `/mobile/app.json`

Expo 설정. 아래 항목을 반드시 포함한다:

```json
{
  "expo": {
    "name": "SalesCoach",
    "slug": "salescoach",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "salescoach",
    "platforms": ["ios", "android"],
    "ios": {
      "supportsTablet": false,
      "infoPlist": {
        "UIBackgroundModes": ["audio"],
        "NSMicrophoneUsageDescription": "상담 녹음을 위해 마이크 접근이 필요합니다."
      }
    },
    "android": {
      "permissions": ["RECORD_AUDIO", "FOREGROUND_SERVICE"],
      "foregroundService": {
        "notificationTitle": "SalesCoach",
        "notificationBody": "상담 녹음 중입니다.",
        "notificationColor": "#3B82F6"
      }
    },
    "plugins": ["expo-router", "expo-av", "expo-sqlite", "expo-secure-store"]
  }
}
```

### `/mobile/tsconfig.json`

Expo + React Native 표준 tsconfig. strict mode 활성화.
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

### `/mobile/babel.config.js`

NativeWind v4 설정 포함.
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
  };
};
```

### `/mobile/tailwind.config.js`

```javascript
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        surface: '#1E1E2E',
        background: '#0F0F1A',
      },
    },
  },
};
```

### `/mobile/jest.config.js`

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['@testing-library/react-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind)',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
};
```

### `/mobile/metro.config.js`

NativeWind v4 호환 Metro 설정.
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

### `/mobile/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `/mobile/app/_layout.tsx`

루트 레이아웃. 인증 상태에 따른 라우팅 가드는 이 step에서 구현하지 않는다 (mobile-screens step에서 구현).
지금은 빈 껍데기만:

```typescript
import '../global.css';
import { Slot } from 'expo-router';

export default function RootLayout() {
  return <Slot />;
}
```

### `/mobile/app/index.tsx`

임시 홈 화면 (mobile-screens step에서 교체됨):
```typescript
import { View, Text } from 'react-native';
export default function Index() {
  return <View className="flex-1 bg-background"><Text className="text-white">SalesCoach</Text></View>;
}
```

## Acceptance Criteria

```bash
cd mobile
npm install
npm test
npx tsc --noEmit
```

install 성공, 테스트 통과, 타입 에러 없음.

## 검증 절차

1. `cd mobile && npm install && npm test && npx tsc --noEmit` 실행한다.
2. `phases/1-mobile/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "mobile/ Expo SDK 52 프로젝트 설정: package.json, app.json(마이크/백그라운드 권한), tsconfig, babel, tailwind, jest, metro 설정 완료. npm install 및 tsc 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - npm install 실패 → `"status": "blocked"`, `"blocked_reason": "npm install 실패: {에러}"`

## 금지사항

- `npx create-expo-app`을 실행하지 마라. 이유: interactive prompt가 자동화를 막는다.
- `src/` 디렉토리를 사용하지 마라. 이유: ARCHITECTURE.md 구조는 `mobile/app/`, `mobile/components/` 등을 루트 바로 아래에 정의한다.
- NativeWind v3를 설치하지 마라. 이유: CLAUDE.md는 NativeWind v4를 지정한다. v3와 v4는 설정 방식이 완전히 다르다.
