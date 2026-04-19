# ACE-Step 신규서버 이관 준비 체크리스트

기준일: 2026-04-19

## 목표

신규 서버에서 아래 4개를 함께 올린다.

1. `songsai-music-pc`
2. `songsai-api` / wrapper
3. `ace-step-api`
4. `ACE-Step-1.5` 엔진

## 서버 구성 기준

### 1. ACE-Step 엔진

- 경로: `~/services/ACE-Step-1.5`
- 포트: `8001`
- 역할: 모델 로딩, inference, decode

### 2. ace-step-api

- 경로: `~/services/aceStep`
- 포트: `8200`
- 역할: engine 호출, 결과 정규화

### 3. songsai-api / wrapper

- 경로: `~/services/wrapper`
- 포트: `3100`
- 역할: provider 분기, DB 저장, 기존 API 응답

### 4. songsai-music-pc

- 경로: `~/services/songsai-music-pc`
- 포트: `3000`
- 역할: 프론트

## 필수 환경변수

### wrapper

```env
ACE_STEP_API_BASE_URL=http://127.0.0.1:8200
ACE_STEP_API_KEY=
ACE_STEP_TIMEOUT_MS=600000
```

### ace-step-api

예시:

```env
ACE_STEP_ENGINE_BASE_URL=http://127.0.0.1:8001
DATABASE_URL=...
```

실제 ace-step-api 설계에 따라 추가 가능

## 응답 계약 재확인

`ace-step-api`는 최소 아래 구조를 반환한다.

```json
{
  "provider": "ACE_STEP",
  "providerTaskId": "ace_20260419_0001",
  "status": "completed",
  "title": "곡 제목",
  "lyrics": "가사 전체",
  "generatedLyrics": "가사 전체",
  "stylePrompt": "스타일 프롬프트",
  "imageUrl": "http://127.0.0.1:8200/media/images/cover.jpg",
  "mp3Url": "http://127.0.0.1:8200/media/audio/song.mp3",
  "duration": 182,
  "errorMessage": null
}
```

## 배포 순서

### 1. 엔진 먼저 확인

```bash
cd ~/services/ACE-Step-1.5
# 엔진 기동 방식에 맞는 명령 실행
curl http://127.0.0.1:8001/health
```

### 2. ace-step-api 배포

```bash
cd ~/services/aceStep
git pull origin main
npm install
npm run build
pm2 restart ace-step-api --update-env
pm2 save
curl http://127.0.0.1:8200/health
```

### 3. wrapper 배포

```bash
cd ~/services/wrapper
git pull origin main
npm install
npx prisma generate
npm run build
pm2 restart songsai-api --update-env
pm2 save
curl -I http://127.0.0.1:3100
```

### 4. 프론트 배포

```bash
cd ~/services/songsai-music-pc
git pull origin main
npm install
npm run build
pm2 restart songsai-music-pc --update-env
pm2 save
curl -I http://127.0.0.1:3000
```

## 1차 테스트 순서

### 1. ace-step-api 단독 테스트

```bash
curl -X POST http://127.0.0.1:8200/api/v1/music \
  -H "Content-Type: application/json" \
  -d '{
    "title":"테스트 곡",
    "lyrics":"테스트 가사",
    "stylePrompt":"warm korean ballad",
    "provider":"ace_step"
  }'
```

확인 포인트:

- `provider === "ACE_STEP"`
- `providerTaskId`
- `status`
- `mp3Url`
- `imageUrl`

### 2. wrapper 경유 테스트

```bash
curl -X POST http://127.0.0.1:3100/api/v1/music \
  -H "Content-Type: application/json" \
  -H "Cookie: <로그인세션>" \
  -d '{
    "provider":"ace_step",
    "title":"테스트 곡",
    "lyrics":"테스트 가사",
    "stylePrompt":"warm korean ballad"
  }'
```

확인 포인트:

- DB에 `Music.provider = ACE_STEP`
- `providerTaskId` 저장
- `mp3Url`, `imageUrl` 저장
- `status = COMPLETED` 저장

### 3. 읽기 API 확인

```bash
curl http://127.0.0.1:3100/api/v1/music/recent?limit=10
curl http://127.0.0.1:3100/api/v1/music
curl "http://127.0.0.1:3100/api/v1/explore?sort=latest&limit=6&offset=0"
```

## 확인 포인트

- 프론트에서 `ACE-Step` 전용 화면 진입 가능
- `provider=ace_step` payload 전송
- wrapper가 ace-step-api 호출
- wrapper가 DB 저장
- Home / Create / My Assets / Explore가 기존 구조로 표시

## 장애 시 우선 확인

### 1. wrapper env 누락

- `ACE_STEP_API_BASE_URL` 빠짐

### 2. ace-step-api 응답 계약 불일치

- `providerTaskId` 없음
- `provider !== "ACE_STEP"`
- `mp3Url` 또는 `imageUrl` 없음

### 3. engine 미기동

- `8001` 헬스체크 실패

### 4. 내부 URL 접근 불가

- `wrapper -> 8200`
- `ace-step-api -> 8001`

## 기준 문서

- `18_ACE-Step_wrapper저장형_응답계약_및_저장흐름.md`
- `19_wrapper_ACE-Step_API_연동_타입_및_호출_초안.md`
