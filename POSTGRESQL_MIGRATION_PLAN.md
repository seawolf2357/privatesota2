# PostgreSQL 전환 계획서

## 1. 개요

### 목적
- 로컬 개발 환경과 Vercel 프로덕션 환경 간의 데이터베이스 일관성 확보
- SQLite에서 PostgreSQL로의 점진적 마이그레이션
- 개발/프로덕션 환경별 유연한 데이터베이스 전환 지원

### 현재 상황
- **개발 환경**: SQLite (./data/chat.db)
- **프로덕션 환경**: PostgreSQL (Vercel Postgres)
- **ORM**: Drizzle ORM
- **스키마**: 통합 스키마 파일 사용 중

## 2. 마이그레이션 전략

### 2.1 듀얼 데이터베이스 지원 방식
환경 변수를 통한 데이터베이스 자동 선택:
```
USE_POSTGRES=true  # PostgreSQL 사용
USE_POSTGRES=false # SQLite 사용 (기본값)
```

### 2.2 단계별 전환 계획

#### Phase 1: 인프라 준비 (Week 1)
- [ ] 로컬 PostgreSQL Docker 환경 구성
- [ ] 환경 변수 기반 DB 선택 로직 구현
- [ ] 마이그레이션 스크립트 작성

#### Phase 2: 스키마 호환성 확보 (Week 2)
- [ ] SQLite/PostgreSQL 호환 스키마 검증
- [ ] 데이터 타입 매핑 테이블 작성
- [ ] 인덱스 및 제약조건 최적화

#### Phase 3: 데이터 마이그레이션 (Week 3)
- [ ] 기존 SQLite 데이터 백업
- [ ] 데이터 변환 스크립트 실행
- [ ] 데이터 무결성 검증

#### Phase 4: 애플리케이션 통합 (Week 4)
- [ ] DB 추상화 레이어 구현
- [ ] 연결 풀링 최적화
- [ ] 트랜잭션 처리 통합

## 3. 기술적 구현

### 3.1 Docker Compose 설정
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chatbot_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
```

### 3.2 환경 변수 구성
```env
# .env.local (개발환경)
USE_POSTGRES=false
DATABASE_URL=./data/chat.db

# PostgreSQL 사용 시
USE_POSTGRES=true
POSTGRES_URL=postgresql://dev_user:dev_password@localhost:5432/chatbot_dev

# .env.production (프로덕션)
USE_POSTGRES=true
POSTGRES_URL=${VERCEL_POSTGRES_URL}
```

### 3.3 데이터베이스 연결 추상화
```typescript
// lib/db/client.ts
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';

