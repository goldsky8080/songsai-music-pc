# songsai-api GenerationJob 확장안

작성일: 2026-04-12

## 목적

`songsai-api`를 실제 작업 큐 중심 백엔드로 운영하기 위해 `GenerationJob`에
생성 실행, 상태 폴링, 잠금, 재시도, 우선순위 정보를 함께 둔다.

이 문서는 다음 흐름을 기준으로 한다.

1. 음악 생성 요청은 바로 provider를 끝까지 기다리지 않고 DB 큐에 적재한다.
2. worker는 동시성 제한(`예: 5`)으로 `MUSIC_GENERATION` job를 실행한다.
3. 생성 후 바로 자산을 저장하지 않고, 5분 간격 폴링으로 안정 URL을 확인한다.
4. 최종 완료 후 `Music.mp3Url`, `Music.imageUrl`, `Music.videoUrl`를 업데이트한다.
5. 실제 파일 다운로드/캐시는 사용자가 다운로드 화면에 접근할 때 lazy하게 처리한다.

## 현재 기준 필드

`D:\wrapper\suno-api\prisma\schema.prisma`

`GenerationJob`에 아래 필드를 확정 기준으로 둔다.

- `queueStatus`
  - `QUEUED | ACTIVE | COMPLETED | FAILED | CANCELLED`
- `priority`
  - 작은 값이 더 높은 우선순위
  - 기본값 `100`
- `attemptCount`
  - 현재까지 시도 횟수
- `maxAttempts`
  - 최대 재시도 횟수
  - 기본값 `3`
- `runAfter`
  - 다음 실행 가능 시각
  - 생성 직후/재시도/폴링 예약 모두 이 값으로 제어
- `startedAt`
  - 실제 작업 시작 시각
- `finishedAt`
  - 완료/실패 종료 시각
- `lockedAt`
  - worker가 job를 잡은 시각
- `lockedBy`
  - 어떤 worker가 처리 중인지 식별
- `lastCheckedAt`
  - 폴링 계열 job의 마지막 상태 확인 시각
- `providerTaskId`
  - Suno/provider 작업 식별자
- `payload`
  - 생성 요청 또는 폴링 입력 원본
- `result`
  - provider 응답 또는 worker 처리 결과
- `errorMessage`
  - 실패 사유

## 추천 jobType

현재 1차 구현 기준:

- `MUSIC_GENERATION`
- `MUSIC_STATUS_POLL`

추후 확장:

- `MUSIC_ASSET_CACHE`
- `VIDEO_RENDER`

## worker 규칙

### 1. MUSIC_GENERATION

- `queueStatus = QUEUED`
- `runAfter <= now`
- `lockedAt is null` 또는 stale lock 회수 가능 상태
- 동시성 `5`

처리:

1. lock 획득
2. `queueStatus = ACTIVE`, `startedAt = now`
3. provider 생성 요청
4. 성공 시
   - `Music.status = PROCESSING`
   - `providerTaskId`, `rawStatus`, `rawResponse` 저장
   - `MUSIC_STATUS_POLL` job 생성
   - poll job `runAfter = now + 5분`
5. 실패 시
   - `attemptCount + 1`
   - `attemptCount < maxAttempts`면 `runAfter` 뒤로 미루고 재큐잉
   - 초과 시 `FAILED`

### 2. MUSIC_STATUS_POLL

- `queueStatus = QUEUED`
- `runAfter <= now`
- `providerTaskId` 존재
- 동시성 `5`

처리:

1. provider 상태 조회
2. 완료 조건:
   - 안정된 `mp3Url` 존재
   - 필요 시 `imageUrl`도 확인
3. 완료 시
   - `Music.status = COMPLETED`
   - `Music.mp3Url`, `Music.imageUrl`, `Music.videoUrl`, `rawStatus`, `rawResponse` 갱신
   - job `COMPLETED`, `finishedAt = now`
4. 미완료 시
   - `attemptCount + 1`
   - `lastCheckedAt = now`
   - `runAfter = now + 5분`
5. 장시간 미완료 시
   - 정책에 따라 `FAILED` 또는 장기 대기 유지

## 다운로드/자산 저장 정책

기본 원칙:

- `Music`에는 provider 기준 최종 URL만 먼저 저장한다.
- `MusicAsset`는 즉시 만들지 않는다.

다운로드 시:

1. `MusicAsset`가 있으면 서버 저장 자산 제공
2. 없으면 우선 `Music.mp3Url`, `Music.imageUrl`로 클라이언트 직접 다운로드
3. 비디오 제작/보존이 필요할 때만 서버 캐시(`MusicAsset`) 생성

## 인덱스 기준

큐 worker 효율을 위해 아래 인덱스를 둔다.

- `@@index([queueStatus, runAfter, priority])`
- `@@index([providerTaskId])`

## 다음 단계

1. Prisma 반영
2. worker selection query 구현
3. `MUSIC_GENERATION` 재시도 규칙 구현
4. `MUSIC_STATUS_POLL` 예약/완료 규칙 구현
5. 프론트 작업 화면과 상태 표시 연결

## 현재 로컬 테스트 진입점

1차 구현 기준으로 수동 worker 실행 API를 둔다.

- `POST /api/v1/jobs/run`

동작:

- `MUSIC_GENERATION` job 최대 5개 claim
- `MUSIC_STATUS_POLL` job 최대 5개 claim
- provider 호출 / 상태 조회 후 결과를 DB에 반영

권한 규칙:

- `WORKER_SECRET`가 있으면 `x-worker-secret` 헤더 일치 필요
- secret이 없으면 `localhost` 요청만 허용
