# Architecture Decision Records: SalesCoach

## 철학
MVP 속도 최우선. 코칭 루프(녹음 → STT → 분석 → 카드 표시)가 동작하는 최소 구현을 먼저 완성한다. 확장성보다 단순함을 선택한다. 기술적 부채를 허용하되, 반드시 ADR에 기록한다.

---

### ADR-001: React Native + Expo (Managed Workflow) 선택

**결정**: 모바일 앱은 React Native + Expo Managed Workflow (SDK 52+) 로 구현한다.

**배경**: iOS/Android 동시 지원이 필수. 네이티브 오디오 녹음, 보안 스토리지, 로컬 DB 기능이 필요하다.

**이유**:
- expo-av: 오디오 녹음 + 레벨 메터링 API를 5줄로 사용 가능
- expo-sqlite: 로컬 DB
- expo-secure-store: iOS Keychain / Android Keystore 래퍼
- Expo Go로 물리 기기 즉시 테스트 가능
- EAS Build로 CI 없이 앱스토어 빌드 가능

**고려한 대안**:
- React Native CLI (Bare): 더 많은 네이티브 제어 가능하나 설정 비용이 크다. MVP에서 필요한 네이티브 기능이 없음.
- Flutter: 성능 좋으나 TypeScript 미지원. 서버와 타입 공유 불가.

**트레이드오프**: Managed Workflow는 일부 네이티브 모듈 사용이 불가하다. 고성능 오디오 DSP (음성 필터링, 노이즈 캔슬링)가 필요해지면 bare workflow 마이그레이션이 필요하다.

**재검토 조건**: 배경 소음이 심한 환경에서 STT 정확도가 지속적으로 60% 미만이면 네이티브 노이즈 캔슬링 도입을 검토한다.

---

### ADR-002: Whisper API 청크 방식 (실시간 스트리밍 아님)

**결정**: 오디오를 15초 단위 청크로 분할하여 Whisper API에 순차 전송한다. 인접 청크 간 1초 오버랩을 두어 청크 경계에서의 문장 잘림을 최소화한다.

**배경**: 실시간 코칭을 위해서는 음성을 텍스트로 변환해야 한다.

**이유**:
- Whisper API는 파일 기반 API다. 스트리밍 전송을 지원하지 않는다.
- 15초 청크: API 비용(호출 횟수)과 코칭 반응 속도의 균형점. 10초로 줄이면 호출이 50% 증가한다.
- 1초 오버랩: 청크 경계에서 단어가 잘리는 빈도를 약 90% 감소시킨다 (경험적 수치).

**고려한 대안**:
- Google Cloud Speech-to-Text (스트리밍): 진짜 실시간(< 1초 지연) 가능. 하지만 스트리밍 WebSocket 구현 복잡도와 비용이 크다. MVP 이후 검토.
- Web Speech API (브라우저): 모바일 React Native에서 사용 불가.
- Whisper (on-device, whisper.rn): 정확도 낮음. M4 칩 이상에서만 실용적.

**트레이드오프**: 최대 15초 딜레이가 발생한다. 코칭 카드가 현재 발화가 아닌 15초 전 발화를 기반으로 표시될 수 있다.

**재검토 조건**: 상담원 피드백에서 "코칭이 너무 늦게 나온다"는 의견이 50% 이상이면 Google Cloud STT 스트리밍으로 교체한다.

---

### ADR-003: Google Gemini API (gemini-1.5-pro) 코칭 엔진

**결정**: 실시간 코칭 분석, 무음 소구 포인트, 상담 후 복기 리포트 생성 모두 Gemini API를 사용한다.

**배경**: STT로 변환된 텍스트를 분석하여 상담원에게 유용한 인사이트를 제공해야 한다.

**이유**:
- 긴 컨텍스트 처리: gemini-1.5-pro는 최대 1M 토큰. 60분 상담 전체 트랜스크립트도 처리 가능.
- 한국어 성능: GPT-4o와 동등한 수준의 한국어 지원.
- 하나의 API로 3종 코칭 커버 → 의존성 단순화.
- OpenAI 대비 약 30% 저렴 (2025년 기준).

**고려한 대안**:
- OpenAI GPT-4o: 한국어 뉘앙스 처리가 Gemini보다 미세하게 우수하다는 평이 있음. 하지만 긴 컨텍스트 비용이 더 비싸다.
- Claude API: 한국어 지원 우수하나, 두 Anthropic 서비스 동시 사용보다 단일 제공사 의존도 줄이기를 선택.

