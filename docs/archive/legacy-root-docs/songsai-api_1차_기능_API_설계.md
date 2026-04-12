# songsai-api 1차 기능 및 API 설계

이 문서는 `songsai-api`를 앞으로 SONGSAI의 중심 백엔드로 키우기 위한 1차 범위 문서입니다.

지금 단계의 목적은 다음과 같습니다.

- `songsai-music`에서 비즈니스 로직을 조금씩 분리한다
- `songsai-api`가 메인 백엔드 역할을 맡기 시작한다
- 기존에 검증된 생성 흐름과 wrapper 운영 경험을 재사용한다
- 모바일/PC 프론트가 공통으로 쓸 수 있는 API 기반을 만든다

## 1차 범위의 원칙

1차에서는 모든 것을 옮기지 않습니다.

다음 기준으로 우선순위를 정합니다.

- UI와 비교적 느슨하게 결합된 기능
- 앞으로 모바일/PC 공통으로 반드시 필요한 기능
- `songsai-api`로 가는 것이 구조적으로 자연스러운 기능

## songsai-api의 1차 책임

`songsai-api`는 1차에서 아래 책임을 맡습니다.

### 1. 인증 이후 공통 사용자 백엔드

- 현재 로그인 사용자의 기본 정보 조회
- 현재 크레딧/잔액 조회
- 사용자별 생성 이력 조회

### 2. 생성 요청의 중심 진입점

- 곡 생성 요청 접수
- 요청 검증
- 크레딧 차감 또는 차감 가능 여부 확인
- provider/wrapper 호출 시작
- 생성 작업 상태 조회

### 3. 결과와 자산 조회

- 곡 목록 조회
- 곡 상세 조회
- 자산 목록 조회
- 다운로드 가능한 링크 또는 내부 다운로드 경로 반환

### 4. 비디오 흐름

- 비디오 생성 요청
- 비디오 작업 상태 조회
- 최종 다운로드 링크 반환

### 5. 결제의 시작

- PayPal 결제 생성
- PayPal 결제 승인 완료 처리
- 크레딧 충전 반영

### 6. 관리자/운영 최소 API

- 생성 실패 상태 점검용 조회
- 결제/충전 로그 조회
- 입금 요청 확인을 위한 내부 API 연동 준비

## songsai-music에서 1차에 남아도 되는 것

초기에는 아래는 `songsai-music`에 남아 있어도 됩니다.

- 화면 구성
- 세션 UI
- 모바일/PC UX 차이
- 재생 UI
- 업로드 UI
- 임시 화면 상태 관리

즉 1차는 프론트를 얇게 만들기 시작하되, 아직 완전히 비우지는 않습니다.

## 1차에서 바로 옮기지 않는 것

다음은 1차에서 무리하게 옮기지 않습니다.

- 관리자 전체 화면 로직
- 모든 쿠폰/운영성 기능
- legacy 화면 구조 전체 교체
- bank transfer 전체 흐름 재설계
- 프론트의 모든 서버 호출을 한 번에 교체

## 1차 API 묶음

### A. 사용자 / 세션

#### `GET /api/v1/me`

목적:

- 현재 로그인 사용자의 기본 정보 반환

응답 예시:

