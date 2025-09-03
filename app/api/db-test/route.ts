import { NextResponse } from 'next/server';
import { db, getDatabaseInfo } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get database info
    const dbInfo = await getDatabaseInfo();
    
    // Test query
    let testResult;
    if (dbInfo.type === 'sqlite') {
      testResult = await db.execute(sql`SELECT 1 as test, datetime('now') as time`);
    } else {
      testResult = await db.execute(sql`SELECT 1 as test, NOW() as time`);
    }
    
    // Count tables data
    const counts: Record<string, number> = {};
    try {
      const tables = ['User', 'Chat', 'Message_v2', 'UserMemory'];
      for (const table of tables) {
        if (dbInfo.type === 'sqlite') {
          const result = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(table)}`);
          counts[table] = result[0]?.count || 0;
        } else {
          const result = await db.execute(sql`SELECT COUNT(*) as count FROM "${sql.raw(table)}"`);
          counts[table] = result[0]?.count || 0;
        }
      }
    } catch (e) {
      console.error('Error counting tables:', e);
    }
    
    return NextResponse.json({
      success: true,
      database: dbInfo,
      test: testResult[0],
      tableCounts: counts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Database test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}