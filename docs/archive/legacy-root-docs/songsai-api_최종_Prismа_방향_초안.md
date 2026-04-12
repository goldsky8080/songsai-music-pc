# songsai-api 최종 Prisma 방향 초안

## 목적

이 문서는 앞으로 `songsai-api`를 진짜 백엔드 원본으로 키울 때,
Prisma/DB 모델을 어떤 철학으로 가져갈지 정리한 초안이다.

핵심 전제:

- `songsai-api`가 시스템의 진짜 원본 백엔드가 된다.
- `D:\music`은 참고용으로만 사용한다.
- `songsai-music-pc`는 `songsai-api`만 호출하는 얇은 프론트로 간다.
- 생성/조회/삭제/크레딧/큐/상태동기화는 `songsai-api`가 담당한다.

---

## 핵심 원칙

## 1. DB는 songsai_api 기준으로 설계한다

- 더 이상 `public` schema를 원본으로 보지 않는다.
- 앞으로 저장되는 진짜 서비스 데이터는 `songsai_api` schema를 기준으로 쌓는다.
- 과거 `D:\music`의 구조는 참고만 한다.

## 2. 수노 raw 구조를 완전히 버리지 않는다

DB 컬럼을 모두 우리 서비스 이름으로만 만들면,
나중에 provider 디버깅이 어렵고, 수노 응답 차이를 추적하기 힘들다.

따라서 `songsai-api`는 아래 두 계층을 같이 가진다.

- 서비스 정규화 컬럼
- provider raw 정보 저장 영역

즉 "수노 기준 정보"와 "우리 서비스용 조회 모델"을 함께 유지한다.

## 3. 프론트는 raw provider를 모르게 한다

프론트는:

- `rawPayload`
- `rawResponse`
- `rawStatus`

같은 것을 몰라도 된다.

프론트는 오직:

- `title`
- `status`
- `mp3Url`
- `imageUrl`
- `videoUrl`
- `createdAt`

같은 서비스용 응답만 사용한다.

---

## 최종 모델 철학

## Music

`Music`은 "사용자가 인식하는 음악 엔티티"다.

즉 `Music`에는 프론트가 자주 보는 필드가 직접 있어야 한다.

예:

- `title`
- `lyrics`
- `stylePrompt`
- `status`
- `mp3Url`
- `imageUrl`
- `videoUrl`
- `duration`
- `errorMessage`

그리고 provider 추적용 필드도 같이 있어야 한다.

예:

- `provider`
- `providerTaskId`
- `rawStatus`
- `rawPayload`
- `rawResponse`

### 추천 방향

`Music`은 "정규화 컬럼 + raw 추적 정보"를 동시에 가진다.

---

## GenerationJob

`GenerationJob`은 실제 생성 파이프라인 작업 단위다.

목적:

- 요청 적재
- queue 상태 관리
- 재시도
- provider 호출 결과 저장
- 후처리 작업 확장

즉 `GenerationJob`은 큐 중심 모델이다.

필수 필드:

- `queueStatus`
- `attemptCount`
- `payload`
- `result`
- `errorMessage`
- `jobType`
- `targetType`

추가 권장:

- `startedAt`
- `completedAt`
- `lastAttemptAt`

이 필드들이 있으면 운영 추적이 쉬워진다.

---

## Video

`Video`는 음악에서 파생되는 결과물 엔티티다.

필드는 단순하게 시작:

- `musicId`
- `status`
- `mp4Url`
- `bgImageUrl`
- `srtUrl`
- `errorMessage`

이후 렌더 큐를 `GenerationJob(jobType=VIDEO_RENDER)`로 연결한다.

---

## MusicAsset

`MusicAsset`은 파일 단위 자산 관리용이다.

예:

- mp3
- cover image
- aligned lyrics
- title text

즉 `Music`에 직접 다 넣지 않고, 자산 파일은 확장 가능한 별도 테이블로 두는 게 맞다.

---

## 추천 필드 방향

## Music 테이블

### 서비스 정규화 필드

