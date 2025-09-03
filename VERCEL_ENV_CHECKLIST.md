# Vercel 환경변수 체크리스트

## 📋 필수 환경변수 (Required)

### 1. 데이터베이스 (Supabase PostgreSQL) ✅
```bash
DATABASE_URL=postgresql://postgres.zxszrqmeqhxazgabaubz:hvKnFCSYZ1al15X6@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DATABASE_URL_NON_POOLED=postgresql://postgres.zxszrqmeqhxazgabaubz:hvKnFCSYZ1al15X6@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
USE_SUPABASE=true
USE_POSTGRES=true
```

### 2. 인증 (Auth) ⚠️
```bash
AUTH_SECRET=[32자 이상 랜덤 문자열 필수]
```
**생성 방법:**
- https://generate-secret.vercel.app/32 
- 또는 `openssl rand -base64 32`

### 3. AI Provider - Yuri AI Assistant ✅
```bash
# Friendli AI (Discord Bot Yuri와 동일)
FRIENDLI_API_KEY=flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc
FRIENDLI_MODEL=dep86pjolcjjnv8
FRIENDLI_URL=https://api.friendli.ai/dedicated/v1/chat/completions

# Brave Search API (웹 검색 기능)
BRAVE_API_KEY=BSATuVibxAHpOQPqVUFfNUa9L1s6x3F
```

## 📦 선택 환경변수 (Optional)

### 4. Vercel Storage
```bash
# Blob Storage (파일 업로드)
BLOB_READ_WRITE_TOKEN=[your_token]

# Redis (캐싱)
REDIS_URL=[your_redis_url]
```

### 5. Public 환경변수 (클라이언트 노출)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://zxszrqmeqhxazgabaubz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase Dashboard에서 복사]
```

## ⚙️ Vercel Dashboard 설정 방법

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - Your Project → Settings → Environment Variables

2. **환경변수 추가**
   - 위의 모든 필수 변수 추가
   - Production, Preview, Development 모두 체크

3. **우선순위**
   - Production: 실제 서비스
   - Preview: PR 배포
   - Development: 개발 환경

## ✅ 최종 체크리스트

- [ ] `DATABASE_URL` - Supabase pooling URL 설정
- [ ] `DATABASE_URL_NON_POOLED` - Direct connection URL 설정  
- [ ] `SUPABASE_URL` - 프로젝트 URL 설정
- [ ] `USE_SUPABASE=true` - Supabase 사용 플래그
- [ ] `AUTH_SECRET` - 32자 이상 보안 키 생성
- [ ] `FRIENDLI_API_KEY` - Yuri AI 설정 완료 ✅
- [ ] `FRIENDLI_MODEL` - 모델 ID 설정 완료 ✅
- [ ] `FRIENDLI_URL` - API 엔드포인트 설정 완료 ✅
- [ ] `BRAVE_API_KEY` - 웹 검색 API 설정 완료 ✅
- [ ] (선택) `BLOB_READ_WRITE_TOKEN` - 파일 업로드 필요시
- [ ] (선택) `REDIS_URL` - 캐싱 필요시

## 🚨 주의사항

1. **AUTH_SECRET**는 반드시 고유하고 안전한 값 사용
2. **API 키**는 절대 GitHub에 커밋하지 않음
3. **DATABASE_URL**의 비밀번호 부분 노출 주의
4. **NEXT_PUBLIC_** 접두사는 클라이언트에 노출됨

## 📝 배포 명령

```bash
# GitHub 연동 후
git push origin main

# 또는 Vercel CLI
vercel --prod
```

## 🔍 배포 확인

1. Vercel Dashboard → Functions → Logs
2. https://[your-app].vercel.app/api/db-test
3. Supabase Dashboard → Database → Logs

---

**준비 완료!** 위 체크리스트를 모두 확인했다면 Vercel에 배포할 준비가 완료되었습니다. 🚀