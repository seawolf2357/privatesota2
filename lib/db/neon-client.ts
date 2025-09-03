import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// WebSocket 최적화 설정
neonConfig.fetchConnectionCache = true;

// Edge Runtime용 HTTP 클라이언트
export function getNeonHttpClient() {
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not defined');
  }
  
  const sql = neon(connectionString);
  return drizzleNeonHttp(sql, { schema });
}

// Node.js Runtime용 Pool 클라이언트
export function getNeonPoolClient() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLED || process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not defined');
  }
  
  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 5 : 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  return drizzleNeonServerless(pool, { schema });
}

// 자동 선택 클라이언트
export function getNeonClient() {
  // Edge Runtime 환경 감지
  const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';
  
  if (isEdgeRuntime) {
    return getNeonHttpClient();
  }
  
  return getNeonPoolClient();
}

// 읽기 전용 복제본 (선택적)
export function getNeonReadReplica() {
  const replicaUrl = process.env.POSTGRES_URL_READ_REPLICA;
  
  if (!replicaUrl) {
    // 읽기 복제본이 없으면 기본 연결 사용
    return getNeonClient();
  }
  
  const sql = neon(replicaUrl);
  return drizzleNeonHttp(sql, { schema });
}

// 브랜치별 클라이언트
export function getNeonBranchClient(branchName?: string) {
  const baseUrl = process.env.POSTGRES_URL;
  
  if (!baseUrl || !branchName) {
    return getNeonClient();
  }
  
  // 브랜치 URL 구성 (Neon 형식)
  const branchUrl = baseUrl.replace(
    /@(.+?)\.neon\.tech/,
    `@${branchName}.${RegExp.$1}.neon.tech`
  );
  
  const sql = neon(branchUrl);
  return drizzleNeonHttp(sql, { schema });
}

// 재시도 로직이 포함된 쿼리 실행
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      
      console.warn(`Query failed, retrying... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw new Error('Max retries reached');
}

// 연결 상태 확인
export async function checkNeonConnection(): Promise<boolean> {
  try {
    const db = getNeonClient();
    await db.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Neon connection check failed:', error);
    return false;
  }
}

// 데이터베이스 정보 가져오기
export async function getNeonDatabaseInfo() {
  const db = getNeonClient();
  
  const [dbSize] = await db.execute<{ size: string }>`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `;
  
  const [tableCount] = await db.execute<{ count: string }>`
    SELECT COUNT(*) as count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  `;
  
  const [connectionInfo] = await db.execute<{ 
    version: string;
    current_database: string;
    current_user: string;
  }>`
    SELECT 
      version() as version,
      current_database() as current_database,
      current_user as current_user
  `;
  
  return {
    size: dbSize.size,
    tableCount: tableCount.count,
    ...connectionInfo,
  };
}