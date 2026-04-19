# ACE-Step DB 저장 규칙 계약서

기준일: 2026-04-18

## 목적

이 문서는 `ace-step-api`가 DB를 직접 저장할 때, 기존 SongsAI 프론트와 읽기 API가 깨지지 않도록 최소 저장 규칙을 정의한다.

핵심 원칙은 다음과 같다.

- `ace-step-api`는 DB를 직접 저장한다.
- 하지만 저장 형식은 기존 `songsai-api` 읽기 모델과 호환되어야 한다.
- 프론트는 provider가 Suno인지 ACE-Step인지 몰라도 기존 카드 구조로 보여줄 수 있어야 한다.

## 대상 테이블

1차 기준으로 가장 중요한 대상은 다음이다.

- `Music`
- 필요 시 `GenerationJob`
- 필요 시 `MusicAsset`

1차에서는 `Music` 저장 규칙이 가장 중요하다.

## Music 필수 저장 필드

### 반드시 채워야 하는 필드

- `id`
- `userId`
- `title`
- `status`
- `provider`
- `providerTaskId`
- `lyrics`
- `stylePrompt`
- `imageUrl`
- `mp3Url`
- `isPublic`
- `createdAt`
- `updatedAt`

### 가능한 한 채워야 하는 필드

- `duration`
- `errorMessage`
- `downloadAvailableAt`
- `mp4Url`

## 필드별 규칙

### 1. provider

- 값은 반드시 `ACE_STEP` 또는 프로젝트에서 정한 동일 상수로 저장한다.
- Suno와 구분 가능해야 한다.

### 2. providerTaskId

- ACE-Step 내부 작업 ID 또는 요청 ID를 저장한다.
- 작업 재조회, 디버깅, 실패 추적에 필요하다.
- null로 두지 않는 것을 원칙으로 한다.

### 3. status

허용 의미:

- `queued`
  - 생성 요청 수락 직후
- `processing`
  - 실제 생성 중
- `completed`
  - 프론트에서 재생/다운로드 가능한 상태
- `failed`
  - 생성 실패

중요:

- `completed`는 `mp3Url`이 실사용 가능할 때만 쓴다.
- `failed`이면 `errorMessage`를 같이 남긴다.

### 4. title

- 비어 있으면 안 된다.
- 모델이 제목을 별도로 주지 않으면, 입력 프롬프트 기반 기본 제목 생성 규칙을 둔다.
- 프론트 카드에서 바로 노출되므로 최종 사용자 친화적 문자열이어야 한다.

### 5. lyrics

- 존재하면 저장한다.
- instrumental이어도 빈 문자열 대신 의도된 값으로 유지하는 편이 낫다.

### 6. stylePrompt

- 입력에 사용된 스타일 지시문을 저장한다.
- 프론트 카드의 서브 정보와 디버깅에 도움 된다.

### 7. imageUrl

- 커버 이미지가 실제 접근 가능한 URL이어야 한다.
- 가능하면 프론트에서 직접 열 수 있는 URL 기준으로 저장한다.
- 비어 있으면 홈, Create, My Assets 카드가 깨지므로 반드시 대체 전략이 필요하다.

### 8. mp3Url

- 프론트 재생/다운로드가 가능한 URL이어야 한다.
- `completed` 상태인데 `mp3Url`이 비면 안 된다.

### 9. isPublic

- 기본값은 `false`
- 사용자가 공개 전환하기 전까지는 비공개 원칙

### 10. duration

- 초 단위 숫자 기준 권장
- 없더라도 1차는 허용 가능하지만, 가능하면 채운다.

### 11. downloadAvailableAt

- SongsAI 기존 정책과 맞춘다.
- 예: 생성 완료 후 5분
- 다운로드 정책을 유지하려면 이 필드 계산 규칙을 통일해야 한다.

## 프론트 호환성 기준

다음 화면이 깨지지 않으려면 최소한 아래 조합이 맞아야 한다.

### Home 최근 생성곡

필요:

- `title`
- `status`
- `createdAt`
- `imageUrl`
- `mp3Url`

### Create / My Assets

필요:

- `title`
- `createdAt`
- `imageUrl`
- `mp3Url`
- `status`
- `providerTaskId`
- `duration`

### Explore

필요:

- `isPublic=true`
- `title`
- `artistId`
- `artistName`
- `imageUrl`
- `mp3Url`
- `status`

즉 ACE-Step이 DB 저장을 하더라도, 읽기 모델이 기대하는 최소 필드는 지켜야 한다.

## songsai-api는 어디까지 하나

### songsai-api 책임 종료 지점

`provider=ace_step`인 경우:

1. 요청 검증
2. 사용자 세션 확인
3. `ace-step-api` 호출
4. 요청 수락 응답 반환

여기서 종료한다.

즉 아래는 하지 않는다.

- ACE-Step 결과 DB 저장
- ACE-Step 상태 poll
- ACE-Step 결과 후처리

## ace-step-api가 해야 하는 일

### 필수

1. 입력 수신
2. 작업 ID 생성
3. 상태 `queued` 또는 `processing` 저장
4. 음악 생성
5. 이미지 생성
6. 결과 파일 경로/URL 확보
7. `Music` 업데이트
8. `completed` 또는 `failed` 마무리

### 권장

1. raw metadata 저장
2. 입력 파라미터 기록
3. 모델 버전 기록
4. 실패 사유 구체화

## 저장 시점 규칙

### 생성 시작 직후

저장 권장:

- `provider=ACE_STEP`
- `providerTaskId`
- `status=queued`
- `title` 초깃값
- `lyrics`
- `stylePrompt`
- `userId`
- `isPublic=false`

### 생성 진행 중

업데이트 권장:

- `status=processing`
- `updatedAt`

### 생성 완료

반드시 업데이트:

- `status=completed`
- `mp3Url`
- `imageUrl`
- `duration`
- `updatedAt`
- 필요 시 `downloadAvailableAt`

### 생성 실패

반드시 업데이트:

- `status=failed`
- `errorMessage`
- `updatedAt`

## 추천 추가 필드

1차는 필수는 아니지만, 나중에 유용하다.

- `providerModel`
- `inferenceMetadata`
- `coverAssetId`
- `audioAssetId`

가능하면 JSON metadata 하나로 먼저 묶고, 안정화 후 컬럼 승격을 고려한다.

## 구현 체크리스트

- [ ] `ace-step-api`가 `Music` 테이블 스키마 접근 방식 확정
- [ ] `provider` 상수값 확정
- [ ] `status` 전이 규칙 확정
- [ ] `downloadAvailableAt` 계산 규칙 확정
- [ ] `imageUrl`, `mp3Url` 저장 정책 확정
- [ ] 실패 시 `errorMessage` 형식 확정
- [ ] Explore 노출 조건 검증

## 결론

ACE-Step이 DB를 직접 저장하는 구조는 가능하다.

다만 그 전제는 하나다.

`ace-step-api`가 SongsAI 프론트와 읽기 API가 기대하는 `Music` 저장 규칙을 정확히 지켜야 한다.

즉 핵심은 생성 자체보다 저장 계약이다.