**트레이드오프**: Gemini API 다운 시 코칭 기능 전체가 중단된다. 멀티 LLM 폴백(Gemini 실패 시 GPT-4o)은 복잡도가 높아 MVP에서 제외한다.

**재검토 조건**: 코칭 품질 만족도 조사에서 "코칭 내용이 도움이 안 된다" 비율이 40% 초과 시 GPT-4o 전환 검토.

---

### ADR-004: Next.js 15 API Routes 서버 (UI 없음)

**결정**: 백엔드는 Next.js 15 App Router의 API Routes만 사용한다. 서버 렌더링 페이지는 만들지 않는다.

**배경**: API 키 보호와 비즈니스 로직 서버화를 위해 별도 서버가 필요하다.

**이유**:
- TypeScript 설정이 이미 갖춰진 프레임워크. mobile/과 타입 공유 구조가 자연스럽다.
- Vercel 배포가 0 설정으로 가능. 인프라 관리 비용 없음.
- Next.js API Routes는 서버리스 함수로 동작 → 트래픽에 비례한 비용.

**고려한 대안**:
- Express.js: 더 가볍고 직관적이나 TypeScript 설정, CORS, 미들웨어 직접 구성 필요.
- FastAPI (Python): Whisper, Gemini Python SDK가 더 성숙하나, TypeScript 서버와 언어 분리 비용이 크다.
- Supabase Edge Functions: 설정 단순. 하지만 실행 시간 제한(30초)이 복기 리포트 생성(최대 60초)에 위험하다.

**트레이드오프**: Next.js를 API 서버로만 쓰는 건 오버스펙이다. Cold Start 지연이 발생할 수 있다 (Vercel 서버리스). 트래픽이 지속적으로 높아지면 Express + 전용 서버로 마이그레이션한다.

---

### ADR-005: 로컬 SQLite 저장 (클라우드 서버 DB 없음)

**결정**: 세션 데이터, 트랜스크립트, 코칭 이벤트, 복기 리포트를 기기 내 expo-sqlite에 저장한다.

**배경**: 상담 데이터를 어디에 영속화할지 결정해야 한다.

**이유**:
- 오프라인 동작: 매장 내 Wi-Fi가 불안정해도 히스토리 열람 가능.
- 개인정보: 고객과의 대화 녹취 내용이 포함됨. 클라우드 전송을 최소화하면 법적 리스크 감소.
- 구현 단순성: 서버 DB(PostgreSQL 등) 설계/운영 비용 제거.
- 비용: 클라우드 스토리지 비용 없음.

**고려한 대안**:
- Supabase PostgreSQL: 팀 관리, 데이터 백업, 기기 간 동기화 가능. 하지만 MVP에서 불필요하며 개인정보 이슈.
- AsyncStorage: 단순하나 구조화된 쿼리 불가. 세션 수가 많아지면 성능 저하.

**트레이드오프**: 기기 분실/교체 시 데이터 영구 소실. 팀 단위 성과 집계 불가. Phase 2에서 선택적 클라우드 백업 기능 추가 예정.

---

### ADR-006: JWT 자체 인증 (OAuth 없음)

**결정**: 이메일 + 비밀번호 로그인, 서버에서 JWT 발급 (유효기간 7일), 모바일에서 expo-secure-store에 저장한다.

**배경**: 상담원별로 히스토리를 분리하기 위해 인증이 필요하다.

**이유**:
- OAuth(Google, Kakao) 설정 비용(플랫폼 등록, 리다이렉트 URL 설정)이 MVP에서 과하다.
- 내부 도구 성격이 강해 SNS 로그인이 필수적이지 않다.
- JWT 7일: 상담원이 매일 앱을 여는 사용 패턴에서 재로그인 빈도를 최소화.

**고려한 대안**:
- Supabase Auth: 설정 간단하나 외부 서비스 의존성 추가.
- Refresh Token 패턴: 보안 강화되나 구현 복잡도 증가. MVP 이후 도입.

**트레이드오프**:
- 비밀번호 재설정 이메일 기능 없음 → Phase 1.5에서 추가
- Refresh Token 없음 → 7일 후 재로그인 필요
- 상담 중 토큰 만료 시 → 상담은 유지, 종료 후 재로그인

---

### ADR-007: 오디오 포맷 m4a (AAC) 선택

**결정**: expo-av로 녹음 시 m4a (AAC, 32kbps, 16kHz 모노) 포맷을 사용한다.

**배경**: Whisper API에 전송할 오디오의 포맷과 품질 설정이 필요하다.

