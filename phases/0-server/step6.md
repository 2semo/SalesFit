# Step 6: server-stt

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 실시간 코칭 흐름, 오디오 처리 상세, API 스키마(POST /api/stt)
- `/docs/ADR.md` — ADR-002(Whisper 청크), ADR-007(m4a 포맷)
- `/server/types/index.ts`
- `/server/lib/whisper.ts`
- `/server/lib/withAuth.ts`
- `/server/lib/apiResponse.ts`
- `/server/lib/rateLimit.ts`

## 작업

STT API 라우트를 구현한다.

### `/server/app/api/stt/route.ts`

`POST /api/stt` — multipart/form-data로 오디오 청크를 받아 Whisper로 텍스트 변환.

요청: `multipart/form-data`
- `audio`: File (m4a 포맷)
- `chunkIndex`: number (문자열로 전달됨, parseInt 필요)
- `overlapMs`: number

처리 순서:
1. `withAuth`로 JWT 검증
2. Rate limit: 유저당 60 req/min
3. `formData()`로 파일 추출
4. 파일 없음 → `400 { error: 'INVALID_AUDIO', message: string }`
5. 파일 크기 25MB 초과 → `413 { error: 'FILE_TOO_LARGE', message: '최대 25MB' }`
6. `arrayBuffer()` → `Buffer`로 변환
7. `transcribeAudio(buffer, filename)` 호출
8. Whisper 실패 → `503 { error: 'STT_UNAVAILABLE', message: string }`
9. 성공 → `200 { text, chunkIndex, duration }`

오디오는 메모리에서만 처리한다. `fs.writeFile` 절대 사용 금지.

### 테스트: `/server/__tests__/stt.test.ts`

`lib/whisper.ts`를 jest mock으로 대체한다.

```typescript
jest.mock('@/lib/whisper', () => ({
  transcribeAudio: jest.fn(),
}));
```

테스트 케이스:
- 유효한 오디오 파일 + 유효한 토큰 → `transcribeAudio` 호출됨, 200 + `{ text, chunkIndex, duration }` 반환
- 파일 없음 → 400
- 25MB 초과 파일 → 413
- Whisper mock이 `Error('STT_UNAVAILABLE')` throw → 503
- 토큰 없음 → 401

multipart/form-data 테스트 방법:
```typescript
const formData = new FormData();
formData.append('audio', new Blob([Buffer.alloc(100)], { type: 'audio/m4a' }), 'chunk.m4a');
formData.append('chunkIndex', '0');
formData.append('overlapMs', '1000');

const req = new NextRequest('http://localhost/api/stt', {
  method: 'POST',
  body: formData,
  headers: { Authorization: `Bearer ${validToken}` },
});
```

`validToken`은 `signToken({ userId: 'test-user', email: 'test@test.com' })`으로 생성한다.

## Acceptance Criteria

```bash
cd server
npm test -- --testPathPattern="stt.test"
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `phases/0-server/index.json`의 step 6를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "POST /api/stt 구현: multipart 오디오 수신, Whisper 호출, 25MB 체크, rate limit(60/min). stt.test.ts 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- 오디오 파일을 디스크에 저장하지 마라. 이유: Vercel 서버리스 파일시스템은 읽기 전용. 메모리 Buffer로만 처리한다.
- `chunkIndex`를 검증 없이 바로 사용하지 마라. 이유: form-data는 문자열로 전달되므로 `parseInt` 후 `isNaN` 체크가 필요하다.
