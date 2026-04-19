# ACE-Step wrapper / 프론트 운영이관 절차

기준일: 2026-04-19

## 목적

신규 서버에서 아래 두 축을 함께 운영 반영한다.

1. wrapper(`songsai-api`)의 `provider=ace_step` 분기
2. 프론트(`songsai-music-pc`)의 `ACE-Step` 전용 진입 화면

필요 시 함께 확인할 서비스:

- `ACE-Step-1.5` 엔진: `8001`
- `ace-step-api`: `8200`
- wrapper: `3100`
- 프론트: `3000`

## 기준 문서

- `18_ACE-Step_wrapper저장형_응답계약_및_저장흐름.md`
- `19_wrapper_ACE-Step_API_연동_타입_및_호출_초안.md`
- `20_ACE-Step_신규서버_이관_준비_체크리스트.md`

## 1. wrapper 운영 반영

### 1-1. 서버 `.env` 반영

파일 예시:

- `~/services/wrapper/.env`

추가할 값:

```env
ACE_STEP_API_BASE_URL=http://127.0.0.1:8200
ACE_STEP_API_KEY=
ACE_STEP_TIMEOUT_MS=600000
```

설명:

- `ACE_STEP_API_BASE_URL`
  - wrapper가 `ace-step-api`를 호출할 내부 주소
- `ACE_STEP_API_KEY`
  - 필요 시 ace-step-api 인증 토큰
- `ACE_STEP_TIMEOUT_MS`
  - ACE-Step 생성 완료 응답 대기 시간

### 1-2. wrapper 코드 반영 명령

```bash
cd ~/services/wrapper
git pull origin main
git log -1 --oneline
npm install
npx prisma generate
npm run build
pm2 restart songsai-api --update-env
pm2 save
pm2 flush songsai-api
sleep 5
curl -I http://127.0.0.1:3100
```

### 1-3. wrapper 확인 포인트

- `POST /api/v1/music`가 `provider=ace_step`를 받는지
- `ACE_STEP_API_BASE_URL`이 실제로 로드됐는지
- `provider=ace_step`일 때 `ace-step-api` 호출이 되는지
- 생성 완료 시 `Music.provider = ACE_STEP`로 저장되는지
- `completed + mp3Url 있음`이면 poll job을 만들지 않는지

### 1-4. wrapper 테스트 요청 예시

로그인 세션이 있는 상태 기준:

```bash
curl -X POST http://127.0.0.1:3100/api/v1/music \
  -H "Content-Type: application/json" \
  -H "Cookie: <로그인세션>" \
  -d '{
    "provider":"ace_step",
    "title":"ACE-Step 테스트 곡",
    "lyrics":"테스트 가사",
    "stylePrompt":"warm korean ballad"
  }'
```

## 2. 프론트 운영 반영

### 2-1. 포함된 변경

- `/ace-step` 전용 페이지 추가
- 상단 `Studio` 메뉴 아래 `ACE-Step` 항목 추가
- `CreateStudio`에서 `mode="ace_step"` 재사용
- 페이지 hero 매핑에 `aceStep` 추가

### 2-2. 프론트 코드 반영 명령

```bash
cd ~/services/songsai-music-pc
git pull origin main
git log -1 --oneline
npm install
npm run build
pm2 restart songsai-music-pc --update-env
pm2 save
pm2 flush songsai-music-pc
sleep 5
curl -I http://127.0.0.1:3000
```

### 2-3. 프론트 확인 포인트

- 상단 메뉴 `Studio -> ACE-Step` 노출
- `/ace-step` 진입 가능
- ACE-Step 전용 화면에서 provider 선택 UI가 숨겨져 있는지
- 전용 진입 배지가 보이는지
- ACE-Step 생성 요청 시 payload에 `provider=ace_step`가 포함되는지

## 3. ace-step-api 사전 확인

### 3-1. health 체크

```bash
curl http://127.0.0.1:8200/health
```

### 3-2. 응답 계약 확인

`ace-step-api`는 아래 구조를 기준으로 반환한다.

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

## 4. 운영 반영 순서 추천

1. `ACE-Step-1.5` 엔진 기동 확인
2. `ace-step-api` 기동 확인
3. wrapper `.env` 반영
4. wrapper pull / build / restart
5. 프론트 pull / build / restart
6. `provider=ace_step` 생성 테스트
7. Home / Create / My Assets / Explore 읽기 화면 확인

## 5. 장애 시 우선 점검

### wrapper 502

- `songsai-api` PM2 로그 확인
- `.env`의 `ACE_STEP_API_BASE_URL` 누락 여부 확인
- `8200` 접근 가능 여부 확인

### 프론트 502

- `.next` build 생성 여부 확인
- `npm run build` 성공 여부 확인
- PM2가 `next start`만 재시작 중인지 확인

### 생성 실패

- `ace-step-api` 응답에 `providerTaskId`가 있는지
- `provider === "ACE_STEP"`인지
- `completed`일 때 `mp3Url`, `imageUrl`가 실제 접근 가능한지

## 6. 최종 체크

- wrapper build 성공
- 프론트 build 성공
- `ACE_STEP_API_BASE_URL` 반영
- `/ace-step` 메뉴 노출
- `provider=ace_step` 요청 성공
- DB 저장 성공
- 기존 읽기 API로 동일하게 표시
