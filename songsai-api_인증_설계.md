# songsai-api 인증 설계

이 문서는 `songsai-music-pc`가 앞으로 사용할 공용 인증을 `songsai-api` 중심으로 정리하기 위한 기준 문서입니다.

목표는 다음과 같습니다.

- 로그인/회원가입/Google 로그인을 `songsai-api`로 일원화한다
- PC 프론트와 모바일 프론트가 같은 인증 체계를 사용한다
- 현재 `D:\music`에 있는 검증된 Google 로그인/세션 코드를 최대한 재사용한다
- 서버 이관 후에도 로컬 PC 프론트가 API를 안정적으로 호출할 수 있게 한다

## 핵심 결론

인증은 `songsai-music-pc`에 직접 구현하지 않고 `songsai-api`에 구현하는 것이 맞습니다.

즉:

- `songsai-api`
  - 회원가입
  - 이메일/비밀번호 로그인
  - Google OAuth 로그인
  - 세션 발급/로그아웃
  - 현재 사용자 조회
- `songsai-music-pc`
  - 로그인/회원가입 UI
  - Google 로그인 버튼 UI
  - `songsai-api` 호출
  - 로그인 후 사용자 상태 소비

## 왜 songsai-api에 두는가

- 인증은 모바일/PC 공통 기능이다
- Google OAuth 콜백과 계정 연결은 공용 백엔드 책임이 맞다
- 세션, 사용자, 크레딧, 생성 이력은 결국 같은 도메인 데이터다
- 프론트마다 인증을 따로 넣으면 나중에 병합과 운영이 꼬인다

## 현재 재사용 가능한 기존 자산

`D:\music`에는 이미 다음 인증 관련 코드가 존재한다.

- 세션 JWT 쿠키 처리: `D:\music\lib\auth.ts`
- Google OAuth 시작: `D:\music\app\api\auth\google\route.ts`
- Google OAuth 콜백: `D:\music\app\api\auth\google\callback\route.ts`
- 입력 검증 스키마: `D:\music\server\auth\schema.ts`
- 사용자 모델의 `googleId`, `passwordHash`, `role`: `D:\music\prisma\schema.prisma`

주의:

- 현재 `D:\music`에서는 이메일/비밀번호 로그인과 회원가입이 `410`으로 비활성화되어 있다
- 따라서 `songsai-api`에서는 Google 로그인 로직을 먼저 이식하고, 이메일/비밀번호는 새로 활성화 구현해야 한다

## 권장 구현 순서

### 1차

먼저 검증된 흐름부터 옮긴다.

- Google 로그인
- 세션 쿠키/JWT
- 로그아웃
- `GET /api/v1/me`

### 2차

그 다음 일반 로그인/회원가입을 붙인다.

- 이메일 회원가입
- 이메일/비밀번호 로그인
- 비밀번호 해시 검증

이 순서가 좋은 이유:

- Google 로그인은 이미 `D:\music`에서 검증 흔적이 있다
- 이메일/비밀번호는 새 구현 범위가 더 크다
- 서버 이관 후 PC 프론트 연동 테스트를 먼저 빠르게 끝낼 수 있다

## 데이터 모델 기준

`songsai-api`의 사용자 모델은 최소 아래 필드를 가져야 한다.

```prisma
enum UserRole {
  USER
  DEVELOPER
  ADMIN
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  googleId     String?  @unique
  passwordHash String
  role         UserRole @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

추가로 앞으로 필요할 가능성이 높은 필드:

- `name`
- `profileImage`
- `freeCredits`
- `paidCredits`
- `tier`

## 세션 방식

1차는 지금 `D:\music`처럼 `JWT + httpOnly cookie` 방식으로 가는 것이 좋다.

이유:

- 구현이 빠르다
- 현재 검증 코드 재사용이 쉽다
- 서버 1대 기준 운영이 단순하다

권장 쿠키:

- `songsai-api-session`
- `songsai-api-google-state`

JWT payload 최소 기준:

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "USER"
}
```

권장 만료:

- 세션 쿠키: 7일
- Google state 쿠키: 10분

## 환경변수 기준

`songsai-api`에는 최소 아래 환경변수가 필요하다.

```env
DATABASE_URL=
APP_URL=
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=
```

설명:

- `APP_URL`
  - `songsai-api` 자체 공개 주소
  - 예: `https://api.songsai.com`
- `FRONTEND_URL`
  - 로그인 완료 후 돌려보낼 프론트 주소
  - 예: `http://localhost:3000`

## API 계약

### 1. 회원가입

`POST /api/v1/auth/signup`

요청:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

응답:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

동작:

- 이메일 중복 검사
- 비밀번호 해시 저장
- 세션 쿠키 발급