**이유**:
- Whisper 지원 포맷: mp3, mp4, m4a, wav, webm 등. m4a는 iOS/Android 모두 네이티브 지원.
- 16kHz: Whisper 내부 처리 샘플레이트와 동일. 더 높은 샘플레이트는 품질 향상 없이 크기만 증가.
- 모노: 대화 녹음에서 스테레오는 의미 없음. 파일 크기 50% 절감.
- 32kbps: 음성 인식에 충분한 품질. 15초 청크 ≈ 0.6MB (Whisper 25MB 제한의 2.4%).

**고려한 대안**:
- wav (PCM): 무손실이나 파일 크기가 m4a 대비 4~6배. 네트워크 부담.
- mp3: iOS에서 녹음 포맷으로 직접 지원 안 됨 (디코딩은 가능, 인코딩은 별도 라이브러리 필요).
- webm (Opus): 최적의 압축률이나 iOS expo-av에서 녹음 포맷 미지원.

**트레이드오프**: 손실 압축으로 극도로 작은 소리 (속삭임 등)의 인식 품질이 약간 저하될 수 있다.

---

### ADR-008: Expo Router (파일 기반 라우팅) 선택

**결정**: 모바일 앱의 라우팅은 Expo Router (v3)를 사용한다.

**배경**: 화면 전환 로직을 어떻게 구현할지 결정해야 한다.

**이유**:
- 파일 기반 라우팅: 화면 추가가 파일 생성만으로 완료됨.
- 인증 가드: `_layout.tsx`의 리다이렉트 로직으로 JWT 만료 처리 일원화.
- Deep Linking 기본 지원: 나중에 알림에서 특정 세션으로 바로 이동할 때 유용.
- Expo 공식 권장 방식 (SDK 52+).

**고려한 대안**:
- React Navigation v6: 더 성숙한 생태계. 하지만 설정 코드가 많고 Expo Router가 내부적으로 React Navigation을 사용한다.

**트레이드오프**: Expo Router는 React Navigation 대비 커뮤니티 자료가 적다. 복잡한 중첩 네비게이션 커스터마이징이 어려울 수 있다.

---

### ADR-009: Zustand 상태 관리 선택

**결정**: 클라이언트 상태 관리는 Zustand를 사용한다.

**배경**: 상담 진행 중 트랜스크립트, 코칭 카드, 세션 상태 등 여러 컴포넌트가 공유하는 상태가 필요하다.

**이유**:
- 보일러플레이트 없음: Redux Toolkit 대비 코드 양이 1/3.
- React Context보다 렌더링 최적화가 자동 (selector 기반 구독).
- persist 미들웨어로 AuthStore를 expo-secure-store에 쉽게 연동.
- TypeScript 지원 우수.

**고려한 대안**:
- Redux Toolkit: 강력하나 보일러플레이트 과다. 팀 규모가 클 때 유리하지만 솔로/소규모에 과하다.
- React Context + useReducer: 추가 의존성 없음. 하지만 잦은 업데이트(오디오 레벨, 트랜스크립트 누적)에서 불필요한 리렌더링 발생.
- Jotai/Recoil: atomic 모델이 이 앱의 스토어 구조에 자연스럽지 않다.

**트레이드오프**: DevTools 지원이 Redux에 비해 약하다. 디버깅 시 zustand/devtools 미들웨어 활용.

---

### ADR-010: React Query (TanStack Query) 서버 상태 관리

**결정**: 서버 API 요청의 캐싱, 로딩/에러 상태 관리는 React Query를 사용한다.

**배경**: 히스토리 목록, 세션 상세 등 서버 데이터를 가져오는 로직이 반복적으로 필요하다.

**이유**:
- 히스토리 조회: SQLite → Repository → React Query의 queryFn으로 자연스럽게 연동.
- 복기 리포트 재생성: useMutation으로 명확한 로딩/성공/실패 처리.
- 자동 캐싱: 히스토리 목록을 여러 번 진입해도 불필요한 DB 재쿼리 방지.

**고려한 대안**:
- SWR: 기능이 유사하나 React Query가 더 풍부한 mutation 처리와 TypeScript 지원.
- 직접 useEffect + useState: 간단하나 캐싱, 에러 처리, 재시도 로직을 매번 직접 구현해야 함.

**트레이드오프**: 의존성 하나 추가 (약 30KB gzip). 오버엔지니어링처럼 보일 수 있으나, mutation 상태 관리 편의성이 번들 크기 증가를 정당화한다.

---

### ADR-011: NativeWind (Tailwind CSS in React Native) 스타일링

**결정**: UI 스타일링은 NativeWind (v4)를 사용한다.

**배경**: 일관된 디자인 시스템과 빠른 스타일링이 필요하다.

