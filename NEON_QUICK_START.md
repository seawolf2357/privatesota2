# Neon PostgreSQL 빠른 시작 가이드

## 1. Neon 계정 설정 (5분)

### Step 1: Neon 가입
1. [console.neon.tech](https://console.neon.tech) 접속
2. GitHub 계정으로 로그인
3. 무료 플랜 선택

### Step 2: 프로젝트 생성
```
Project Name: privatesota2
Region: US West (Oregon) 또는 Asia-Pacific
PostgreSQL Version: 16
```

### Step 3: 연결 정보 복사
Neon Dashboard에서 연결 문자열 복사:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

## 2. 로컬 환경 설정 (3분)

### Step 1: 환경 변수 설정
`.env.local` 파일 생성:
```env
# Neon PostgreSQL
USE_NEON=true
POSTGRES_URL=postgresql://[복사한 연결 문자열]

# 기존 SQLite (백업용)
USE_POSTGRES=false
DATABASE_URL=./data/chat.db
```

### Step 2: 패키지 설치
```bash
npm install @neondatabase/serverless
```

### Step 3: package.json 스크립트 추가
```json
{
  "scripts": {
    "db:generate:neon": "drizzle-kit generate --config=drizzle.config.neon.ts",
    "db:migrate:neon": "tsx lib/db/migrate-neon.ts",
    "db:studio:neon": "drizzle-kit studio --config=drizzle.config.neon.ts",
    "db:push:neon": "drizzle-kit push --config=drizzle.config.neon.ts",
    "neon:setup": "npm run db:generate:neon && npm run db:push:neon"
  }
}
```

## 3. 데이터베이스 초기화 (2분)

```bash
# Neon 스키마 생성
npm run neon:setup

# 확인
npm run db:studio:neon
```

## 4. Vercel 배포 설정 (5분)

### Step 1: Vercel Integration
1. Vercel Dashboard → Your Project → Settings → Integrations
2. "Browse Marketplace" → Neon 검색 → Install
3. Neon 프로젝트 연결

### Step 2: 자동 환경변수
Vercel이 자동으로 추가하는 변수:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLED`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### Step 3: 추가 환경변수
Vercel Dashboard에서 수동 추가:
```
USE_NEON=true
```

## 5. 코드 통합 (이미 완료됨)

### 데이터베이스 연결 (lib/db/index.ts)
```typescript
import { getNeonClient } from './neon-client';
import { getDbClient } from './client';

export function getDb() {
  const useNeon = process.env.USE_NEON === 'true';
  const isVercel = process.env.VERCEL === '1';
  
  if (useNeon || isVercel) {
    return getNeonClient();
  }
  
  return getDbClient(); // SQLite fallback
}
```

## 6. 데이터 마이그레이션 (선택사항)

### SQLite → Neon 이전
```bash
# 1. SQLite 데이터 내보내기
npm run db:export:sqlite

# 2. Neon으로 가져오기
npm run db:import:neon

# 3. 검증
npm run db:validate:neon
```

## 7. 테스트

### 로컬 테스트
```bash
# Neon 연결 테스트
USE_NEON=true npm run dev
```

### Vercel Preview
```bash
git add .
git commit -m "Add Neon PostgreSQL"
git push origin feature/neon
```

## 8. 모니터링

### Neon Dashboard
- [console.neon.tech](https://console.neon.tech) → Your Project
- Compute 사용량 확인
- Storage 사용량 확인 (3GB 무료)
- 브랜치 관리

### Vercel Functions 로그
- Vercel Dashboard → Functions → Logs
- 데이터베이스 연결 오류 확인

## 9. 일반적인 문제 해결

### 연결 오류
```typescript
// 타임아웃 증가
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  connectionTimeoutMillis: 10000, // 10초
});
```

### SSL 오류
```env
# sslmode 추가
POSTGRES_URL=postgresql://...?sslmode=require
```

### 권한 오류
```sql
-- Neon SQL Editor에서 실행
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO [username];
```

## 10. 비용 최적화 팁

### 자동 일시정지 활성화
Neon Dashboard → Settings → Compute → Auto-suspend after 5 minutes

### 불필요한 브랜치 삭제
```bash
# Neon CLI 사용
neon branches delete [branch-name]
```

### 인덱스 최적화
```sql
-- 자주 쿼리되는 컬럼에 인덱스 추가
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

## 체크리스트

- [ ] Neon 계정 생성
- [ ] 프로젝트 생성 및 연결 문자열 복사
- [ ] .env.local 파일 설정
- [ ] npm install @neondatabase/serverless
- [ ] npm run neon:setup 실행
- [ ] Vercel Integration 연결
- [ ] 로컬 테스트 (USE_NEON=true npm run dev)
- [ ] Vercel 배포 테스트
- [ ] 모니터링 설정

## 예상 소요 시간: 15-20분

준비되셨나요? 위 체크리스트를 따라 진행하시면 됩니다! 🚀