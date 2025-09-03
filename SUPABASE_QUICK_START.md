# Supabase 빠른 시작 가이드

## 프로젝트 정보
- **URL**: https://zxszrqmeqhxazgabaubz.supabase.co
- **Project ID**: zxszrqmeqhxazgabaubz

## 1. Supabase Dashboard에서 연결 정보 복사 (2분)

1. [Supabase Dashboard](https://supabase.com/dashboard/project/zxszrqmeqhxazgabaubz/settings/database) 접속
2. **Connection string** 섹션에서 복사:
   - `Connection pooling` (앱 연결용) - Mode: Transaction
   - `Direct connection` (마이그레이션용)

## 2. 환경 변수 설정 (2분)

`.env.local` 파일 생성:
```env
# Supabase Configuration
SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
SUPABASE_ANON_KEY=[API Settings에서 anon key 복사]

# Database URLs (Connection String 섹션에서 복사)
DATABASE_URL=[Connection pooling URL 복사]
DATABASE_URL_NON_POOLED=[Direct connection URL 복사]

# Feature flags
USE_SUPABASE=true

# 기존 SQLite (백업용)
DATABASE_URL_SQLITE=./data/chat.db
```

## 3. 패키지 설치 (1분)

```bash
# Supabase 패키지 설치
npm install @supabase/supabase-js @supabase/ssr postgres
```

## 4. package.json 스크립트 추가 (1분)

```json
{
  "scripts": {
    "db:generate:supabase": "drizzle-kit generate --config=drizzle.config.supabase.ts",
    "db:push:supabase": "drizzle-kit push --config=drizzle.config.supabase.ts",
    "db:migrate:supabase": "tsx scripts/migrate-supabase.ts",
    "db:studio:supabase": "drizzle-kit studio --config=drizzle.config.supabase.ts",
    "db:export:sqlite": "tsx scripts/export-sqlite.ts",
    "db:import:supabase": "tsx scripts/import-supabase.ts",
    "db:validate:supabase": "tsx scripts/validate-supabase.ts",
    "supabase:setup": "npm run db:generate:supabase && npm run db:push:supabase"
  }
}
```

## 5. 데이터베이스 초기화 (3분)

```bash
# 스키마 생성 및 푸시
npm run supabase:setup

# 확인 (브라우저에서 열림)
npm run db:studio:supabase
```

## 6. 데이터 마이그레이션 (선택사항, 5분)

기존 SQLite 데이터가 있는 경우:

```bash
# 1. SQLite 데이터 내보내기
npm run db:export:sqlite

# 2. Supabase로 가져오기
npm run db:import:supabase

# 3. 검증
npm run db:validate:supabase
```

## 7. 코드 통합 (이미 완료됨)

```typescript
// lib/db/index.ts
import { getSupabaseDb } from './supabase-client';
import { getDbClient } from './client';

export function getDb() {
  const useSupabase = process.env.USE_SUPABASE === 'true';
  
  if (useSupabase) {
    return getSupabaseDb();
  }
  
  return getDbClient(); // SQLite fallback
}
```

## 8. Row Level Security 설정 (권장, 3분)

Supabase SQL Editor에서 실행:
```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 기본 정책 (개발용 - 모든 접근 허용)
CREATE POLICY "Allow all for development" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON chats FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON messages FOR ALL USING (true);
```

## 9. 테스트

### 로컬 테스트
```bash
USE_SUPABASE=true npm run dev
```

브라우저에서 http://localhost:3006 접속

### 연결 테스트 스크립트
```bash
# test-supabase.ts 생성 후
tsx test-supabase.ts
```

## 10. Vercel 배포 설정

### Vercel Dashboard 환경변수
```
SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
SUPABASE_ANON_KEY=[복사한 anon key]
DATABASE_URL=[Connection pooling URL]
DATABASE_URL_NON_POOLED=[Direct connection URL]
USE_SUPABASE=true
```

## 11. 모니터링

- **Supabase Dashboard**: https://supabase.com/dashboard/project/zxszrqmeqhxazgabaubz
- **Database**: 테이블, 쿼리 실행
- **Logs**: 실시간 로그 확인
- **Storage**: 파일 스토리지
- **Auth**: 사용자 관리

## 문제 해결

### Connection pooling 오류
```typescript
// prepare: false 필수
const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
});
```

### RLS 정책 오류
```sql
-- 개발중 임시 비활성화
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### 연결 타임아웃
```typescript
const client = postgres(connectionString, {
  connect_timeout: 10,
  idle_timeout: 20,
});
```

## 체크리스트

- [ ] Supabase Dashboard에서 연결 정보 복사
- [ ] .env.local 파일 생성 및 설정
- [ ] npm install 실행
- [ ] package.json 스크립트 추가
- [ ] npm run supabase:setup 실행
- [ ] 데이터 마이그레이션 (선택)
- [ ] RLS 설정 (권장)
- [ ] 로컬 테스트
- [ ] Vercel 환경변수 설정
- [ ] 배포 및 테스트

## 예상 소요 시간: 15-20분

준비가 되셨다면 위 체크리스트를 순서대로 진행해주세요! 🚀