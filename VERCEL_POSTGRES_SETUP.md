# Vercel Postgres 설정 가이드

## 1. Vercel Dashboard에서 데이터베이스 생성

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **Storage** 탭
3. **Create Database** 클릭
4. **Postgres** 선택
5. 데이터베이스 이름 입력 (예: `privatesota2-db`)
6. Region 선택 (가장 가까운 지역)
7. **Create** 클릭

## 2. 환경 변수 자동 설정

Vercel이 자동으로 다음 환경 변수를 설정합니다:
- `POSTGRES_URL` - 연결 문자열
- `POSTGRES_PRISMA_URL` - Prisma용 연결 문자열
- `POSTGRES_URL_NON_POOLING` - 직접 연결용
- `POSTGRES_USER` - 사용자명
- `POSTGRES_HOST` - 호스트
- `POSTGRES_PASSWORD` - 비밀번호
- `POSTGRES_DATABASE` - 데이터베이스명

## 3. 로컬 개발 환경 설정

```bash
# Vercel CLI 설치 (이미 설치되어 있다면 스킵)
npm i -g vercel

# Vercel 프로젝트 연결
vercel link

# 환경 변수 가져오기
vercel env pull .env.local
```

## 4. 데이터베이스 마이그레이션

### 초기 테이블 생성 SQL

```sql
-- User 테이블
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session 테이블
CREATE TABLE IF NOT EXISTS "Session" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Conversation 테이블
CREATE TABLE IF NOT EXISTS "Conversation" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Message 테이블
CREATE TABLE IF NOT EXISTS "Message" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES "Conversation"(id) ON DELETE CASCADE
);

-- Document 테이블
CREATE TABLE IF NOT EXISTS "Document" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    kind TEXT NOT NULL DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Suggestion 테이블
CREATE TABLE IF NOT EXISTS "Suggestion" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    document_id TEXT,
    document_created_at TIMESTAMP,
    original_text TEXT NOT NULL,
    suggested_text TEXT NOT NULL,
    description TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- UserMemory 테이블
CREATE TABLE IF NOT EXISTS "UserMemory" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    source_session_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON "Conversation"(user_id);
CREATE INDEX IF NOT EXISTS idx_message_conversation_id ON "Message"(conversation_id);
CREATE INDEX IF NOT EXISTS idx_document_user_id ON "Document"(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_user_id ON "Suggestion"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON "UserMemory"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_category ON "UserMemory"(category);

-- 초기 사용자 데이터 (옵션)
INSERT INTO "User" (id, email, password) 
VALUES ('demo-user', 'demo@example.com', NULL)
ON CONFLICT (id) DO NOTHING;
```

## 5. Vercel Dashboard에서 SQL 실행

1. Vercel Dashboard → Storage → 생성한 데이터베이스 선택
2. **Query** 탭 클릭
3. 위의 SQL 복사하여 붙여넣기
4. **Run Query** 실행

## 6. 배포 전 체크리스트

- [x] `@vercel/postgres` 패키지 설치
- [ ] Vercel Dashboard에서 Postgres 데이터베이스 생성
- [ ] 환경 변수 설정 확인
- [ ] 테이블 생성 SQL 실행
- [ ] `lib/db.ts`에서 자동 전환 로직 확인

## 7. 연결 테스트

```typescript
// lib/db.ts 수정 사항
import { sql } from '@vercel/postgres';

// Vercel Postgres 사용시
if (process.env.POSTGRES_URL) {
  // Vercel Postgres 연결
  const result = await sql`SELECT NOW()`;
  console.log('Connected to Vercel Postgres:', result);
}
```

## 8. 트러블슈팅

### 연결 오류
- Vercel Dashboard에서 데이터베이스 상태 확인
- 환경 변수가 제대로 설정되었는지 확인
- IP 화이트리스트 설정 확인 (필요시)

### 마이그레이션 오류
- SQL 구문이 PostgreSQL 호환인지 확인
- 테이블 이름의 대소문자 확인 (PostgreSQL은 대소문자 구분)
- 외래 키 제약 조건 순서 확인