```json
{
  "user": {
    "id": "usr_123",
    "name": "홍길동",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

#### `GET /api/v1/me/balance`

목적:

- 현재 사용자의 사용 가능 크레딧 반환

응답 예시:

```json
{
  "balance": {
    "credits": 1200,
    "bonusCredits": 300
  }
}
```

### B. 곡 생성

#### `POST /api/v1/generations`

목적:

- 곡 생성 요청 접수

요청 예시:

```json
{
  "title": "봄비 오는 거리",
  "prompt": "감성적인 한국형 발라드",
  "lyricsMode": "manual",
  "lyrics": "직접 입력한 가사",
  "isInstrumental": false,
  "stylePrompt": "여성 보컬, 잔잔한 피아노"
}
```

응답 예시:

```json
{
  "job": {
    "id": "gen_123",
    "status": "QUEUED"
  }
}
```

#### `GET /api/v1/generations/:id`

목적:

- 생성 작업 상태 조회

응답 예시:

```json
{
  "job": {
    "id": "gen_123",
    "status": "PROCESSING",
    "musicId": null
  }
}
```

### C. 곡 / 자산

#### `GET /api/v1/songs`

목적:

- 현재 사용자 기준 곡 목록 조회

쿼리 예시:

- `page`
- `limit`
- `status`

#### `GET /api/v1/songs/:id`

목적:

- 곡 상세 조회

포함 정보 예시:

- 기본 메타데이터
- 생성 상태
- 크레딧 사용 내역 요약
- 보너스 트랙 여부
- 자산 목록

#### `GET /api/v1/songs/:id/assets`

목적:

- 해당 곡의 자산 목록 반환

응답 예시:

```json
{
  "assets": [
    {
      "type": "AUDIO",
      "url": "/api/v1/assets/ast_001/download"
    },
    {
      "type": "IMAGE",
      "url": "/api/v1/assets/ast_002/download"
    }
  ]
}
```

#### `GET /api/v1/assets/:id/download`

목적:

- 다운로드용 링크 또는 스트림 응답 제공

### D. 비디오

#### `POST /api/v1/songs/:id/videos`

목적:

- 특정 곡에 대한 비디오 생성 요청

#### `GET /api/v1/videos/:id`

목적:

- 비디오 생성 상태 조회

#### `GET /api/v1/videos/:id/download`

목적:

- 완성된 비디오 다운로드 경로 반환

### E. 결제

#### `POST /api/v1/payments/paypal/create`

목적:

- PayPal 주문 생성

#### `POST /api/v1/payments/paypal/complete`

목적:

- PayPal 결제 완료 확인 후 크레딧 반영

### F. 내부 연동

#### `POST /api/v1/internal/deposits/match`

목적:

- `songsai-bank-bridge`가 입금 매칭 결과를 내부적으로 전달할 때 사용하는 내부 API

보안:

- 내부 비밀키 기반

## 1차 데이터 방향

1차에서는 `songsai-api`가 메인 도메인 데이터를 더 많이 소유하도록 정리합니다.

핵심 엔티티:

- User
- CreditGrant / Transaction
- Music
- MusicAsset
- Video
- GenerationJob
- Payment

`songsai-bank-bridge`는 다음 데이터 중심으로 유지합니다.

- SMS webhook log
- parsed deposit
- match candidate
- bridge 대시보드용 운영 데이터

## CAPTCHA / Ubuntu 데스크탑 브라우저 메모

이 부분은 매우 중요합니다.

현재 wrapper에서 확인된 운영 포인트:

- 수동 CAPTCHA 모드가 존재함
- visible browser 기반 흐름이 존재함
- `manual CAPTCHA lock` 개념이 이미 있음
- Playwright Chromium + visible desktop 환경 + `xdotool` 보조 클릭 흐름이 존재함
- Ubuntu 데스크탑 환경에서 브라우저를 띄워 수동으로 CAPTCHA를 해결하는 운영 방식이 이미 검증된 흔적이 있음

즉 1차 설계에서도 다음 원칙을 유지해야 합니다.

### CAPTCHA 원칙

1. `songsai-api`는 provider 호출의 중심이 되더라도, 실제 CAPTCHA 해결 운영은 wrapper 계층의 책임으로 둔다.
2. Ubuntu 데스크탑에서 visible Chromium/Chrome 계열 브라우저를 띄울 수 있는 운영 옵션을 계속 유지한다.
3. 수동 CAPTCHA 모드는 제거하지 않는다.
4. 동시 수동 CAPTCHA 요청은 lock으로 제어한다.
5. 자동 모드와 수동 모드를 환경변수로 분리한다.

### 실무 판단

지금 단계에서는 CAPTCHA 흐름을 새로 발명하는 것보다, 현재 wrapper에 있는 검증된 흐름을 유지·정리하는 것이 맞습니다.

## 1차 구현 우선순위

가장 먼저 구현할 순서는 다음이 좋습니다.

1. `GET /api/v1/me/balance`
2. `GET /api/v1/songs`
3. `GET /api/v1/songs/:id`
4. `POST /api/v1/generations`
5. `GET /api/v1/generations/:id`
6. `POST /api/v1/payments/paypal/create`
7. `POST /api/v1/payments/paypal/complete`
8. 비디오 관련 API

## 1차 완료 기준

1차가 끝났다고 볼 수 있는 기준:

- 모바일/PC 프론트가 공통 API를 통해 잔액, 곡 목록, 곡 상세를 조회할 수 있다
- 생성 요청을 `songsai-api`가 접수하고 wrapper를 통해 처리할 수 있다
- 다운로드 링크 흐름이 API 기준으로 정리된다
- PayPal 충전의 최소 흐름이 동작한다
- CAPTCHA 운영 지식이 새 구조에서도 유지된다

## 결론

1차의 핵심은 “모든 기능 이전”이 아니라 “`songsai-api`를 실제 백엔드의 시작점으로 만드는 것”입니다.

즉 먼저:

- 사용자 공통 정보
- 잔액
- 생성 요청
- 결과 조회
- 결제 시작

이 다섯 축을 `songsai-api`로 옮기는 것이 맞습니다.
