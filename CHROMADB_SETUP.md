# ChromaDB Setup Guide (선택사항)

## 개요

ChromaDB는 **선택적 기능**입니다. ChromaDB 없이도 앱이 정상적으로 작동하며, 기본 메모리 시스템이 사용됩니다.

ChromaDB를 사용하면 **시맨틱 검색** 기능이 추가되어 더 정확한 메모리 검색이 가능합니다.

## 현재 상태

✅ **ChromaDB 없이 정상 작동**
- 기본 메모리 시스템 사용
- 모든 CRUD 작업 정상 작동
- 카테고리별 필터링 작동

🔍 **ChromaDB 사용 시 추가 기능**
- 시맨틱 벡터 검색
- 관련 메모리 자동 추천
- 유사도 기반 메모리 검색

## ChromaDB 설치 방법 (선택)

### Option 1: Docker로 실행

```bash
# ChromaDB Docker 컨테이너 실행
docker run -d -p 8000:8000 chromadb/chroma

# 환경변수 설정
echo "CHROMA_URL=http://localhost:8000" >> .env.local
```

### Option 2: Python으로 실행

```bash
# ChromaDB 설치
pip install chromadb

# ChromaDB 서버 실행
chroma run --host localhost --port 8000 --path ./chroma_data
```

### Option 3: 별도 서버 사용

```bash
# .env.local에 외부 ChromaDB URL 설정
CHROMA_URL=https://your-chroma-server.com
```

## 환경변수 설정

```bash
# .env.local
CHROMA_URL=http://localhost:8000  # ChromaDB 서버 주소 (선택)
OPENAI_API_KEY=sk-...             # OpenAI API 키 (임베딩용, 선택)
```

## 확인 방법

### ChromaDB가 작동하는 경우:
```
[VectorMemory] ChromaDB client initialized
[VectorMemory] Added memory xxx to vector DB
```

### ChromaDB를 사용하지 않는 경우:
```
[VectorMemory] ChromaDB not available, vector search disabled
[VectorMemory] Skipping vector storage (ChromaDB unavailable)
```

## 문제 해결

### 1. ChromaDB 연결 실패

**증상:**
```
[VectorMemory] ChromaDB connection failed, disabling vector search
```

**해결:**
- ChromaDB 서버가 실행 중인지 확인
- 포트 8000이 사용 중인지 확인: `netstat -an | findstr 8000`
- 방화벽 설정 확인

### 2. OpenAI API 키 없음

**증상:**
```
[VectorMemory] Error generating embedding
```

**해결:**
- OpenAI API 키를 .env.local에 추가
- 또는 fallback 임베딩 사용 (자동)

## 성능 비교

### 기본 메모리 시스템 (ChromaDB 없음)
- ✅ 빠른 응답속도
- ✅ 설치 불필요
- ✅ 카테고리별 검색
- ❌ 시맨틱 검색 없음

### ChromaDB 사용
- ✅ 시맨틱 검색 가능
- ✅ 관련 메모리 자동 추천
- ✅ 유사도 기반 검색
- ⚠️  별도 서버 필요
- ⚠️  추가 설정 필요

## 권장사항

- **개발 환경**: ChromaDB 없이 사용 (빠른 개발)
- **프로덕션**: ChromaDB 사용 권장 (더 나은 검색 경험)
- **데모/테스트**: ChromaDB 없이도 충분

## 참고 자료

- [ChromaDB 공식 문서](https://docs.trychroma.com/)
- [ChromaDB Docker 이미지](https://hub.docker.com/r/chromadb/chroma)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