export function getDbClient() {
  const usePostgres = process.env.USE_POSTGRES === 'true';
  
  if (usePostgres) {
    const connectionString = process.env.POSTGRES_URL!;
    const client = postgres(connectionString);
    return drizzlePostgres(client);
  } else {
    const sqlite = new Database(process.env.DATABASE_URL || './data/chat.db');
    return drizzleSqlite(sqlite);
  }
}
```

## 4. 스키마 호환성 매핑

### 데이터 타입 변환 테이블
| SQLite | PostgreSQL | 비고 |
|--------|------------|------|
| TEXT | TEXT/VARCHAR | 길이 제한 고려 |
| INTEGER | INTEGER/SERIAL | Auto-increment 처리 |
| REAL | DECIMAL/NUMERIC | 정밀도 설정 |
| BLOB | BYTEA | 바이너리 데이터 |
| DATETIME | TIMESTAMP | 시간대 처리 주의 |

### 주요 고려사항
- UUID 생성 방식 통일 (nanoid 사용)
- JSON 필드 처리 (JSONB 활용)
- 전문 검색 인덱스 (GIN 인덱스)
- CASCADE 삭제 규칙 일관성

## 5. 마이그레이션 스크립트

### 5.1 데이터 내보내기 (SQLite → JSON)
```bash
# scripts/export-sqlite.ts
npm run db:export:sqlite
```

### 5.2 데이터 가져오기 (JSON → PostgreSQL)
```bash
# scripts/import-postgres.ts
npm run db:import:postgres
```

### 5.3 데이터 검증
```bash
# scripts/validate-migration.ts
npm run db:validate
```

## 6. package.json 스크립트 추가

```json
{
  "scripts": {
    // 기존 스크립트 유지
    "db:setup": "npm run db:setup:auto",
    "db:setup:auto": "node scripts/setup-db.js",
    "db:setup:sqlite": "npm run db:generate:sqlite && npm run db:migrate:sqlite",
    "db:setup:postgres": "npm run db:generate:postgres && npm run db:migrate:postgres",
    
    // PostgreSQL 전용
    "db:generate:postgres": "drizzle-kit generate --config=drizzle.config.ts",
    "db:migrate:postgres": "tsx lib/db/migrate.ts",
    "db:studio:postgres": "drizzle-kit studio --config=drizzle.config.ts",
    
    // 마이그레이션 도구
    "db:export:sqlite": "tsx scripts/export-sqlite.ts",
    "db:import:postgres": "tsx scripts/import-postgres.ts",
    "db:validate": "tsx scripts/validate-migration.ts",
    
    // Docker 관리
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:reset": "docker-compose down -v && docker-compose up -d"
  }
}
```

## 7. 성능 최적화

### 7.1 연결 풀링 설정
```typescript
// PostgreSQL 연결 풀
const pool = postgres(connectionString, {
  max: 20,                // 최대 연결 수
  idle_timeout: 30,       // 유휴 타임아웃
  connect_timeout: 10,    // 연결 타임아웃
});
```

### 7.2 인덱스 전략
- 자주 조회되는 컬럼에 인덱스 추가
- 복합 인덱스 최적화
- 부분 인덱스 활용

### 7.3 쿼리 최적화
- N+1 문제 해결 (JOIN 활용)
- 배치 삽입/업데이트
- 쿼리 캐싱 전략

## 8. 모니터링 및 백업

### 8.1 모니터링
- 쿼리 성능 로깅
- 연결 풀 상태 모니터링
- 에러 트래킹 (Sentry 연동)

### 8.2 백업 전략
- 일일 자동 백업 (cron)
- 마이그레이션 전 스냅샷
- 롤백 프로시저 준비

## 9. 테스트 계획

### 9.1 단위 테스트
- 각 데이터베이스 어댑터 테스트
- 스키마 호환성 테스트
- 데이터 타입 변환 테스트

### 9.2 통합 테스트
- 엔드투엔드 시나리오 테스트
- 부하 테스트
- 동시성 테스트

### 9.3 마이그레이션 테스트
- 데이터 무결성 검증
- 성능 비교 테스트
- 롤백 시나리오 테스트

## 10. 위험 관리

### 주요 위험 요소
1. **데이터 손실**: 백업 및 검증 프로세스 강화
2. **다운타임**: Blue-Green 배포 전략 적용
3. **성능 저하**: 점진적 마이그레이션 및 모니터링
4. **호환성 문제**: 철저한 테스트 및 단계별 전환

### 롤백 계획
1. 마이그레이션 전 전체 백업
2. 환경 변수 토글로 즉시 전환 가능
3. 데이터 동기화 스크립트 준비

## 11. 타임라인

| 단계 | 기간 | 주요 작업 |
|------|------|----------|
| 준비 | 1주 | Docker 환경 구성, 스크립트 작성 |
| 개발 | 2주 | DB 추상화 레이어, 마이그레이션 도구 |
| 테스트 | 1주 | 통합 테스트, 성능 테스트 |
| 전환 | 1주 | 단계별 마이그레이션, 모니터링 |
| 안정화 | 1주 | 버그 수정, 최적화 |

## 12. 체크리스트

### 개발 환경
- [ ] Docker PostgreSQL 설정
- [ ] 환경 변수 구성
- [ ] DB 클라이언트 추상화
- [ ] 마이그레이션 스크립트

### 스키마 및 데이터
- [ ] 스키마 호환성 검증
- [ ] 데이터 타입 매핑
- [ ] 인덱스 최적화
- [ ] 데이터 마이그레이션

### 애플리케이션
- [ ] 연결 로직 수정
- [ ] 쿼리 호환성 확인
- [ ] 에러 핸들링
- [ ] 로깅 구현

### 테스트
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 성능 테스트
- [ ] 롤백 테스트

### 배포
- [ ] 스테이징 환경 테스트
- [ ] 프로덕션 백업
- [ ] 점진적 배포
- [ ] 모니터링 설정

## 13. 참고 자료

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Main_Page)
- [Vercel Postgres Guide](https://vercel.com/docs/storage/vercel-postgres)
- [Database Migration Patterns](https://www.prisma.io/dataguide/types/relational/migration-strategies)