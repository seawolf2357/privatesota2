import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Supabase 클라이언트 싱글톤
let supabaseInstance: ReturnType<typeof createClient> | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Supabase 클라이언트 (Auth, Realtime, Storage 등)
 */
export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required');
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  
  return supabaseInstance;
}

/**
 * Drizzle ORM 클라이언트 (데이터베이스 쿼리)
 * Connection pooling 사용 (Supavisor)
 */
export function getSupabaseDb() {
  if (drizzleInstance) {
    return drizzleInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }
  
  // Supavisor pooling 사용시 prepare: false 필수
  const client = postgres(connectionString, {
    prepare: false,
    ssl: 'require',
    max: 10, // 최대 연결 수
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  drizzleInstance = drizzle(client, { schema });
  
  console.log('Connected to Supabase PostgreSQL');
  return drizzleInstance;
}

/**
 * 직접 연결 클라이언트 (마이그레이션용)
 */
export function getSupabaseDirectDb() {
  const connectionString = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL_NON_POOLED is not defined');
  }
  
  const client = postgres(connectionString, {
    ssl: 'require',
    max: 1, // 마이그레이션은 단일 연결
  });
  
  return drizzle(client, { schema });
}

/**
 * 연결 테스트
 */
export async function testSupabaseConnection() {
  try {
    // Drizzle 연결 테스트
    const db = getSupabaseDb();
    await db.execute('SELECT 1');
    console.log('✅ Drizzle connection successful');
    
    // Supabase 클라이언트 테스트
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('_test_').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') { // 테이블 없음 에러는 무시
      console.warn('⚠️ Supabase client test failed:', error);
    } else {
      console.log('✅ Supabase client connection successful');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

/**
 * 데이터베이스 정보 조회
 */
export async function getSupabaseDatabaseInfo() {
  const db = getSupabaseDb();
  
  try {
    // 데이터베이스 크기
    const [dbSize] = await db.execute<{ size: string }>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    
    // 테이블 수
    const [tableCount] = await db.execute<{ count: string }>`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `;
    
    // PostgreSQL 버전
    const [versionInfo] = await db.execute<{ version: string }>`
      SELECT version() as version
    `;
    
    // 현재 연결 수
    const [connections] = await db.execute<{ count: string }>`
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE state = 'active'
    `;
    
    return {
      size: dbSize.size,
      tableCount: tableCount.count,
      version: versionInfo.version,
      activeConnections: connections.count,
      projectId: 'zxszrqmeqhxazgabaubz',
      url: process.env.SUPABASE_URL,
    };
  } catch (error) {
    console.error('Failed to get database info:', error);
    throw error;
  }
}

/**
 * Realtime 구독 헬퍼
 */
export function subscribeToTable(
  tableName: string,
  callback: (payload: any) => void,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`${tableName}_changes`)
    .on(
      'postgres_changes',
      {
        event: eventType,
        schema: 'public',
        table: tableName,
      },
      callback
    )
    .subscribe();
  
  return channel;
}

/**
 * 클린업 함수
 */
export async function closeSupabaseConnections() {
  if (supabaseInstance) {
    await supabaseInstance.removeAllChannels();
    supabaseInstance = null;
  }
  
  if (drizzleInstance) {
    // PostgreSQL 연결 종료
    drizzleInstance = null;
  }
}