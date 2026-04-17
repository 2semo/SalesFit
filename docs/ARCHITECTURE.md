# 아키텍처: SalesFit

## 디렉토리 구조
```
salesfit/
├── app/                    # Expo Router 페이지
│   ├── _layout.tsx         # 루트 레이아웃 (네비게이션 설정)
│   ├── index.tsx           # 홈 화면 (상담 이력 목록)
│   ├── session.tsx         # 상담 진행 화면
│   └── report.tsx          # 복기 리포트 화면
├── src/
│   ├── screens/            # 화면 컴포넌트 (app/ 라우트에서 import)
│   │   ├── HomeScreen.tsx
│   │   ├── SessionScreen.tsx
│   │   └── ReportScreen.tsx
│   ├── components/         # 재사용 UI 컴포넌트
│   │   ├── CoachingCard.tsx
│   │   ├── TranscriptView.tsx
│   │   └── ReportSection.tsx
│   ├── services/           # 외부 API + 디바이스 기능 래퍼
│   │   ├── audioService.ts     # expo-av 녹음 관리
│   │   ├── geminiService.ts    # Gemini API (STT + 코칭 + 리포트)
│   │   └── storageService.ts   # AsyncStorage CRUD
│   ├── hooks/              # 커스텀 훅
│   │   └── useConsultation.ts  # 상담 세션 상태 관리
│   └── types/              # TypeScript 타입 정의
│       └── index.ts
├── .env                    # API 키 (git ignore)
├── .env.example            # 키 템플릿 (git 포함)
└── app.json                # Expo 설정 (마이크 권한 포함)
```

## 패턴
- 화면 컴포넌트는 비즈니스 로직을 직접 갖지 않는다. `useConsultation` 훅을 통해 상태와 액션을 받는다.
- 서비스 레이어는 순수 함수/클래스로 구성하며 React에 의존하지 않는다.
- 모든 비동기 에러는 서비스 레이어에서 catch하고, 화면에는 에러 상태를 전달한다.

## 데이터 흐름
```
사용자가 녹음 시작
  → AudioService: 15초 청크 녹음
  → GeminiService.transcribeAudio(chunkUri): 텍스트 반환
  → TranscriptSegment 누적 → 화면 자막 업데이트
  → GeminiService.getCoachingTips(transcript): CoachingMessage[] 반환
  → 화면 코칭 패널 업데이트

사용자가 상담 종료
  → GeminiService.generateReport(fullTranscript): ReviewReport 반환
  → StorageService.saveConsultation(consultation)
  → report 화면으로 이동 (ReportScreen에 ReviewReport 전달)
```

## 상태 관리
- 상담 세션 상태 (`isRecording`, `transcript`, `coachingMessages`): `useConsultation` 훅의 `useReducer`
- 상담 이력 목록: `HomeScreen`에서 `StorageService`로 직접 로드
- 리포트 데이터: Expo Router 네비게이션 파라미터로 전달
