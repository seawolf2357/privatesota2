# Supabase PostgreSQL 통합 계획서

## 1. 프로젝트 정보

### Supabase 프로젝트
- **Project URL**: https://zxszrqmeqhxazgabaubz.supabase.co
- **Project ID**: zxszrqmeqhxazgabaubz
- **Database**: PostgreSQL 15+
- **Region**: 자동 선택됨

### 현재 상황
- **현재 DB**: SQLite (./data/chat.db)
- **목표 DB**: Supabase PostgreSQL
- **ORM**: Drizzle ORM
- **Framework**: Next.js 15

## 2. Supabase 연결 정보 획득

### Dashboard에서 확인
1. https://supabase.com/dashboard/project/zxszrqmeqhxazgabaubz/settings/database 접속
2. Connection string 복사:
   - **Direct connection**: PostgreSQL 직접 연결
   - **Connection pooling**: Supavisor 풀링 연결 (권장)

### 연결 문자열 형식
```
# Direct connection (migrations용)
postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Connection pooling (앱 연결용)
postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 3. 환경 변수 설정

### .env.local
```env
# Supabase Configuration
SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
SUPABASE_ANON_KEY=[Dashboard에서 복사]
SUPABASE_SERVICE_KEY=[Dashboard에서 복사 - 선택사항]

# Database URLs
DATABASE_URL=[Connection pooling URL]
DATABASE_URL_NON_POOLED=[Direct connection URL]

# Feature flags
USE_SUPABASE=true
USE_POSTGRES=true
```

## 4. 패키지 설치

```bash
# Supabase 클라이언트
npm install @supabase/supabase-js @supabase/ssr

# PostgreSQL 드라이버
npm install postgres

# Drizzle PostgreSQL
npm install drizzle-orm
```

## 5. Drizzle 설정

### drizzle.config.supabase.ts
```typescript
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations-supabase',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_NON_POOLED!, // migrations는 직접 연결 사용
  },
  verbose: true,
  strict: true,
});
```

## 6. 데이터베이스 클라이언트

### lib/db/supabase-client.ts
```typescript
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Supabase 클라이언트 (Auth, Realtime, Storage 등)
export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Drizzle ORM 클라이언트 (데이터베이스 쿼리)
export function getSupabaseDb() {
  const connectionString = process.env.DATABASE_URL!;
  
  const client = postgres(connectionString, {
    prepare: false, // Supavisor pooling 사용시 필수
    ssl: 'require',
  });
  
  return drizzle(client, { schema });
}
```

## 7. 스키마 마이그레이션

### Step 1: 스키마 생성
```bash
# 마이그레이션 파일 생성
npx drizzle-kit generate --config=drizzle.config.supabase.ts

# 스키마 푸시 (빠른 개발)
npx drizzle-kit push --config=drizzle.config.supabase.ts
```

### Step 2: 마이그레이션 실행
```bash
# 마이그레이션 적용
npm run db:migrate:supabase
```

## 8. 데이터 마이그레이션

### SQLite → Supabase
```bash
# 1. SQLite 데이터 내보내기
npm run db:export:sqlite

# 2. Supabase로 가져오기
npm run db:import:supabase

# 3. 검증
npm run db:validate:supabase
```

## 9. Supabase 특화 기능

### 9.1 Row Level Security (RLS)
```sql
-- Supabase Dashboard SQL Editor에서 실행

-- RLS 활성화
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 9.2 Realtime 구독
```typescript
// 실시간 메시지 구독
const supabase = getSupabaseClient();

const channel = supabase
  .channel('messages')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages' 
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```

### 9.3 Storage 통합
```typescript
// 파일 업로드
const { data, error } = await supabase.storage
  .from('attachments')
  .upload('path/to/file', file);
```

## 10. package.json 스크립트

```json
{
  "scripts": {
    // Supabase 전용
    "db:generate:supabase": "drizzle-kit generate --config=drizzle.config.supabase.ts",
    "db:push:supabase": "drizzle-kit push --config=drizzle.config.supabase.ts",
    "db:migrate:supabase": "tsx scripts/migrate-supabase.ts",
    "db:studio:supabase": "drizzle-kit studio --config=drizzle.config.supabase.ts",
    
    // 데이터 마이그레이션
    "db:export:sqlite": "tsx scripts/export-sqlite.ts",
    "db:import:supabase": "tsx scripts/import-supabase.ts",
    "db:validate:supabase": "tsx scripts/validate-supabase.ts",
    
    // Supabase 유틸리티
    "supabase:setup": "npm run db:generate:supabase && npm run db:push:supabase",
    "supabase:types": "npx supabase gen types typescript --project-id zxszrqmeqhxazgabaubz > lib/db/supabase-types.ts"
  }
}
```

## 11. Vercel 배포 설정

### 환경 변수
Vercel Dashboard에서 설정:
```
SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
SUPABASE_ANON_KEY=[Supabase Dashboard에서 복사]
DATABASE_URL=[Connection pooling URL]
DATABASE_URL_NON_POOLED=[Direct connection URL]
USE_SUPABASE=true
```

## 12. 보안 고려사항

### API Key 관리
- **Anon Key**: 클라이언트 사이드 가능 (RLS 필수)
- **Service Key**: 서버 사이드만 (절대 노출 금지)

### RLS 필수 테이블
- users
- chats
- messages
- documents
- votes

### 백업 전략
- Supabase Dashboard에서 자동 백업 설정
- Point-in-time recovery 활성화

## 13. 모니터링

### Supabase Dashboard
- https://supabase.com/dashboard/project/zxszrqmeqhxazgabaubz
- Database 메뉴: 쿼리 성능, 인덱스
- Logs 메뉴: 실시간 로그
- Reports 메뉴: 사용량 통계

### 성능 최적화
```sql
-- 자주 사용되는 쿼리에 인덱스 추가
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_chats_user_id ON chats(user_id);
```

## 14. 무료 티어 한계

- **Database**: 500MB
- **Storage**: 1GB
- **Bandwidth**: 2GB/월
- **Edge Functions**: 500,000 호출/월
- **Realtime**: 200 동시 연결

## 15. 체크리스트

### 초기 설정
- [ ] Supabase Dashboard 접속
- [ ] Database 연결 정보 복사
- [ ] .env.local 파일 설정
- [ ] npm 패키지 설치

### 스키마 설정
- [ ] Drizzle 설정 파일 생성
- [ ] 스키마 생성/푸시
- [ ] RLS 정책 설정

### 데이터 마이그레이션
- [ ] SQLite 데이터 내보내기
- [ ] Supabase로 가져오기
- [ ] 데이터 검증

### 배포
- [ ] Vercel 환경변수 설정
- [ ] 프로덕션 배포
- [ ] 모니터링 확인

## 16. 문제 해결

### Connection pooling 오류
```typescript
// pgbouncer 모드에서는 prepare 비활성화
const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
});
```

### RLS 오류
```sql
-- 개발중에는 임시로 비활성화 가능
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### 타임아웃 오류
```typescript
// 연결 타임아웃 증가
const client = postgres(connectionString, {
  connect_timeout: 10,
  idle_timeout: 20,
});
```