# PDF/CSV 파일 인식 및 분석 구현 계획

## 📋 프로젝트 개요
Yuri AI 챗봇에 PDF 및 CSV 파일을 업로드하고 분석할 수 있는 멀티모달 기능 구현

## 🎯 목표
1. PDF 문서의 텍스트 추출 및 내용 분석
2. CSV 데이터의 구조 파악 및 통계 분석
3. 이미지 기반 PDF의 OCR 처리 (선택사항)
4. 대용량 파일 처리 최적화
5. Friendli AI 멀티모달 API 활용

## 📁 현재 구현 상태

### ✅ 이미 구현된 기능

#### 1. 파일 업로드 시스템
- **위치**: `/privatesota2/app/(chat)/api/upload/route.ts`
- **지원 형식**: PDF, CSV, TXT, MD, 이미지 파일
- **기능**:
  - 파일 업로드 및 검증
  - Vercel Blob Storage 연동
  - 데모 모드 지원

#### 2. PDF 처리
- **라이브러리**: `pdf-parse`
- **기능**:
  - 텍스트 추출 (최대 100,000자)
  - 메타데이터 추출 (제목, 작성자, 날짜, 페이지 수)
  - 텍스트 정리 및 포맷팅
  - 스캔된 PDF 감지 및 안내

#### 3. CSV 처리
- **라이브러리**: `papaparse`
- **기능**:
  - 헤더 자동 감지
  - 데이터 타입 자동 변환
  - 처음 10개 행 미리보기
  - 데이터 통계 (행/열 수)

#### 4. 멀티모달 지원 준비
- **위치**: `/privatesota2/lib/ai/friendli-multimodal.ts`
- **구조**:
  - Friendli AI 멀티모달 API 인터페이스
  - Base64 인코딩 지원
  - 이미지/문서 타입 구분

#### 5. 스프레드시트 에디터
- **위치**: `/privatesota2/components/sheet-editor.tsx`
- **기능**:
  - CSV 데이터 시각화
  - 실시간 편집
  - 데이터 그리드 UI

## 🚀 구현 계획

### Phase 1: 핵심 기능 강화 (1주)

#### 1.1 PDF 처리 개선
```typescript
// 개선할 기능:
- OCR 지원 추가 (tesseract.js)
- 페이지별 처리 옵션
- 표/차트 추출
- 다국어 지원 강화
```

**작업 항목**:
- [ ] tesseract.js 통합 설치
- [ ] OCR 처리 워커 구현
- [ ] 페이지 범위 선택 UI
- [ ] 진행상황 표시

#### 1.2 CSV 분석 강화
```typescript
// 추가할 기능:
- 자동 통계 분석
- 데이터 타입 추론
- 이상치 감지
- 그래프 생성 옵션
```

**작업 항목**:
- [ ] 통계 분석 함수 구현
- [ ] 데이터 시각화 컴포넌트
- [ ] 대용량 CSV 스트리밍 처리

### Phase 2: Friendli AI 멀티모달 통합 (1주)

#### 2.1 API 연동
```typescript
// friendli-multimodal-service.ts
export class FriendliMultimodalService {
  async analyzePDF(pdfBuffer: Buffer): Promise<AnalysisResult> {
    // PDF를 base64로 변환
    // Friendli API 호출
    // 결과 파싱 및 반환
  }
  
  async analyzeCSV(csvData: string): Promise<DataInsights> {
    // CSV 데이터 분석 요청
    // 통계 및 인사이트 생성
  }
}
```

**작업 항목**:
- [ ] Friendli API 키 환경변수 설정
- [ ] 멀티모달 요청 핸들러
- [ ] 응답 스트리밍 구현
- [ ] 에러 처리 및 재시도 로직

#### 2.2 UI/UX 개선
```typescript
// 파일 업로드 컴포넌트 개선
- 드래그 앤 드롭 지원
- 파일 미리보기
- 업로드 진행 표시
- 다중 파일 지원
```

**작업 항목**:
- [ ] 파일 드롭존 컴포넌트
- [ ] 파일 미리보기 모달
- [ ] 업로드 큐 관리
- [ ] 파일 타입별 아이콘

### Phase 3: 고급 기능 (2주)

#### 3.1 대화형 분석
```typescript
// 구현할 기능:
- "이 PDF의 3페이지 요약해줘"
- "CSV에서 매출이 가장 높은 달은?"
- "문서에서 특정 키워드 찾기"
```

