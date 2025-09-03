# Neon PostgreSQL 통합 계획서

## 1. 개요

### Neon 선택 이유
- **Vercel 공식 파트너십**: 원클릭 통합, 자동 환경변수 설정
- **Serverless 아키텍처**: 자동 스케일링, Cold start 없음
- **브랜치 기능**: 개발/스테이징/프로덕션 환경 분리
- **무료 티어**: 3GB 스토리지, 충분한 컴퓨팅 리소스

### 프로젝트 정보
- **프로젝트명**: PrivateSOTA2 AI Chatbot
- **현재 DB**: SQLite (로컬)
- **목표 DB**: Neon PostgreSQL (클라우드)
- **ORM**: Drizzle ORM

## 2. Neon 계정 및 프로젝트 설정

### 2.1 계정 생성
1. [Neon Console](https://console.neon.tech) 접속
2. GitHub 계정으로 가입 (Vercel 연동 용이)
3. 무료 티어 선택

### 2.2 프로젝트 생성
```yaml
Project Settings:
  Name: privatesota2-chatbot
  Region: AWS us-west-2 (또는 Asia-Pacific)
  PostgreSQL Version: 16
  Compute Size: Autoscaling (0.25-0.5 CU)
```

### 2.3 데이터베이스 브랜치 구조
```
main (Production)
├── development (개발용)
└── staging (테스트용)
```

## 3. Vercel 통합

### 3.1 Vercel Dashboard에서 통합
1. Vercel 프로젝트 Settings → Integrations
2. "Add Integration" → Neon 선택
3. 권한 승인 및 프로젝트 연결
4. 자동 환경변수 생성:
   - `POSTGRES_URL` (pooled connection)
   - `POSTGRES_URL_NON_POOLED` (direct connection)
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### 3.2 환경별 설정
```bash
# Vercel Environment Variables
# Production
POSTGRES_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Preview (자동 브랜치 생성)
POSTGRES_URL_PREVIEW=postgresql://[user]:[password]@[branch-host]/[database]?sslmode=require

# Development (로컬)
POSTGRES_URL_DEV=postgresql://[user]:[password]@[dev-host]/[database]?sslmode=require
```

## 4. 코드 구현

### 4.1 패키지 업데이트
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "drizzle-orm": "^0.34.0",
    "postgres": "^3.4.4"
  }
}
```

### 4.2 데이터베이스 클라이언트 (lib/db/neon-client.ts)
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Edge Runtime 호환
export function getNeonClient() {
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not defined');
  }
  
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

// Node.js Runtime (migrations, scripts)
import { Pool } from '@neondatabase/serverless';

export function getNeonPool() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLED || process.env.POSTGRES_URL;
  
  const pool = new Pool({
    connectionString,
    ssl: true,
  });
  
  return pool;
}
```

### 4.3 환경별 자동 선택 (lib/db/index.ts)
```typescript
import { getNeonClient } from './neon-client';
import { getDbClient as getSqliteClient } from './client';

export function getDb() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';
  const useNeon = process.env.USE_NEON === 'true';
  
  // Vercel 환경 또는 명시적 Neon 사용
  if (isVercel || isProduction || useNeon) {
    return getNeonClient();
  }
  
  // 로컬 개발 환경
  return getSqliteClient();
}
```

## 5. 마이그레이션 전략

### 5.1 스키마 마이그레이션
```bash
# 1. Neon용 마이그레이션 생성
npx drizzle-kit generate --config=drizzle.config.neon.ts

# 2. 마이그레이션 실행
npm run db:migrate:neon

# 3. 스키마 확인
npm run db:studio:neon
```

### 5.2 데이터 마이그레이션 스크립트
```typescript
// scripts/migrate-to-neon.ts
import { exportSqliteToJson } from './export-sqlite';
import { importJsonToNeon } from './import-neon';

async function migrateToNeon() {
  console.log('Step 1: Exporting SQLite data...');
  const data = await exportSqliteToJson();
  
  console.log('Step 2: Creating Neon schema...');
  await createNeonSchema();
  
  console.log('Step 3: Importing data to Neon...');
  await importJsonToNeon(data);
  
  console.log('Step 4: Validating migration...');
  await validateNeonMigration();
  
  console.log('Migration completed successfully!');
}
```

## 6. Neon 특화 기능 활용

### 6.1 브랜치 자동화
```yaml
# .github/workflows/neon-branch.yml
name: Neon Branch Management

on:
  pull_request:
    types: [opened, closed]

jobs:
  manage-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Create Neon Branch
        if: github.event.action == 'opened'
        run: |
          curl -X POST https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches \
            -H "Authorization: Bearer $NEON_API_KEY" \
            -d '{"branch": {"name": "pr-${{ github.event.number }}"}}'
      
      - name: Delete Neon Branch
        if: github.event.action == 'closed'
        run: |
          curl -X DELETE https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches/pr-${{ github.event.number }} \
            -H "Authorization: Bearer $NEON_API_KEY"
```

