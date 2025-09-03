-- Supabase Row Level Security (RLS) 설정
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요
-- Dashboard: https://supabase.com/dashboard/project/zxszrqmeqhxazgabaubz/sql/new

-- ================================================
-- 1. RLS 활성화
-- ================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UploadedFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SearchCache" ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 2. 개발/테스트용 정책 (모든 접근 허용)
-- 주의: 프로덕션 전에 반드시 수정하세요!
-- ================================================

-- User 테이블: 모든 사용자가 읽기 가능, 자신의 데이터만 수정
CREATE POLICY "Users can read all users" ON "User"
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Chat 테이블: 자신의 채팅만 접근 가능
CREATE POLICY "Users can view own chats" ON "Chat"
  FOR SELECT USING (
    auth.uid()::text = "userId"::text 
    OR visibility = 'public'
  );

CREATE POLICY "Users can create own chats" ON "Chat"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can update own chats" ON "Chat"
  FOR UPDATE USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can delete own chats" ON "Chat"
  FOR DELETE USING (auth.uid()::text = "userId"::text);

-- Message_v2 테이블: 자신의 채팅 메시지만 접근
CREATE POLICY "Users can view messages in own chats" ON "Message_v2"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Chat" 
      WHERE "Chat".id = "Message_v2"."chatId" 
      AND "Chat"."userId"::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create messages in own chats" ON "Message_v2"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Chat" 
      WHERE "Chat".id = "Message_v2"."chatId" 
      AND "Chat"."userId"::text = auth.uid()::text
    )
  );

-- UserMemory 테이블: 자신의 메모리만 접근
CREATE POLICY "Users can view own memories" ON "UserMemory"
  FOR SELECT USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can create own memories" ON "UserMemory"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can update own memories" ON "UserMemory"
  FOR UPDATE USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can delete own memories" ON "UserMemory"
  FOR DELETE USING (auth.uid()::text = "userId"::text);

-- UploadedFile 테이블: 자신의 파일만 접근
CREATE POLICY "Users can view own files" ON "UploadedFile"
  FOR SELECT USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can upload own files" ON "UploadedFile"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can delete own files" ON "UploadedFile"
  FOR DELETE USING (auth.uid()::text = "userId"::text);

-- ================================================
-- 3. 서비스 역할용 정책 (서버 사이드)
-- ================================================

-- 서비스 키를 사용하는 경우 모든 접근 허용
CREATE POLICY "Service role has full access to User" ON "User"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to Chat" ON "Chat"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to Message_v2" ON "Message_v2"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to UserMemory" ON "UserMemory"
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- 4. 익명 사용자용 임시 정책 (개발용)
-- 주의: 프로덕션에서는 제거하세요!
-- ================================================

-- 데모 사용자 (00000000-0000-0000-0000-000000000001)에 대한 접근 허용
CREATE POLICY "Allow anonymous access to demo user" ON "User"
  FOR SELECT USING (id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Allow anonymous access to demo chats" ON "Chat"
  FOR ALL USING ("userId" = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Allow anonymous access to demo messages" ON "Message_v2"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Chat" 
      WHERE "Chat".id = "Message_v2"."chatId" 
      AND "Chat"."userId" = '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY "Allow anonymous access to demo memories" ON "UserMemory"
  FOR ALL USING ("userId" = '00000000-0000-0000-0000-000000000001'::uuid);

-- ================================================
-- 5. 검증 쿼리
-- ================================================

-- RLS 상태 확인
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;