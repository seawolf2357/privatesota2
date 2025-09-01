# Yuri (유리) AI Assistant Setup

Discord에서 사용하던 오리지널 Yuri 모델을 웹 환경에서 사용하기 위한 설정 가이드입니다.

## 🤖 Yuri 소개

- **이름**: Yuri (유리)
- **원본**: Discord 봇 (app-r1984.py)
- **AI 모델**: Friendli AI (dep86pjolcjjnv8)
- **특징**: 한국어 AI 어시스턴트, 웹 검색, 메모리 시스템

## 🚀 빠른 시작

### 1. 환경 변수 설정 (.env)

```env
# Yuri의 오리지널 모델 사용 (Friendli AI)
USE_FRIENDLI=true
FRIENDLI_API_KEY=flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4

# 대체 모델 (Fireworks AI) - 선택사항
USE_FIREWORKS=false
FIREWORKS_API_KEY=your_fireworks_api_key_here
```

### 2. 서버 실행

```bash
cd privatesota2
npm run dev
```

### 3. 웹 브라우저 접속

http://localhost:3002

## 📊 모델 비교

| 구분 | Friendli AI (오리지널) | Fireworks AI (대체) |
|------|----------------------|-------------------|
| 모델 ID | dep86pjolcjjnv8 | qwen3-235b-a22b-instruct-2507 |
| API URL | api.friendli.ai | api.fireworks.ai |
| 사용처 | Discord 봇 원본 | 웹 버전 대체 모델 |
| 특징 | 유리 전용 튜닝 | 범용 대화 모델 |

## 🔄 모델 전환

### Friendli AI 사용 (Discord 오리지널)
```env
USE_FRIENDLI=true
USE_FIREWORKS=false
```

### Fireworks AI 사용 (대체 모델)
```env
USE_FRIENDLI=false
USE_FIREWORKS=true
```

### xAI (기본값) 사용
```env
USE_FRIENDLI=false
USE_FIREWORKS=false
```

## 💬 Yuri의 주요 기능

1. **다국어 지원**
   - 한국어/영어 자동 감지
   - 사용자 언어에 맞춘 응답

2. **웹 검색**
   - Brave Search API 통합
   - 실시간 정보 제공

3. **파일 분석**
   - PDF, CSV, TXT 파일 지원
   - 내용 요약 및 분석

4. **메모리 시스템**
   - 사용자 정보 기억
   - 대화 맥락 유지
   - 개인화된 응답

5. **시간 인식**
   - 한국 시간대(KST) 기준
   - 날짜/시간 정보 제공

## 🎨 Yuri의 성격

- 친근하고 도움이 되는
- 예의 바르고 공손한
- 지적이고 호기심 많은
- 사용자를 배려하는
- 적절한 유머 감각

## 📝 Discord 명령어 (웹에서는 UI로 대체)

- `/help` → 설정 메뉴
- `/memories` → 메모리 관리
- `/new` → 새 대화 시작
- `/history` → 대화 기록

## 🔧 문제 해결

### API 키 오류
- Friendli API 키가 올바른지 확인
- 환경 변수가 제대로 설정되었는지 확인

### 모델 응답 없음
- 네트워크 연결 확인
- API 서비스 상태 확인
- 대체 모델로 전환 시도

## 📚 관련 파일

- **원본 Discord 봇**: `packages/app-r1984.py`
- **Friendli Provider**: `lib/ai/providers-friendli.ts`
- **Yuri 설정**: `lib/ai/yuri-config.ts`
- **시스템 프롬프트**: `lib/ai/prompts.ts`

## 🌟 Yuri와의 대화 시작

이제 웹 환경에서 Discord와 동일한 Yuri를 만날 수 있습니다!
"안녕하세요! 저는 유리예요. 무엇을 도와드릴까요? 😊"