# songsai-api / D:\music 스키마 차이 분석

## 목적

이 문서는 `songsai-api`가 `D:\music`의 DB 구조를 직접 읽을 수 있으려면
Prisma 스키마를 어디까지 맞춰야 하는지 비교하기 위한 기준 문서다.

핵심 질문:

- 지금 `songsai-api`가 `D:\music`의 DB를 바로 읽을 수 있는가?
- 바로 못 읽는다면 어떤 모델/필드를 먼저 맞춰야 하는가?

---

## 결론 요약

지금 상태로는 바로 읽는 것이 안전하지 않다.

이유:

1. DB schema 경로가 다름
2. `User` 모델이 다름
3. `Music`, `GenerationJob`은 최소판만 있고 `D:\music`과 아직 완전히 같지 않음
4. `Video`, `MusicAsset`, 크레딧/거래 관련 모델이 없음

즉 방향은 맞지만, 먼저 Prisma 스키마를 `D:\music` 기준에 더 가깝게 맞춘 뒤 연결하는 것이 맞다.

---

## 1. DB 연결 차이

### `D:\music`

예시 env:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/music_platform?schema=public"
```

### 현재 `songsai-api`

운영에서 사용 중인 방향:

```env
DATABASE_URL="postgresql://.../music_platform?schema=songsai_api"
```

### 차이

- `D:\music`는 `public` schema 사용
- `songsai-api`는 현재 `songsai_api` schema 사용

### 의미

현재 그대로는 `songsai-api`가 `D:\music`에 쌓인 음악 데이터를 볼 수 없다.

---

## 2. User 모델 차이

## `D:\music` User

주요 필드:

- `id`
- `email`
- `googleId`
- `passwordHash`
- `freeCredits`
- `paidCredits`
- `tier`
- `role`
- `createdAt`
- `updatedAt`

relation:

- `musics`
- `transactions`
- `generationJobs`
- `creditGrants`
- `createdCoupons`
- `couponUses`
- `depositRequests`

## 현재 `songsai-api` User

주요 필드:

- `id`
- `email`
- `googleId`
- `passwordHash`
- `name`
- `profileImage`
- `role`
- `createdAt`
- `updatedAt`

relation:

- `musics`
- `generationJobs`

## 차이 해석

### `songsai-api`에만 있는 필드

- `name`
- `profileImage`

### `D:\music`에만 있는 필드

- `freeCredits`
- `paidCredits`
- `tier`

### 중요도

- 최근 생성곡만 보려면 `freeCredits`, `paidCredits`, `tier`가 꼭 필요하지는 않음
- 하지만 같은 DB를 같은 Prisma 모델로 읽으려면 최소한 스키마 충돌이 없도록 조정이 필요

### 추천

`User`는 `D:\music` 기준을 기반으로 하고,
`songsai-api`에서 필요한 `name`, `profileImage`는 nullable 필드로 병합하는 것이 좋다.

즉 최종적으로는 아래 방향이 자연스럽다.

- `D:\music` 필드 유지
- `songsai-api`가 필요한 `name`, `profileImage` 추가

---

## 3. Music 모델 차이

## `D:\music` Music

주요 필드:

- `id`
- `userId`
- `requestGroupId`
- `lyrics`
- `stylePrompt`
- `isMr`
- `provider`
- `providerTaskId`
- `mp3Url`
- `isBonusTrack`
- `bonusUnlockedAt`
- `status`
- `duration`
- `errorMessage`
- `createdAt`
- `updatedAt`

relation:

- `assets`
- `videos`
- `generationJobs`

## 현재 `songsai-api` Music

현재 1차 최소판:

- `id`
- `userId`
- `requestGroupId`
- `title`
- `lyrics`
- `stylePrompt`
- `isMr`
- `provider`
- `providerTaskId`
- `mp3Url`
- `status`
- `errorMessage`
- `createdAt`
- `updatedAt`

relation:

- `generationJobs`

## 차이

### `songsai-api`에만 있는 필드

- `title`

### `D:\music`에만 있는 필드

- `isBonusTrack`
- `bonusUnlockedAt`
- `duration`
- `assets relation`
- `videos relation`

### 중요도

- 최근 생성곡 API만 보면 `title`, `mp3Url`, `status`, `createdAt`가 중요
- 하지만 `D:\music` DB를 그대로 읽으려면 `isBonusTrack`, `bonusUnlockedAt`, `duration`도 맞추는 것이 좋다

### 추천

`Music`은 거의 `D:\music` 기준으로 맞추고,
`title`은 nullable 필드로 추가해도 무방하다.

즉 `Music`은 통합 비용이 낮고, 우선적으로 맞추기 좋은 모델이다.

---

## 4. GenerationJob 모델 차이

## `D:\music` GenerationJob

필드:

- `id`
- `userId`
- `musicId`
- `videoId`
- `targetType`
- `jobType`
- `queueStatus`
- `attemptCount`
- `payload`
- `result`
- `errorMessage`
- `createdAt`
- `updatedAt`

relation:

- `user`
- `music`
- `video`

## 현재 `songsai-api` GenerationJob

현재 1차 최소판:

- `id`
- `userId`
- `musicId`
- `targetType`
- `jobType`
- `queueStatus`
- `attemptCount`
- `payload`
- `result`
- `errorMessage`
- `createdAt`
- `updatedAt`

relation:

- `user`
- `music`

## 차이

- `videoId`
- `video relation`

### 중요도

- 최근 생성곡 API에는 필수 아님
- 큐 기반 음악 생성의 최소 구성에는 없어도 됨
- 하지만 `D:\music` DB를 그대로 읽거나 비디오 확장까지 고려하면 결국 필요

### 추천

`GenerationJob`은 2차에서 `videoId`까지 맞추는 것이 좋다.

---

## 5. Video / MusicAsset 모델 차이

## `D:\music`

있음:

- `Video`
- `MusicAsset`

## 현재 `songsai-api`

없음

### 중요도

- 최근 생성곡 조회만 보면 필수는 아님
- 하지만 상세 페이지, 영상 확장, 자산 정리에는 필요

### 추천

이 둘은 1차 "최근 생성곡 API"보다 뒤로 미뤄도 된다.

---

## 6. 거래/크레딧/입금 관련 모델

## `D:\music`

있음:

- `Transaction`
- `CreditGrant`
- `Coupon`
- `CouponRedemption`
- `DepositRequest`

## 현재 `songsai-api`

없음

### 중요도

- 최근 생성곡 API 기준으로는 지금 당장 필요 없음
- 하지만 장기적으로는 `songsai-api`가 공용 백엔드가 되려면 결국 흡수 대상

### 추천

이건 음악 도메인 통합 후 단계적으로 이관한다.

---

## 바로 읽기 가능성 판단

## 지금 바로 가능?

아니오, 추천하지 않음.

이유:

- schema가 `public` / `songsai_api`로 다름
- Prisma 모델 차이가 있음
- 특히 `User`, `Music`, `GenerationJob`이 완전 동일하지 않음

## 조건부 가능?

예.

다음 조건이 맞춰지면 가능하다.

1. `songsai-api`가 `music_platform?schema=public`을 읽도록 전환
2. Prisma 모델을 `D:\music` 구조에 맞게 보정
3. 최소한 `User`, `Music`, `GenerationJob` 충돌을 제거

---

## 추천 최소 정렬 범위

`songsai-api`가 `D:\music` DB를 읽기 위해 우선 맞춰야 할 최소 범위:

### 1순위

- `User`
- `Music`
- `GenerationJob`

### 2순위

- `Video`

### 3순위

- `MusicAsset`
- 크레딧/거래 모델

---

## 추천 실제 진행 순서

1. `songsai-api` Prisma의 `User`를 `D:\music` 기준에 맞게 병합
2. `Music`을 `D:\music` 기준으로 보정
3. `GenerationJob`에 `videoId`까지 포함시켜 정렬
4. 그 후 `DATABASE_URL`을 `music_platform?schema=public` 기준으로 읽는 실험
5. 최근 생성곡 API를 DB 조회 기반으로 구현

---

## 최종 판단

### 방향

`songsai-api`가 `D:\music` 저장 구조를 흡수하고,
그 이후 DB 기준으로 최근 생성곡을 조회하는 방향이 맞다.

### 단, 바로 연결은 금지

현재는 Prisma 모델 차이가 있어 바로 붙이면 위험하다.

따라서 먼저 해야 할 것은:

- `songsai-api` Prisma를 `D:\music` 구조 쪽으로 더 정렬하는 것

그리고 그 다음이:

- `songsai-api`가 `D:\music` DB를 읽도록 전환하는 것