**작업 항목**:
- [ ] 컨텍스트 기반 질의 처리
- [ ] 문서 내 검색 기능
- [ ] 답변에 출처 표시

#### 3.2 데이터 변환 및 내보내기
```typescript
// 지원할 변환:
- PDF → 텍스트/마크다운
- CSV → JSON/Excel
- 이미지 → 텍스트 (OCR)
```

**작업 항목**:
- [ ] 변환 옵션 UI
- [ ] 다운로드 기능
- [ ] 포맷 선택 다이얼로그

### Phase 4: 성능 최적화 (1주)

#### 4.1 대용량 파일 처리
```typescript
// 최적화 전략:
- 청킹 및 스트리밍
- 웹 워커 활용
- 캐싱 전략
- 프로그레시브 로딩
```

**작업 항목**:
- [ ] 파일 청킹 구현
- [ ] 워커 스레드 설정
- [ ] Redis 캐싱 레이어
- [ ] 메모리 관리 최적화

#### 4.2 에러 처리 강화
```typescript
// 처리할 에러 케이스:
- 손상된 파일
- 지원하지 않는 인코딩
- 메모리 초과
- API 한도 초과
```

**작업 항목**:
- [ ] 에러 복구 메커니즘
- [ ] 사용자 친화적 에러 메시지
- [ ] 로깅 및 모니터링

## 📝 기술 스택

### 백엔드
- **파일 처리**: pdf-parse, papaparse, tesseract.js
- **스토리지**: Vercel Blob Storage
- **AI API**: Friendli AI Multimodal API
- **캐싱**: Redis (선택사항)

### 프론트엔드
- **업로드 UI**: react-dropzone
- **데이터 시각화**: react-data-grid, recharts
- **파일 미리보기**: react-pdf, react-csv-reader
- **상태 관리**: zustand/swr

## 🔧 환경 설정

### 필요한 환경 변수
```env
# Friendli AI
FRIENDLI_API_KEY=your_api_key
FRIENDLI_BASE_URL=https://api.friendli.ai/v1
USE_FRIENDLI_MULTIMODAL=true

# Storage
BLOB_READ_WRITE_TOKEN=your_blob_token

# Feature Flags
ENABLE_PDF_OCR=true
ENABLE_CSV_ANALYSIS=true
MAX_FILE_SIZE_MB=10
```

### 패키지 설치
```bash
# 추가로 설치할 패키지
pnpm add tesseract.js react-dropzone react-pdf recharts
pnpm add -D @types/react-pdf
```

## 📊 예상 결과

### 사용자 시나리오

1. **PDF 분석**
   - 사용자: "이 계약서 PDF를 요약해줘"
   - Yuri: PDF 내용을 분석하고 주요 조항 요약 제공

2. **CSV 데이터 분석**
   - 사용자: "이 매출 데이터에서 트렌드를 찾아줘"
   - Yuri: 데이터 분석 및 시각화 제공

3. **복합 문서 처리**
   - 사용자: 여러 파일 동시 업로드
   - Yuri: 각 파일 분석 후 종합 인사이트 제공

## 🚨 주의사항

1. **보안**
   - 민감한 문서 처리 시 암호화
   - 파일 크기 제한 (10MB)
   - 악성 파일 스캐닝

2. **성능**
   - 대용량 파일은 백그라운드 처리
   - 진행 상황 실시간 업데이트
   - 메모리 사용량 모니터링

3. **사용성**
   - 명확한 에러 메시지
   - 처리 중 취소 옵션
   - 파일 형식 자동 감지

## 📅 일정

| 단계 | 기간 | 주요 산출물 |
|------|------|------------|
| Phase 1 | 1주 | PDF/CSV 처리 개선 |
| Phase 2 | 1주 | Friendli AI 통합 |
| Phase 3 | 2주 | 고급 분석 기능 |
| Phase 4 | 1주 | 성능 최적화 |
| **총 기간** | **5주** | **완성된 멀티모달 시스템** |

## 🎯 성공 지표

- PDF 텍스트 추출 정확도 > 95%
- CSV 분석 처리 시간 < 2초 (1MB 기준)
- 사용자 만족도 > 4.5/5.0
- 일일 처리 파일 수 > 1,000개
- API 응답 시간 < 3초

## 📚 참고 자료

- [Friendli AI Multimodal API 문서](https://docs.friendli.ai/multimodal)
- [pdf-parse 라이브러리](https://www.npmjs.com/package/pdf-parse)
- [papaparse 문서](https://www.papaparse.com/docs)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)