### 2. 이메일 로그인

`POST /api/v1/auth/login`

요청:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

응답:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

동작:

- 사용자 조회
- 비밀번호 검증
- 세션 쿠키 발급

### 3. Google 로그인 시작

`GET /api/v1/auth/google/start`

동작:

- Google OAuth URL 생성
- state 쿠키 저장
- Google로 redirect

### 4. Google 로그인 콜백

`GET /api/v1/auth/google/callback`

동작:

- state 검증
- access token 교환
- Google userinfo 조회
- `googleId` 또는 `email` 기준 사용자 연결
- 없으면 새 사용자 생성
- 세션 쿠키 발급
- `songsai-music-pc`로 redirect

### 5. 현재 사용자 조회

`GET /api/v1/me`

응답:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

### 6. 로그아웃

`POST /api/v1/auth/logout`

동작:

- 세션 쿠키 만료 처리

## Google 로그인 연결 규칙

Google 로그인 시 사용자는 아래 우선순위로 연결한다.

1. `googleId`가 이미 있으면 해당 사용자 로그인
2. 없고 같은 `email` 사용자가 있으면 그 계정에 `googleId` 연결
3. 둘 다 없으면 새 사용자 생성

추가 규칙:

- `email_verified = true`인 계정만 허용
- `googleId`는 unique 유지

## 이메일/비밀번호 구현 기준

이메일/비밀번호는 `songsai-api`에서 새로 활성화 구현해야 한다.

권장 기준:

- 비밀번호는 `bcrypt` 또는 `argon2`
- 최소 8자 이상
- 가입 시 이메일 소문자/trim 정규화
- 이미 Google로만 가입한 계정에도 나중에 비밀번호 설정 가능하게 확장 여지 유지

## songsai-music-pc 연동 방식

`songsai-music-pc`는 인증 로직을 직접 들지 않는다.

원칙:

- 로그인/회원가입 폼은 `songsai-api`를 호출
- Google 버튼은 `songsai-api`의 `/api/v1/auth/google/start`로 이동
- 로그인 성공 후 `GET /api/v1/me`로 사용자 상태 확인
- 세션은 API 쿠키 기반으로 유지

프론트 환경변수 예시:

```env
NEXT_PUBLIC_SONGSAI_API_URL=http://localhost:3100
```

주의:

- 로컬에서 프론트와 API 도메인이 다르면 CORS + credentials 설정이 필요하다
- fetch 시 `credentials: "include"`를 써야 한다

## 로컬 개발 흐름

권장 포트 예시:

- `songsai-music-pc`: `3000`
- `songsai-api`: `3100`

로컬 테스트 순서:

1. `songsai-api` 실행
2. Google OAuth callback URL을 로컬 기준으로 등록
3. `songsai-music-pc`에서 로그인 페이지 구현
4. 프론트에서 `songsai-api` 호출
5. `GET /api/v1/me`로 세션 확인

## 신규 서버 이관 순서

1. 신규 서버에 `songsai-api` 저장소 배치
2. PostgreSQL 연결
3. 사용자 테이블 migration 적용
4. Google OAuth 운영용 redirect URL 등록
5. `songsai-api` HTTPS 공개
6. 로컬 `songsai-music-pc`에서 운영 API 호출 테스트
7. 이후 `songsai-music-pc`도 서버 배포

## 권장 1차 완료 기준

1차 완료로 볼 수 있는 기준:

- Google 로그인 성공
- 세션 쿠키 발급 성공
- `GET /api/v1/me` 응답 성공
- 로그아웃 성공
- 로컬 `songsai-music-pc`에서 로그인 상태를 확인 가능

이후 2차로:

- 이메일 회원가입
- 이메일 로그인
- 비밀번호 재설정

## 다음 구현 작업

이 문서 다음으로 바로 할 일은 아래 순서가 좋다.

1. `songsai-api` 저장소를 준비한다
2. `D:\music`의 Google 인증 코드를 옮길 최소 파일 목록을 정리한다
3. `songsai-api`에서 `GET /api/v1/me`, `GET /api/v1/auth/google/start`, `GET /api/v1/auth/google/callback`, `POST /api/v1/auth/logout`부터 구현한다
4. 그 다음 `songsai-music-pc`의 로그인 UI를 API 기준으로 연결한다

## 최종 판단

가장 현실적인 방향은:

- 인증은 `songsai-api`
- UI는 `songsai-music-pc`
- 기존 `D:\music`의 Google 로그인 코드를 재사용
- 서버 이관 후 로컬 프론트가 API를 호출하는 방식으로 검증

이 방향이 현재 문서 구조와 운영 방식, 그리고 장기 재구축 방향에 가장 잘 맞다.
