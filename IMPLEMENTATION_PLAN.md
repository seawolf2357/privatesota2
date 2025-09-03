# PrivateSOTA2 미구현 기능 구현 계획

## 📋 미구현 기능 목록

app-backup.py와 비교하여 현재 privatesota2에 미구현된 주요 기능들입니다.

### 1. 🔄 자동 저장 시스템
**현재 상태**: ❌ 미구현
**구현 우선순위**: 높음

#### 기능 상세
- 10개 메시지마다 자동 저장
- 2분 비활성 시 자동 저장
- 페이지 종료 시 자동 저장 (beforeunload 이벤트)
- 자동 저장 시각 표시

#### 구현 방법
```typescript
// hooks/useAutoSave.ts
- 메시지 카운터 추적
- 비활성 타이머 관리
- beforeunload 이벤트 리스너
- 자동 저장 API 호출
```

### 2. 📄 PDF/CSV 파일 처리
**현재 상태**: ⚠️ 부분 구현 (업로드만 가능)
**구현 우선순위**: 높음

#### 기능 상세
- PDF 텍스트 추출 (PyPDF2 대체 라이브러리 필요)
- CSV 데이터 파싱 및 포맷팅
- 파일 내용 자동 요약
- 처리된 내용을 대화에 포함

#### 구현 방법
```typescript
// api/process-file/route.ts
- pdf-parse 라이브러리 사용 (PDF)
- papaparse 라이브러리 사용 (CSV)
- 파일 타입별 처리 로직
- AI 요약 생성
```

### 3. 🧠 AI 메모리 추출 시스템
**현재 상태**: ❌ 미구현
**구현 우선순위**: 중간

#### 기능 상세
- 대화에서 중요 정보 자동 추출
- 카테고리별 분류 (선호도, 사실, 컨텍스트)
- 메모리 저장 및 관리
- 메모리 기반 개인화 응답

#### 구현 방법
```typescript
// api/memory/route.ts
- 대화 분석 API
- 메모리 DB 스키마 추가
- 메모리 CRUD 작업
- 메모리 통합 프롬프트
```

### 4. ⏰ 실시간 시계 업데이트
**현재 상태**: ❌ 미구현
**구현 우선순위**: 낮음

#### 기능 상세
- 헤더에 실시간 시계 표시
- 한국 시간(KST) 기준
- 1초마다 업데이트

#### 구현 방법
```typescript
// components/clock.tsx
- useEffect + setInterval
- Intl.DateTimeFormat 사용
- 한국 시간대 설정
```

### 5. 🌐 언어 자동 감지
**현재 상태**: ❌ 미구현
**구현 우선순위**: 중간

#### 기능 상세
- 사용자 메시지 언어 감지
- 감지된 언어로 응답
- 다국어 UI 지원

#### 구현 방법
```typescript
// utils/language-detector.ts
- franc 라이브러리 사용
- 언어별 응답 템플릿
- i18n 설정
```

### 6. 📊 사용량 통계
**현재 상태**: ❌ 미구현
**구현 우선순위**: 낮음

#### 기능 상세
- 토큰 사용량 추적
- 대화 통계
- 사용 패턴 분석

#### 구현 방법
```typescript
// api/stats/route.ts
- 토큰 카운팅 로직
- 통계 DB 테이블
- 대시보드 UI
```

### 7. 🔧 고급 설정
**현재 상태**: ⚠️ 부분 구현
**구현 우선순위**: 중간

#### 기능 상세
- Temperature, Top-p 조절
- Max tokens 설정
- 시스템 프롬프트 커스터마이징
- 테마 설정

#### 구현 방법
```typescript
// components/settings-panel.tsx
- 설정 상태 관리
- localStorage 저장
- 설정 적용 로직
```

## 🚀 구현 순서

### Phase 1 (즉시 구현)
1. ✅ 자동 저장 시스템
2. ✅ PDF/CSV 파일 처리 완성

### Phase 2 (단기)
3. AI 메모리 추출 시스템
4. 언어 자동 감지
5. 고급 설정 완성

### Phase 3 (장기)
6. 실시간 시계 업데이트
7. 사용량 통계

## 📝 기술 스택 요구사항

### 필요한 패키지
```json
{
  "pdf-parse": "^1.1.1",
  "papaparse": "^5.4.1",
  "franc": "^6.2.0",
  "tiktoken": "^1.0.0"
}
```

### DB 스키마 추가
```sql
-- memories 테이블
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- stats 테이블
CREATE TABLE stats (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tokenCount INTEGER,
  messageCount INTEGER,
  date DATE NOT NULL
);
```

## ⚡ 성능 고려사항

1. **자동 저장**: Debounce 적용으로 과도한 API 호출 방지
2. **파일 처리**: Worker thread 사용 고려
3. **메모리 추출**: 백그라운드 처리
4. **실시간 업데이트**: React.memo 활용

## 🔒 보안 고려사항

1. **파일 업로드**: 파일 크기 및 타입 제한
2. **메모리 저장**: 민감 정보 필터링
3. **API 호출**: Rate limiting 적용
4. **사용자 데이터**: 암호화 저장

## 📅 예상 일정

- **Phase 1**: 1-2일
- **Phase 2**: 3-4일
- **Phase 3**: 2-3일

총 예상 구현 기간: 1-2주