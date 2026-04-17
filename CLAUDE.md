# 프로젝트: SalesFit

## 기술 스택
- Expo (React Native) — iOS + Android 모바일 앱
- TypeScript strict mode
- Expo Router (파일 기반 네비게이션)
- Google Gemini 1.5 Flash API (STT + AI 코칭 + 리포트)
- expo-av (오디오 녹음)
- AsyncStorage (로컬 데이터 저장)
- Supabase (인증 + PostgreSQL DB)

## 아키텍처 규칙
- CRITICAL: Gemini API 키는 반드시 .env 파일의 EXPO_PUBLIC_GEMINI_API_KEY 환경변수로만 관리한다. 코드에 하드코딩 금지.
- CRITICAL: 오디오 파일은 15초 단위 청크로 분할하여 Gemini API에 전달한다. 전체 파일을 한 번에 보내지 않는다.
- CRITICAL: 모든 API 호출은 src/services/ 레이어에서만 처리한다. 화면 컴포넌트에서 직접 API 호출 금지.
- 컴포넌트는 src/components/, 화면은 src/screens/, 타입은 src/types/, 서비스는 src/services/, 커스텀 훅은 src/hooks/

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npx expo start          # 개발 서버
npx expo export         # 프로덕션 빌드
npx tsc --noEmit        # 타입 체크
npx jest                # 테스트
