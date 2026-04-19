# ACE-Step wrapper 저장형 응답계약 및 저장흐름

기준일: 2026-04-19

## 결론

현재 기준으로 ACE-Step 연동 구조는 아래가 가장 현실적이다.

- 프론트는 계속 `songsai-api`만 호출한다.
- `songsai-api`는 `provider=suno`면 기존 로직을 그대로 수행한다.
- `provider=ace_step`이면 `ace-step-api`를 호출한다.
- `ace-step-api`는 ACE-Step 엔진을 호출하고 결과만 정규화해서 반환한다.
- 실제 DB 저장과 최종 API 응답은 `songsai-api`가 담당한다.

즉 책임은 아래처럼 나눈다.

```text
Frontend
  -> songsai-api
       -> provider=suno     : 기존 Suno 생성/저장 로직
       -> provider=ace_step : ace-step-api 호출

ace-step-api
  -> ACE-Step 엔진 호출
  -> 결과 정규화
  -> wrapper 친화 응답 반환

songsai-api
  -> Music / GenerationJob 저장
  -> 기존 프론트 응답 구조 반환
```

## 왜 이 방식이 맞는가

### 1. DB 저장 책임이 한 곳에 모인다

- `Music`
- `GenerationJob`
- 공개/비공개
- 다운로드 가능 시점
- 읽기 API와의 정합성

이 규칙들이 `songsai-api` 한 곳에 모여 있어야 운영이 단순하다.

### 2. 프론트 영향이 작다

- 프론트는 계속 `POST /api/v1/music`만 호출한다.
- Home / Create / My Assets / Explore 읽기 구조는 그대로 둔다.

### 3. ACE-Step 쪽은 생성 엔진 역할에 집중할 수 있다

- 모델 로딩
- inference
- 디코드
- 이미지 생성
- 결과 정규화

즉 GPU/추론 책임과 비즈니스 DB 저장 책임을 분리한다.

## 서비스별 역할

### 1. ACE-Step 엔진 서버

경로:

- `D:\ACE-Step-1.5`

포트:

- `8001`

역할:

- 실제 모델 추론
- 오디오 생성
- 이미지 생성
- 모델 로딩
- 디코드 처리

### 2. ace-step-api

경로:

- `D:\aceStep`

포트:

- `8200`

역할:

- ACE-Step 엔진 서버 호출
- 입력 정리
- 결과 정규화
- wrapper가 바로 저장 가능한 응답 구조 반환

### 3. songsai-api / wrapper

운영 도메인:

- `api.songsai.org`

역할:

- 인증/세션 확인
- `provider` 분기
- Suno는 기존 그대로 직접 처리
- ACE-Step은 `ace-step-api` 호출
- `Music`, `GenerationJob` 저장
- 최종 프론트 응답 반환

## 최종 요청 흐름

### Suno

```text
songsai-music-pc
-> POST /api/v1/music
-> songsai-api
-> Suno 로직 수행
-> songsai-api가 DB 저장
-> songsai-api 응답 반환
```

### ACE-Step

```text
songsai-music-pc
-> POST /api/v1/music
-> songsai-api
-> provider=ace_step 확인
-> ace-step-api 호출
-> ace-step-api 가 ACE-Step 엔진 호출
-> ace-step-api 가 결과를 정규화해서 반환
-> songsai-api 가 DB 저장
-> songsai-api 가 기존 구조 응답 반환
```

## songsai-api는 어디까지 하나

### provider=suno

- 기존과 동일

### provider=ace_step

해야 할 일:

1. 요청 검증
2. 사용자 세션 확인
3. `ace-step-api` 호출
4. 결과 검증
5. `Music` 저장
6. 필요 시 `GenerationJob` 저장 또는 생략
7. 기존 프론트 응답 구조로 반환

하지 않아도 되는 일:

- 직접 모델 추론
- Python 엔진 실행
- 오디오 디코드 로직 처리

## ace-step-api는 무엇을 반환해야 하나

ACE-Step 결과는 wrapper가 곧바로 저장할 수 있는 구조여야 한다.

### 권장 응답 예시

