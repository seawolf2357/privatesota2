# Vercel 배포 가이드

## 1. Vercel 환경변수 설정

Vercel Dashboard → Settings → Environment Variables에서 설정:

### 필수 환경변수
```bash
# Supabase Database (Production & Preview)
DATABASE_URL=postgresql://postgres.zxszrqmeqhxazgabaubz:hvKnFCSYZ1al15X6@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DATABASE_URL_NON_POOLED=postgresql://postgres.zxszrqmeqhxazgabaubz:hvKnFCSYZ1al15X6@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres

# Supabase Configuration
SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
USE_SUPABASE=true

# Auth (기존 설정 유지)
AUTH_SECRET=[기존 값 또는 새로 생성]

# AI Providers (기존 설정 유지)
XAI_API_KEY=[기존 값]
OPENAI_API_KEY=[기존 값]
FIREWORKS_API_KEY=[기존 값]
```

### 선택적 환경변수
```bash
# Supabase Public Keys (클라이언트에서 사용시)
NEXT_PUBLIC_SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase Dashboard에서 복사]

# Node Environment
NODE_ENV=production
```

## 2. 배포 전 체크리스트

### 로컬 테스트
```bash
# Supabase 연결 테스트
npm run supabase:test

# 프로덕션 빌드 테스트
npm run build
npm run start
```

### 데이터베이스 준비
- [ ] Supabase 테이블 생성 완료
- [ ] 초기 데이터 마이그레이션 완료
- [ ] RLS 정책 설정 (선택)

## 3. Vercel 배포

### GitHub 연동 (권장)
1. GitHub에 코드 푸시
2. Vercel에서 Import Project
3. Environment Variables 설정
4. Deploy

### Vercel CLI 사용
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 4. 배포 후 확인

### 헬스 체크
```bash
# API 테스트
curl https://[your-app].vercel.app/api/db-test

# 앱 접속
https://[your-app].vercel.app
```

### 모니터링
- Vercel Dashboard → Functions → Logs
- Supabase Dashboard → Logs

## 5. 문제 해결

### 데이터베이스 연결 오류
- DATABASE_URL이 올바른지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- Region이 ap-northeast-2 (Seoul)인지 확인

### 빌드 오류
```bash
# package.json build 스크립트 확인
"build": "tsx lib/db/migrate && next build"

# 마이그레이션 스크립트가 필요한 경우 수정:
"build": "next build"
```

### 타임아웃 오류
- Vercel Function timeout 설정 (기본 10초)
- vercel.json에서 설정 가능:
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## 6. 보안 설정

### RLS (Row Level Security)
Supabase SQL Editor에서 실행:
```sql
-- 프로덕션용 RLS 정책
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserMemory" ENABLE ROW LEVEL SECURITY;

-- 예시: 사용자는 자신의 데이터만 볼 수 있음
CREATE POLICY "Users can view own chats" ON "Chat"
  FOR SELECT USING (auth.uid()::text = "userId"::text);
```

### 환경변수 보안
- 민감한 정보는 Vercel 환경변수에만 저장
- 클라이언트 코드에 하드코딩 금지
- NEXT_PUBLIC_ 접두사는 클라이언트 노출 주의

## 7. 성능 최적화

### 데이터베이스 인덱스
```sql
-- Supabase SQL Editor에서 실행
CREATE INDEX idx_chat_userid ON "Chat"("userId");
CREATE INDEX idx_message_chatid ON "Message_v2"("chatId");
CREATE INDEX idx_chat_createdat ON "Chat"("createdAt" DESC);
```

### Edge Functions
- Vercel Edge Runtime 사용 고려
- app/api 라우트에 runtime = 'edge' 추가

## 8. 백업 전략

### 자동 백업
- Supabase: 일일 자동 백업 (Pro 플랜)
- Point-in-time recovery 설정

### 수동 백업
```bash
# 데이터 내보내기
pg_dump [connection_string] > backup.sql

# 또는 Supabase Dashboard에서 다운로드
```

## 예상 소요 시간: 10-15분

준비가 완료되면 Vercel Dashboard에서 환경변수 설정 후 배포하세요! 🚀