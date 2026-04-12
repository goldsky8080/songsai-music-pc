# songsai-api Music / GenerationJob 이관 계획

## 목적

`D:\music`에 있는 음악 생성 도메인 모델을 `songsai-api`로 통합하기 위한 단계별 계획이다.

핵심 목표:

- `songsai-api`가 인증 + wrapper를 넘어서 진짜 음악 서비스 백엔드가 되게 만든다.
- `songsai-music-pc`는 오직 API만 호출하도록 정리한다.
- 음악 생성 흐름을 queue 기반으로 안정화한다.

---

## 현재 상태

### 현재 `songsai-api`

`D:\wrapper\suno-api\prisma\schema.prisma`

- `User`만 존재
- 인증/Google 로그인은 구현됨
- wrapper 호출은 구현됨
- 음악 생성 저장 모델 없음

### 현재 `D:\music`

`D:\music\prisma\schema.prisma`

이미 존재하는 주요 모델:

- `Music`
- `MusicAsset`
- `Video`
- `GenerationJob`

이미 존재하는 장점:

- 음악 생성 요청 저장
- 그룹 단위 트랙 묶기(`requestGroupId`)
- 상태 enum 분리
- 비디오/자산 후처리 확장 가능
- 큐 상태와 결과 payload 저장 가능

---

## 왜 이관이 필요한가

현재 `songsai-api`는 wrapper 중심이라서:

- 최근 생성곡
- 내 작업 이력
- 생성 요청 큐
- 상태 동기화
- 자산/비디오 확장

을 안정적으로 다루기 어렵다.

반면 `D:\music`은 이미 위 구조를 부분적으로 갖고 있다.

따라서 새로 발명하기보다 `D:\music`의 music domain을 `songsai-api`로 옮기는 것이 맞다.

---

## 이관 대상

## 1. Prisma 모델

우선순위 높은 순서:

1. `Music`
2. `GenerationJob`
3. `Video`
4. `MusicAsset`

초기 1차 목표만 보면, 최소 필요 모델은 다음 두 개다.

- `Music`
- `GenerationJob`

이 두 개만 있어도:

- 생성 요청 저장
- 최근 생성곡 조회
- 상태 동기화
- 큐 처리

를 시작할 수 있다.

---

## 2. 상태 enum

우선 이관 권장 enum:

- `MusicStatus`
- `QueueStatus`
- `JobType`
- `JobTargetType`

비디오/자산 단계에서 추가:

- `VideoStatus`
- `AssetStatus`
- `MusicAssetType`

---

## 3. 서비스 로직

가져와야 할 핵심 로직:

- `createMusicSchema`
- provider 정규화
- `syncMusicStatuses()`
- requestGroupId 기반 그룹핑
- display title 생성 규칙

---

## 큐 도입 판단

## 결론

큐는 도입하는 것이 맞다.

### 이유

- 생성 요청과 외부 provider 호출을 분리해야 안정적이다
- 향후 비디오/자막/자산 후처리가 붙으면 동기 처리로 버티기 어렵다
- 실패 재시도 및 운영 추적이 쉬워진다
- 프론트 응답 속도를 일정하게 유지할 수 있다

즉 큐는 부가 기능이 아니라, `songsai-api`를 서비스 백엔드로 만드는 핵심 기반이다.

---

## 권장 단계별 이관 순서

## 단계 1. Prisma 모델 최소 이관

`songsai-api`에 아래만 먼저 옮긴다.

- `Music`
- `GenerationJob`
- `MusicStatus`
- `QueueStatus`
- `JobType`
- `JobTargetType`

목적:

- 음악 생성 요청이 DB에 남도록 만들기
- 최근 생성곡 read model 기반을 만들기
- 큐 상태 저장이 가능하게 만들기

### 이 단계에서 하지 않아도 되는 것

- `Video`
- `MusicAsset`
- 쿠폰/입금/크레딧 전체 이관

---

## 단계 2. 읽기 API 먼저 구축

Prisma 모델이 생기면 아래 읽기 API를 먼저 만든다.

- `GET /api/v1/music/recent?limit=10`
- `GET /api/v1/me/music?page=1&limit=20`
- `GET /api/v1/music/:id`

이유:

- 프론트는 읽기 API가 먼저 있어야 UI 전환이 가능하다
- 생성 요청보다 최근 생성곡/내 작업 조회가 UI에 바로 도움이 된다

---

## 단계 3. 생성 요청 저장 + 큐 적재

예상 흐름:

1. 프론트가 생성 요청
2. `songsai-api`가 `Music` row 생성
3. `GenerationJob` row 생성 (`queueStatus=QUEUED`)
4. API는 즉시 접수 응답

이 단계에서는 아직 provider 호출이 즉시 일어나도 되지만,
구조만큼은 queue 중심으로 맞춰두는 것이 중요하다.

---

## 단계 4. queue worker 도입

권장 방법:

- 1차는 간단한 poller/background runner도 가능
- 별도 프로세스가 `GenerationJob(queueStatus=QUEUED)`를 읽어 처리

worker 역할:

- provider 호출
- `providerTaskId` 저장
- `Music.status` 갱신
- `GenerationJob.result` 저장
- 실패 시 `GenerationJob.errorMessage` 기록

---

## 단계 5. 상태 동기화 루프

`syncMusicStatuses()`를 `songsai-api`로 옮기거나 재구현한다.

역할:

- `Music.status in (QUEUED, PROCESSING)` 항목 조회
- provider 상태 조회
- 완료 시 `Music.mp3Url`, `errorMessage`, `GenerationJob.result` 갱신

이건 읽기 API 정확도를 위해 꼭 필요하다.

---

## 단계 6. 비디오/자산 확장

음악 도메인이 안정되면 아래를 추가 이관한다.

- `Video`
- `MusicAsset`
- 후처리 job
- 다운로드용 자산 정리

이 단계는 음악 생성/조회가 안정된 뒤로 미뤄도 된다.

---

## 권장 구현 순서 요약

### 1차

- `Music`
- `GenerationJob`
- 최근 생성곡 API
- 내 작업 목록 API

### 2차

- 생성 요청 저장
- queue 상태 기록
- provider 호출 분리

### 3차

- 상태 동기화
- 제목/그룹핑 정교화

### 4차

- `Video`
- `MusicAsset`
- 후처리 파이프라인

---

## 프론트 영향

이관이 끝나면 `songsai-music-pc`는 다음만 하면 된다.

- 홈: `GET /api/v1/music/recent`
- 내 작업: `GET /api/v1/me/music`
- 생성 요청: `POST /api/v1/music`
- 상세/상태: `GET /api/v1/music/:id`

즉 프론트는 DB/queue/provider를 몰라도 된다.

---

## 구현 시 주의할 점

1. raw wrapper 필드명을 public API에 그대로 노출하지 않는다.
2. `songsai-api` 내부 adapter에서만 raw 필드를 해석한다.
3. `requestGroupId`는 초기부터 유지하는 것이 좋다.
4. 생성 완료 여부는 프론트가 아니라 API에서 판별한다.
5. queue는 "나중에"가 아니라 구조 초기에 넣는 편이 좋다.

---

## 최종 판단

`songsai-api`는 앞으로 다음 역할을 가져야 한다.

- 인증 서버
- 음악 생성 도메인 서버
- 큐/상태 동기화 서버
- 최근 생성곡/내 작업 이력 API 서버

그리고 `songsai-music-pc`는:

- 화면/UI 전용
- API 소비 전용

으로 유지하는 것이 가장 좋다.

