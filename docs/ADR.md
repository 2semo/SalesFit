# Architecture Decision Records: SalesFit

## 철학
MVP 속도 최우선. 외부 의존성 최소화. 작동하는 최소 구현을 선택.

---

### ADR-001: Expo (React Native) 선택
**결정**: Flutter나 네이티브 대신 Expo + React Native 사용
**이유**: TypeScript 생태계 활용, expo-av로 오디오 처리 간편, iOS+Android 동시 지원, 빠른 개발 속도
**트레이드오프**: 네이티브 퍼포먼스 일부 포기, Expo 업데이트 의존성 발생

---

### ADR-002: Google Gemini 단일 API 사용 (STT + AI)
**결정**: OpenAI Whisper(STT) + Claude API 조합 대신 Gemini 1.5 Flash 단일 API 사용
**이유**: Gemini는 오디오를 직접 처리할 수 있어 STT + 코칭을 한 API로 해결. 무료 티어 존재. API 키 1개로 단순화.
**트레이드오프**: Whisper 대비 STT 정확도 차이 가능성, Gemini 서비스 장애 시 전체 기능 영향

---

### ADR-003: 백엔드 없이 클라이언트 직접 API 호출
**결정**: 별도 백엔드 서버 없이 Expo 앱에서 Gemini API 직접 호출
**이유**: MVP 개발 속도, 내부 도구로 API 키 노출 위험 낮음, 서버 운영 비용/복잡도 제거
**트레이드오프**: API 키가 앱에 포함됨 (env 변수로 최소화), 서버 사이드 캐싱 불가

---

### ADR-004: AsyncStorage 로컬 저장
**결정**: Supabase/Firebase 대신 AsyncStorage로 기기 로컬에만 저장
**이유**: 서버 불필요, 오프라인 동작, 개인정보(상담 내용) 기기 외부 미전송
**트레이드오프**: 기기 분실 시 데이터 손실, 팀 공유 불가, 기기간 동기화 없음

---

### ADR-005: 15초 청크 녹음 방식
**결정**: 실시간 WebSocket 스트리밍 대신 15초 단위 청크 녹음 후 API 전송
**이유**: expo-av로 구현 단순, Gemini REST API 호환, 코칭 15~20초 지연은 MVP에서 허용 범위
**트레이드오프**: 실시간 WebSocket 스트리밍 대비 15~20초 코칭 지연
