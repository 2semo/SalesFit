# Step 0: supabase-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/CLAUDE.md`
- `salesfit/src/types/index.ts`
- `salesfit/src/services/storageService.ts`

## 작업

### 1. Supabase 클라이언트 패키지 설치

```bash
cd salesfit
npm install @supabase/supabase-js
```

### 2. 환경변수 추가

`salesfit/.env.example`에 아래 항목 추가:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`salesfit/.env`에도 실제 값 추가 (Supabase 프로젝트: https://gzawgtlazqjxlgbffdil.supabase.co).

### 3. Supabase 클라이언트 파일 생성

`salesfit/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4. Supabase DB 스키마 생성

Supabase 대시보드 → SQL Editor에서 아래 SQL을 실행하라:

```sql
-- 사용자 프로필 (상담원 + 관리자)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('consultant', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상담 세션
CREATE TABLE consultations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'recording',
  duration_ms INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 복기 리포트
CREATE TABLE consultation_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id TEXT REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  customer_needs_score INTEGER DEFAULT 0,
  customer_needs_analysis TEXT DEFAULT '',
  recommended_scripts JSONB DEFAULT '[]',
  product_explanation_score INTEGER DEFAULT 0,
  product_explanation_feedback TEXT DEFAULT '',
  closing_timing_score INTEGER DEFAULT 0,
  closing_timing_feedback TEXT DEFAULT '',
  improvement_points JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  total_duration_ms INTEGER DEFAULT 0
);

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_reports ENABLE ROW LEVEL SECURITY;

-- 상담원: 자신의 데이터만 조회/삽입
CREATE POLICY "consultant_own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "consultant_own_consultations" ON consultations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "consultant_own_reports" ON consultation_reports FOR ALL USING (auth.uid() = user_id);

-- 관리자: 모든 데이터 조회 가능
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_read_all_consultations" ON consultations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_read_all_reports" ON consultation_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 신규 가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'consultant');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 5. CLAUDE.md 업데이트

CLAUDE.md 기술 스택에 추가:
```
- Supabase (인증 + PostgreSQL DB)
```

## Acceptance Criteria

```bash
cd salesfit
npx tsc --noEmit   # 타입 에러 없음
```

## 검증 절차

1. AC 커맨드 실행.
2. Supabase 대시보드 → Table Editor에서 `profiles`, `consultations`, `consultation_reports` 테이블 생성 확인.
3. `phases/1-admin-dashboard/index.json`의 step 0 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "@supabase/supabase-js 설치, src/lib/supabase.ts 생성, DB 스키마 3개 테이블 생성 (profiles, consultations, consultation_reports), RLS 정책 설정 완료."`
   - 실패 → 에러/블록 처리

## 금지사항

- service_role 키를 코드에 절대 포함하지 마라. 이유: 보안 위협. anon 키만 사용한다.
- RLS 없이 테이블을 생성하지 마라. 이유: 모든 사용자가 타인 데이터를 볼 수 있게 된다.
- 기존 테스트를 깨뜨리지 마라.