```json
{
  "provider": "ACE_STEP",
  "providerTaskId": "ace_20260419_0001",
  "status": "completed",
  "title": "곡 제목",
  "lyrics": "가사 전체",
  "generatedLyrics": "가사 전체",
  "stylePrompt": "스타일 프롬프트",
  "imageUrl": "https://...",
  "mp3Url": "https://...",
  "duration": 182,
  "errorMessage": null,
  "raw": {
    "engineModel": "ACE-Step-1.5",
    "engineRequestId": "..."
  }
}
```

### 최소 필수 필드

- `provider`
- `providerTaskId`
- `status`
- `title`
- `stylePrompt`
- `imageUrl`
- `mp3Url`
- `duration`
- `errorMessage`

권장:

- `lyrics`
- `generatedLyrics`
- `raw`

### `provider`는 반드시 `"ACE_STEP"`

이 필드는 현재 wrapper 저장 흐름 기준으로 강제하는 편이 맞다.

이유:

- Suno와 응답 구분이 명확해진다.
- 응답 검증이 쉬워진다.
- 나중에 provider가 늘어나도 확장성이 좋다.

## songsai-api 저장 순서

### 1. 요청 수신

`POST /api/v1/music`

payload 예시:

```json
{
  "provider": "ace_step",
  "title": "제목",
  "lyrics": "가사",
  "stylePrompt": "스타일",
  "modelVersion": "ace_step_1_5"
}
```

### 2. ace-step-api 호출

예:

```text
POST http://127.0.0.1:8200/api/v1/music
```

### 3. 응답 검증

검증 포인트:

- `provider === "ACE_STEP"`
- `providerTaskId` 존재
- `status`가 허용된 값인지
- `completed`면 `mp3Url`, `imageUrl` 존재
- `failed`면 `errorMessage` 존재

### 4. Music 저장

권장 저장값:

- `provider = "ACE_STEP"`
- `providerTaskId`
- `title`
- `lyrics`
- `stylePrompt`
- `imageUrl`
- `mp3Url`
- `status`
- `duration`
- `userId`
- `isPublic = false`

### 5. GenerationJob 처리

1차는 두 방식 중 하나를 선택한다.

#### 방식 A. completed 즉시 저장

- ACE-Step이 동기 완료 응답을 주면
- `completed + mp3Url 있음` 기준으로 바로 저장
- poll job은 만들지 않는다.

#### 방식 B. 요청 이력 기록

- `GenerationJob`을 요청 이력 용도로 남김
- 운영 추적용으로 최소 기록만 저장

현재 wrapper 1차 구현은 A 쪽에 가깝다.

## 상태 규칙

### completed

조건:

- `mp3Url` 접근 가능
- `imageUrl` 존재
- 제목 존재

### failed

조건:

- 생성 실패
- `errorMessage` 필수

### queued / processing

ACE-Step이 향후 비동기 응답으로 바뀔 수 있으니 값 자체는 허용하되,
1차 구현은 동기 완료형을 기준으로 본다.

## 추천 1차 구현 방식

### 1차는 동기 완료형

가장 단순한 방식:

1. `songsai-api`가 `ace-step-api` 호출
2. `ace-step-api`가 생성 완료 후 응답
3. `songsai-api`가 바로 `Music` 저장
4. 프론트에 기존 `CreateMusicResponse` 반환

## 파일 단위 구현 포인트

### songsai-api / wrapper

예상 수정 파일:

- `src/app/api/v1/music/route.ts`
  - `provider=ace_step` 분기 저장
- `src/server/music/provider.ts`
  - Suno/ACE-Step 라우팅
- `src/server/music/types.ts`
  - ACE-Step 응답 타입 정의
- `src/server/music/schema.ts`
  - `provider` 입력 허용
- `src/lib/env.ts`
  - `ACE_STEP_API_BASE_URL`

### ace-step-api

예상 확인 파일:

- `POST /api/v1/music`
- `GET /health`

## 현재 구현 기준

현재 구현 기준 문서는 아래 두 개를 함께 본다.

- `18_ACE-Step_wrapper저장형_응답계약_및_저장흐름.md`
- `19_wrapper_ACE-Step_API_연동_타입_및_호출_초안.md`

즉:

- `18번`은 저장 흐름과 책임 분리 기준
- `19번`은 env, 타입, 호출 형식, 응답 검증 기준