- `id`
- `userId`
- `requestGroupId`
- `title`
- `lyrics`
- `stylePrompt`
- `isMr`
- `status`
- `mp3Url`
- `imageUrl`
- `videoUrl`
- `duration`
- `errorMessage`
- `createdAt`
- `updatedAt`

### provider 추적 필드

- `provider`
- `providerTaskId`
- `rawStatus`
- `rawPayload`
- `rawResponse`

### 보너스/확장용 필드

- `isBonusTrack`
- `bonusUnlockedAt`

---

## 왜 imageUrl / videoUrl 을 Music에 두는가

엄밀히 말하면 `MusicAsset`, `Video`로도 접근 가능하다.

하지만 최근 생성곡, 홈 슬라이더, 목록 화면은
매번 relation join 없이 빠르게 읽히는 것이 중요하다.

그래서 읽기 성능과 단순성을 위해:

- 대표 오디오 URL
- 대표 이미지 URL
- 대표 비디오 URL

는 `Music`에도 직접 두는 것이 좋다.

추가 자산이나 원본 파일은 `MusicAsset`에서 관리한다.

---

## 수노 기준 필드를 어떻게 가져갈까

추천 방식:

### 직접 컬럼으로 둘 것

- `providerTaskId`
- `provider`
- `rawStatus`

### JSON으로 둘 것

- `rawPayload`
- `rawResponse`

이유:

- 수노 응답은 변할 수 있음
- 모든 필드를 컬럼으로 늘리면 DB가 금방 provider 종속적으로 변함
- JSON이면 디버깅/복구/감사에는 충분함

즉 provider raw는 전부 컬럼화하지 말고,
핵심 추적값만 컬럼으로 두고 나머지는 JSON으로 남기는 것이 좋다.

---

## 추천 큐 흐름

1. 프론트가 음악 생성 요청
2. `Music` 생성
3. `GenerationJob(MUSIC_GENERATION, QUEUED)` 생성
4. Worker/Poller가 job 수행
5. provider 호출
6. `Music.providerTaskId`, `rawPayload`, `rawResponse`, `status` 갱신
7. 상태 동기화 루프가 완료될 때까지 `PROCESSING`
8. 완료 시 `mp3Url`, `imageUrl`, `videoUrl`, `status=COMPLETED` 저장

이 흐름이면 조회 API는 항상 `Music`만 보면 된다.

---

## 조회 API가 쉬워지는 이유

이 구조를 따르면 최근 생성곡 API는 단순하다.

예:

```sql
SELECT *
FROM "Music"
WHERE status = 'COMPLETED'
  AND "mp3Url" IS NOT NULL
  AND "errorMessage" IS NULL
ORDER BY "createdAt" DESC
LIMIT 10
```

즉 홈 슬라이더용 API가 wrapper feed에 의존하지 않게 된다.

---

## D:\music 에서 참고할 것

가져와야 할 것은 "철학과 구조"이지, public schema를 그대로 원본으로 삼는 것이 아니다.

참고 대상:

- `MusicStatus`
- `QueueStatus`
- `GenerationJob`
- `syncMusicStatuses()`
- group/requestGroupId 개념
- provider normalized layer

참고만 하고, 최종 원본은 `songsai_api`에서 재구성한다.

---

## 추천 실제 구현 순서

### 1차

- `songsai_api` schema에 `Music`, `GenerationJob`, `Video`, `MusicAsset` 확정
- `Music`에 `imageUrl`, `videoUrl`, `rawStatus`, `rawPayload`, `rawResponse` 추가

### 2차

- 생성 요청 API
- 큐 적재
- 최근 생성곡 API

### 3차

- worker/poller
- 상태 동기화
- 내 작업 목록 API

### 4차

- 삭제 API
- 자산/비디오 API
- 크레딧/결제 통합

---

## 최종 판단

앞으로 `songsai-api`는:

- 수노를 호출하는 wrapper 백엔드
- 인증 백엔드
- 음악 도메인 백엔드
- 큐/상태 동기화 백엔드

를 모두 담당한다.

그리고 DB는:

- `songsai_api` schema가 원본
- provider raw 정보는 JSON 포함으로 보존
- 프론트는 정규화된 서비스 응답만 소비

이 방향으로 가는 것이 가장 맞다.

