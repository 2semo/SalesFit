# 프로젝트: SalesCoach

## 기술 스택

### Mobile (mobile/)
- React Native + Expo (SDK 52+)
- TypeScript strict mode
- NativeWind (스타일링)
- Zustand (클라이언트 상태)
- React Query (서버 상태 / 캐싱)
- expo-sqlite (로컬 DB)
- expo-av (오디오 녹음)

### Server (server/)
- Next.js 15 (App Router — API Routes 전용, UI 없음)
- TypeScript strict mode
- OpenAI Whisper API (STT)
- Google Gemini API (gemini-1.5-pro, 코칭 엔진)

## 아키텍처 규칙
- CRITICAL: Whisper / Gemini API 키는 반드시 server/ 에서만 사용한다. mobile/ 코드에 API 키를 넣지 마라.
- CRITICAL: 모든 외부 API 호출은 server/app/api/ 라우트 핸들러를 통해서만 한다. 모바일이 Whisper·Gemini를 직접 호출하지 마라.
- CRITICAL: 오디오 청크는 15초 단위로 분할하여 Whisper에 전송한다. 청크 경계에서 문장이 잘리지 않도록 1초 오버랩을 둔다.
- 무음 감지 임계값: 오디오 레벨 < -50dB 가 5초 이상 지속될 때 silence 이벤트를 발생시킨다.
- 컴포넌트 → mobile/components/, 타입 → 각 앱의 types/, API 클라이언트 → mobile/services/

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어

### Mobile
```bash
cd mobile
npx expo start          # 개발 서버 (Metro)
npx expo run:ios        # iOS 시뮬레이터 빌드
npx expo run:android    # Android 에뮬레이터 빌드
npm test                # Jest 테스트
```

### Server
```bash
cd server
npm run dev             # 개발 서버 (port 3000)
npm run build           # 프로덕션 빌드
npm run lint            # ESLint
npm run test            # Jest 테스트
```