**이유**:
- Tailwind 클래스명으로 빠른 프로토타이핑.
- UI_GUIDE.md의 색상 팔레트를 tailwind.config.js에 한 번만 정의하면 전체 앱에 적용.
- 팀원이 웹 개발 배경이 있으면 학습 비용 최소화.

**고려한 대안**:
- StyleSheet API (React Native 기본): 성능상 유리하나 디자인 시스템 관리가 번거롭다. 색상, 간격 상수를 직접 관리해야 한다.
- styled-components / emotion: CSS-in-JS 방식. 런타임 오버헤드 있음. 모바일에서 성능 이슈.

**트레이드오프**: NativeWind v4는 아직 일부 StyleSheet 속성 미지원. 복잡한 애니메이션은 StyleSheet으로 직접 작성해야 할 수 있다.

---

### ADR-012: 코칭 카드 쿨다운 30초 고정

**결정**: coaching/analyze 호출 간격은 최소 30초 쿨다운으로 고정한다. 사용자 설정 불가.

**배경**: API 비용과 코칭 유용성 간의 균형이 필요하다.

**이유**:
- 30초마다 Gemini 호출 시 60분 상담에서 최대 120회 호출. API 비용 계산 가능.
- 5초마다 호출하면 코칭 카드가 너무 자주 바뀌어 상담원이 집중을 잃는다.
- 대화 맥락이 30초 안에 드라마틱하게 바뀌지 않으므로 30초로 충분하다.

**트레이드오프**: 빠른 전환(가격 얘기 → 갑자기 AS 얘기)을 놓칠 수 있다. 허용 범위로 판단.

**재검토 조건**: 상담원 피드백에서 "코칭이 현재 대화와 맞지 않는다"는 의견이 60% 초과 시 20초로 단축 검토.

---

### ADR-013: 화자 분리 MVP 제외

**결정**: MVP에서는 상담원과 고객의 발화를 구분하지 않는다. Whisper가 인식한 전체 텍스트를 트랜스크립트로 사용한다.

**배경**: 코칭 품질을 높이려면 누가 무슨 말을 했는지 구분하는 것이 이상적이다.

**이유**:
- Whisper API는 화자 분리 기능을 제공하지 않는다.
- pyannote-audio 등 화자 분리 모델은 서버 추가 처리가 필요하다 (지연 증가).
- 단일 마이크 환경에서 두 사람의 음성 분리 정확도는 60~70% 수준이다.
- 분리 없이도 대화 전체를 분석하면 고객 성향 파악과 코칭이 충분히 가능하다.

**트레이드오프**: "당신(상담원)은 X를 잘했다" 같은 개인화 피드백이 약해진다. 코칭 프롬프트에서 "발화자 불명 텍스트"로 다루도록 Gemini에 지시한다.

**재검토 조건**: Phase 2에서 Whisper + pyannote 파이프라인 도입 여부를 코칭 품질 데이터 기반으로 결정한다.

---

### ADR-014: 모노레포 구조 (mobile/ + server/ 단일 저장소)

**결정**: mobile과 server를 하나의 git 저장소에서 관리한다.

**배경**: 두 앱의 저장소를 어떻게 관리할지 결정해야 한다.

**이유**:
- TypeScript 타입을 mobile/types/와 server/types/ 간 직접 참조 가능 (yarn workspace 사용 시).
- API 스키마 변경 시 양쪽을 동시에 커밋하여 버전 불일치 방지.
- 단일 PR로 mobile-server 연동 변경 이력 추적 용이.
- 소규모 팀(1~2명)에서 별도 레포 관리 오버헤드 불필요.

**고려한 대안**:
- 별도 저장소 (mobile repo + server repo): 팀이 커지거나 배포 주기가 다를 때 유리. MVP에서는 불필요한 오버헤드.

**트레이드오프**: 저장소가 커질수록 clone/CI 시간 증가. 팀이 3명 이상이 되면 별도 저장소 분리를 고려한다.

---

### ADR-015: 서버 유저 DB — Vercel Postgres 선택

**결정**: 유저 계정 정보(이메일, 비밀번호 해시, 이름)는 Vercel Postgres에 저장한다.

**배경**: register/login API에서 유저 credential을 영속화할 서버 DB가 필요하다. 현재 아키텍처에서 서버는 Next.js API Routes(Vercel 배포)이며, 별도 서버 프로세스가 없다.

**이유**:
- Vercel Postgres는 Vercel 배포 환경과 완벽히 통합. 환경 변수 자동 주입.
- 서버리스 함수에서 connection pooling 없이 안전하게 사용 가능 (Neon 기반).
- 유저 수가 적은 MVP에서 충분한 성능.
- Next.js 15 + Vercel Postgres는 공식 지원 스택.

