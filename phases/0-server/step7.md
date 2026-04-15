# Step 7: server-coaching

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 코칭 흐름, 무음 감지 흐름, 복기 흐름, API 스키마(coaching 섹션), Gemini 프롬프트 구조
- `/docs/ADR.md` — ADR-003(Gemini), ADR-012(쿨다운)
- `/server/types/index.ts`
- `/server/lib/gemini.ts`
- `/server/lib/withAuth.ts`
- `/server/lib/apiResponse.ts`
- `/server/lib/rateLimit.ts`

## 작업

코칭 API 라우트 3개를 구현한다.

### `/server/app/api/coaching/analyze/route.ts`

`POST /api/coaching/analyze`

요청: `{ transcript: TranscriptSegment[], previousCoachings: string[] }`
- `withAuth`로 JWT 검증
- Rate limit: 유저당 4 req/min
- transcript가 비어있거나 3개 미만 → `204` 반환 (빈 응답, 데이터 부족)
- `analyzeTranscript(req)` 호출
- 반환값이 `null` → `204` 반환
- Gemini 실패 → `503 { error: 'COACHING_UNAVAILABLE', message: string }`
- 성공 → `200 { customerTrait, coachingMessage, actions }`

### `/server/app/api/coaching/silence/route.ts`

`POST /api/coaching/silence`

요청: `{ transcript: TranscriptSegment[], contextSummary?: string }`
- `withAuth`로 JWT 검증
- Rate limit: 유저당 4 req/min
- `analyzeSilence(req)` 호출
- Gemini 실패 → `503 { error: 'COACHING_UNAVAILABLE', message: string }`
- 성공 → `200 { points: [string, string, string] }`

### `/server/app/api/coaching/review/route.ts`

`POST /api/coaching/review`

요청: `{ transcript: TranscriptSegment[], coachingEvents: CoachingEvent[], sessionDuration: number }`
- `withAuth`로 JWT 검증
- Rate limit: 유저당 5 req/hour
- transcript가 비어있음 → `422 { error: 'INSUFFICIENT_DATA', message: '대화 내용이 충분하지 않습니다' }`
- `generateReview(req)` 호출
- Gemini 실패 → `503 { error: 'REVIEW_UNAVAILABLE', message: string }`
- 성공 → `200 { summary, strengths, weaknesses, actions }`

### 테스트: `/server/__tests__/coaching.test.ts`

`lib/gemini.ts`를 jest mock으로 대체한다.

```typescript
jest.mock('@/lib/gemini', () => ({
  analyzeTranscript: jest.fn(),
  analyzeSilence: jest.fn(),
  generateReview: jest.fn(),
}));
```

테스트 케이스:

**analyze:**
- transcript 3개 이상 + 유효 토큰 → `analyzeTranscript` 호출됨, 200
- transcript 3개 미만 → 204
- `analyzeTranscript` mock이 `null` 반환 → 204
- `analyzeTranscript` mock이 `Error('COACHING_UNAVAILABLE')` throw → 503
- 토큰 없음 → 401

**silence:**
- 유효 요청 + 토큰 → `analyzeSilence` 호출됨, 200 + `{ points: [...] }`
- Gemini 실패 → 503

**review:**
- 유효 transcript + 토큰 → `generateReview` 호출됨, 200
- 빈 transcript → 422
- Gemini 실패 → 503

## Acceptance Criteria

```bash
cd server
npm test
npx tsc --noEmit
npm run lint
```

전체 테스트 통과, 타입 에러 없음, lint 통과. 이 step이 서버의 마지막 step이므로 전체 테스트를 실행한다.

## 검증 절차

1. `cd server && npm test && npx tsc --noEmit && npm run lint` 실행한다.
2. 모든 테스트(lib, middleware, auth, stt, coaching)가 통과하는지 확인한다.
3. `phases/0-server/index.json`의 step 7을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "코칭 라우트 3개 구현: POST /api/coaching/analyze(204 처리 포함), /silence, /review(422 처리). 서버 전체 테스트 통과, lint 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- `analyze`에서 204를 반환할 때 응답 body에 아무것도 넣지 마라. 이유: HTTP 204는 빈 응답이다. body를 포함하면 일부 클라이언트에서 파싱 에러가 발생한다.
- Gemini 프롬프트를 임의로 변경하지 마라. 이유: ARCHITECTURE.md에 명시된 프롬프트 구조가 코칭 품질의 기준이다.
- rate limit 설정을 임의로 변경하지 마라. 이유: ARCHITECTURE.md Rate Limiting 섹션의 값이 API 비용 통제 기준이다.