### 6.2 연결 풀링 최적화
```typescript
// lib/db/neon-pool.ts
import { neonConfig } from '@neondatabase/serverless';

// WebSocket 연결 최적화
neonConfig.fetchConnectionCache = true;
neonConfig.wsProxy = (host) => `${host}/v2`;

// 연결 풀 설정
export const poolConfig = {
  // Serverless 환경 최적화
  max: 1, // Vercel 함수당 1개 연결
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
};
```

## 7. 모니터링 및 성능

### 7.1 Neon 대시보드 모니터링
- **Compute 사용량**: 자동 스케일링 모니터링
- **스토리지 사용량**: 3GB 한도 추적
- **쿼리 성능**: Slow query 분석
- **브랜치 관리**: 활성 브랜치 모니터링

### 7.2 성능 최적화
```typescript
// 읽기 전용 복제본 활용
const readReplica = neon(process.env.POSTGRES_URL_READ_REPLICA);

// 캐싱 전략
import { unstable_cache } from 'next/cache';

export const getCachedData = unstable_cache(
  async (userId: string) => {
    const db = getNeonClient();
    return await db.select().from(schema.users).where(eq(schema.users.id, userId));
  },
  ['user-data'],
  { revalidate: 60 } // 60초 캐시
);
```

## 8. 비용 관리

### 8.1 무료 티어 한계
- **Compute**: 월 300 compute-hours
- **Storage**: 3GB
- **브랜치**: 10개
- **데이터 전송**: 무제한

### 8.2 비용 최적화 전략
1. **자동 일시정지**: 5분 미사용시 자동 중지
2. **브랜치 자동 삭제**: PR 머지 후 삭제
3. **컴퓨팅 크기 조정**: 0.25 CU 시작
4. **불필요한 인덱스 제거**: 스토리지 절약

## 9. 보안 설정

### 9.1 연결 보안
```typescript
// SSL 강제
const connectionString = `${process.env.POSTGRES_URL}?sslmode=require`;

// IP 허용 목록 (Neon Console)
// Vercel IP 범위 자동 허용
```

### 9.2 환경변수 관리
```bash
# .env.local (로컬 개발)
POSTGRES_URL=postgresql://[dev-credentials]

# Vercel (프로덕션)
# 자동 주입됨 (Neon Integration)

# GitHub Secrets (CI/CD)
NEON_API_KEY=neon_api_key_xxxxx
NEON_PROJECT_ID=project_id_xxxxx
```

## 10. 실행 계획

### Week 1: 준비 및 설정
- [ ] Neon 계정 생성 및 프로젝트 설정
- [ ] Vercel Integration 연결
- [ ] 개발 브랜치 생성

### Week 2: 코드 구현
- [ ] Neon 클라이언트 구현
- [ ] 환경별 DB 선택 로직
- [ ] 마이그레이션 스크립트 작성

### Week 3: 데이터 마이그레이션
- [ ] SQLite 데이터 백업
- [ ] Neon 스키마 생성
- [ ] 데이터 이전 실행
- [ ] 데이터 검증

### Week 4: 배포 및 최적화
- [ ] Staging 환경 테스트
- [ ] Production 배포
- [ ] 성능 모니터링
- [ ] 최적화 적용

## 11. 롤백 계획

### 즉시 롤백 (환경변수)
```bash
# Vercel Dashboard
USE_NEON=false  # SQLite로 즉시 복귀
```

### 데이터 롤백
```bash
# Neon에서 SQLite로 역마이그레이션
npm run db:export:neon
npm run db:import:sqlite
```

## 12. 명령어 요약

```bash
# Neon 설정
npm run neon:setup          # 초기 설정
npm run neon:branch:create  # 브랜치 생성
npm run neon:branch:list    # 브랜치 목록
npm run neon:branch:delete  # 브랜치 삭제

# 마이그레이션
npm run db:generate:neon    # 마이그레이션 생성
npm run db:migrate:neon     # 마이그레이션 실행
npm run db:studio:neon      # Drizzle Studio

# 데이터 이전
npm run migrate:to:neon     # SQLite → Neon
npm run migrate:from:neon   # Neon → SQLite

# 모니터링
npm run neon:status         # 상태 확인
npm run neon:metrics        # 사용량 확인
```

## 13. 문제 해결 가이드

### 연결 오류
```typescript
// 타임아웃 증가
neonConfig.connectionTimeoutMillis = 5000;

// 재시도 로직
async function withRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 성능 이슈
1. 인덱스 확인 및 최적화
2. 쿼리 분석 (EXPLAIN ANALYZE)
3. 연결 풀 크기 조정
4. 캐싱 전략 검토

## 14. 참고 자료

- [Neon Documentation](https://neon.tech/docs)
- [Vercel + Neon Guide](https://vercel.com/docs/storage/neon)
- [Drizzle + Neon](https://orm.drizzle.team/docs/get-started-postgresql#neon)
- [Neon Branching](https://neon.tech/docs/guides/branching)