**저장 범위**: 유저 테이블만. 상담 데이터는 클라이언트 SQLite에 저장 (ADR-005 참조).

**고려한 대안**:
- 인메모리 저장 (Node.js 전역 변수): 서버리스 환경에서 인스턴스 간 메모리 공유 불가. 완전히 불적합.
- Supabase PostgreSQL: 기능은 동등하나 Vercel과 통합이 Vercel Postgres보다 복잡.
- PlanetScale (MySQL): 서버리스 최적화가 잘 되어 있으나 SQL 방언이 PostgreSQL과 다름.
- 파일 기반 SQLite (서버): Vercel 서버리스는 파일 시스템이 읽기 전용. 사용 불가.

**트레이드오프**: Vercel Postgres는 유료 플랜 ($20/월 이상)이 필요할 수 있다. 무료 플랜은 스토리지 256MB, 월 60시간 compute 제한. MVP에서 유저 수가 적으면 무료 한도 내 운용 가능.

**재검토 조건**: 월 활성 유저 100명 초과 시 유료 플랜 업그레이드 또는 self-hosted PostgreSQL으로 전환.

---

### ADR-016: Wake Lock — expo-keep-awake 선택

**결정**: 상담 진행 중 화면 자동 꺼짐을 방지하기 위해 expo-keep-awake를 사용한다.

**배경**: 상담원이 고객과 대화하는 동안 폰 화면이 꺼지면 코칭 카드를 볼 수 없다. 일반적으로 iOS/Android는 30초~1분 비활성 시 화면을 자동으로 끈다.

**이유**:
- expo-keep-awake는 Expo SDK에 포함된 공식 패키지. 별도 설치 없음.
- `activateKeepAwakeAsync()` / `deactivateKeepAwake()` 두 함수만으로 제어 가능.
- iOS NSProcessInfo.performActivityWithReason, Android PowerManager.WakeLock을 동일 인터페이스로 추상화.

**사용 규칙**:
- 상담 시작(status: recording) → Wake Lock 활성화
- 상담 일시정지(status: paused) → Wake Lock 해제 (배터리 절약)
- 상담 재개 → Wake Lock 재활성화
- 상담 종료 → Wake Lock 해제
- 앱이 백그라운드 전환 → 자동으로 비활성화됨 (OS 처리)

**트레이드오프**: 배터리 소모가 증가한다. 1시간 상담 시 약 5~10% 추가 배터리 사용 예상. 이는 앱의 핵심 가치(코칭 카드 가시성)를 위해 허용 가능한 트레이드오프다.

---

### ADR-017: 백그라운드 오디오 — iOS Background Audio Mode + Android Foreground Service

**결정**: 앱이 백그라운드 전환되어도 녹음을 유지하기 위해 iOS는 Background Audio Mode, Android는 Foreground Service를 사용한다.

**배경**: 상담 중 상담원이 다른 앱을 잠깐 확인하거나 전화가 오면 앱이 백그라운드로 전환된다. 이때 녹음이 중단되면 트랜스크립트에 공백이 생기고 코칭 품질이 저하된다.

**iOS 구현**:
```
app.json: UIBackgroundModes: ["audio"]
expo-av RecordingOptions: allowsRecording: true
동작: AVAudioSession category를 PlayAndRecord로 설정 시 백그라운드 유지됨.
      전화 수신 시 오디오 세션 인터럽트 → 녹음 일시중단 → 전화 종료 후 자동 재개.
```

**Android 구현**:
```
app.json: foregroundService 설정
expo-av 자체는 백그라운드에서 중단됨 → expo-task-manager + 백그라운드 태스크로 보완.
상태바에 영구 알림 표시 (Android 정책 요구사항).
```

**고려한 대안**:
- 백그라운드 전환 시 녹음 중단 허용: 구현 단순하나 UX 치명적. 상담원이 잠깐 다른 앱을 보면 코칭 컨텍스트가 끊김.
- 백그라운드 전환 시 일시정지 + 사용자 알림: 더 단순하나 상담원이 인지하지 못할 수 있음.

**트레이드오프**:
- iOS: 백그라운드 오디오 권한 사용으로 앱스토어 리뷰에서 "왜 백그라운드에서 마이크를 사용하는가?" 심사를 받을 수 있다. 명확한 사용 사유(상담 녹음)를 앱 설명에 작성한다.
- Android: 포그라운드 서비스 알림이 사용자에게 항상 보인다. 일부 사용자는 불편할 수 있으나 투명성 측면에서 긍정적이다.
