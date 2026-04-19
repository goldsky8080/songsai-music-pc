# ACE-Step 독립 저장형 아키텍처 설계

기준일: 2026-04-18

## 목표

- 프론트는 계속 기존 `songsai-api`만 호출한다.
- `songsai-api`는 `provider=suno`일 때만 기존 생성 흐름을 수행한다.
- `provider=ace_step`일 때는 `ace-step-api`로 요청을 전달하고 역할을 종료한다.
- `ace-step-api`는 음악 생성, 이미지 생성, 상태 관리, DB 저장, 완료 처리까지 전부 담당한다.
- 프론트의 읽기/표시 구조는 기존 `songsai-api` 읽기 모델을 최대한 유지한다.

## 왜 이 구조가 맞는가

### 1. 생성 엔진 독립성이 높다

- Suno와 ACE-Step은 생성 방식, 실행 환경, 운영 조건이 다르다.
- 특히 ACE-Step은 GPU, Python, 추론 서버, 후처리 흐름이 따로 필요할 가능성이 높다.
- 이 책임을 기존 `songsai-api`에 섞으면 운영 복잡도가 크게 올라간다.

### 2. 프론트 변경이 작다

- 프론트는 계속 `songsai-api`의 진입점만 부르면 된다.
- 사용자 입장에서는 같은 `Create` 경험을 유지할 수 있다.
- 모델 선택에 따라 내부 라우팅만 달라진다.

### 3. ACE-Step을 별도 서비스처럼 운영할 수 있다

- `ace-step-api`는 생성 전용 서비스가 된다.
- 나중에 GPU 서버를 따로 옮기거나 확장하기 쉽다.
- 실패, 지연, 재시도, 작업 큐도 ACE-Step 쪽에서 독립적으로 운영 가능하다.

## 최종 구조

```text
Frontend
  -> songsai-api
       -> provider=suno     : 기존 로직 수행
       -> provider=ace_step : ace-step-api 호출 후 종료

ace-step-api
  -> 음악 생성
  -> 이미지 생성
  -> 상태 관리
  -> DB 저장
  -> 완료 처리

Frontend
  -> 기존 songsai-api 읽기 API로 결과 표시
```

## 책임 분리

### songsai-api 책임

- 사용자 인증/세션 확인
- 프론트 진입점 유지
- `provider` 값 검증
- Suno 요청은 기존대로 직접 처리
- ACE-Step 요청은 `ace-step-api`에 전달
- ACE-Step 호출 성공/실패에 대한 최소 응답만 반환
- 읽기 API 유지
  - `GET /api/v1/music`
  - `GET /api/v1/music/recent`
  - `GET /api/v1/explore`
  - `GET /api/v1/music/:id/download`

### ace-step-api 책임

- ACE-Step 모델 로딩
- 추론 파이프라인 실행
- 오디오 생성
- 커버/이미지 생성
- 필요한 파일 업로드 또는 저장
- DB에 결과 저장
- 상태 전이 관리
  - `queued`
  - `processing`
  - `completed`
  - `failed`
- 필요 시 재시도/실패 기록

## 요청 흐름

### 1. Suno 선택

```text
Frontend -> POST /api/v1/music (songsai-api)
songsai-api -> 기존 Suno 로직 수행
songsai-api -> DB 저장
songsai-api -> 응답
```

### 2. ACE-Step 선택

```text
Frontend -> POST /api/v1/music (songsai-api)
songsai-api -> provider=ace_step 확인
songsai-api -> ace-step-api 생성 요청 전달
songsai-api -> 즉시 요청 수락 응답 반환

ace-step-api -> 생성 시작
ace-step-api -> DB 저장
ace-step-api -> 완료 처리
```

## 중요한 판단

### songsai-api는 ACE-Step DB 저장을 하지 않는다

이 구조의 핵심은 여기다.

- `songsai-api`는 ACE-Step 결과를 저장하지 않는다.
- `ace-step-api`가 생성부터 저장까지 전부 처리한다.
- 대신 두 서비스는 같은 저장 계약을 정확히 공유해야 한다.

즉 독립성은 높아지지만, 저장 규칙 문서화가 필수다.

## 프론트 기준 변화

### Create 화면

- `provider` 선택 UI 제공
  - `suno`
  - `ace_step`
- 요청 payload에 `provider` 포함
- 나머지 입력 필드 구조는 최대한 공통 유지
  - 제목 또는 프롬프트
  - 가사
  - 스타일
  - 모델 버전

### 읽기 화면

다음 화면은 가능하면 기존대로 유지한다.

- Home 최근 생성곡
- Create 최근 생성 결과
- My Assets
- Explore
- Artist 페이지

즉 프론트 표시 구조는 provider별로 갈라지지 않게 한다.

## 장점

- 프론트 영향 최소화
- Suno와 ACE-Step 책임 완전 분리
- GPU 추론 서비스 독립 운영 가능
- 성능/큐/재시도 로직을 ACE-Step 특성에 맞게 설계 가능
- 나중에 다른 오픈소스 모델도 같은 방식으로 추가 가능

## 단점

- DB 저장 규칙이 `songsai-api`와 `ace-step-api` 양쪽에 퍼질 수 있다
- 스키마 변경 시 두 서비스가 함께 맞춰져야 한다
- 저장 형식이 조금만 어긋나도 프론트 표시가 흔들릴 수 있다

즉 이 구조에서는 반드시 저장 계약 문서가 필요하다.

## 권장 운영 원칙

1. 읽기 모델은 기존 SongsAI 구조를 유지한다.
2. `ace-step-api`는 DB를 직접 쓰더라도, 임의 구조가 아니라 기존 `Music` 읽기 모델과 맞는 형태로 저장한다.
3. `provider="ACE_STEP"`를 명확히 기록한다.
4. 저장 규칙은 문서화하고, 코드보다 먼저 합의한다.
5. 1차에서는 ACE-Step이 꼭 필요한 필드만 저장하고, 나머지 확장 필드는 JSON metadata로 보류할 수 있다.

## 1차 구현 범위

- 프론트에 `ACE-Step` 전용 Create 화면 추가
- 상단 메뉴에 `ACE-Step` 진입점 추가
- `songsai-api`에 `provider=ace_step` 요청 전달 분기 추가
- `ace-step-api` 프로젝트 골격 생성
- DB 저장 규칙 문서 작성
- ACE-Step 결과를 기존 `Music` 읽기 구조와 맞출 수 있는지 검증

## 1차 구현에서 하지 않을 것

- 모든 읽기 API를 ace-step-api로 옮기기
- 기존 `songsai-api` 읽기 구조 해체
- 비디오 생성 구조 변경
- 좋아요/Explore 로직 분리

## 다음 문서

- `17_ACE-Step_DB_저장_규칙_계약서.md`
  - `ace-step-api`가 어떤 필드를 어떤 의미로 저장해야 하는지 상세 규칙
