# songsai-api 최근 생성곡 API 설계안

## 목적

홈 화면의 "최근 생성곡" 슬라이더에 사용할 읽기 전용 API를 정의한다.

이 API는 `songsai-music-pc`가 직접 DB나 wrapper raw feed를 해석하지 않도록 하기 위한
전용 프론트 소비 API다.

---

## 엔드포인트 제안

```http
GET /api/v1/music/recent?limit=10
```

### 기본값

- `limit` 기본값: `10`
- 최대값: `20`

---

## 응답 형식

```json
{
  "items": [
    {
      "id": "cmusic_xxx",
      "title": "새벽 바람",
      "status": "completed",
      "createdAt": "2026-04-11T12:00:00.000Z",
      "imageUrl": "https://...",
      "mp3Url": "https://...",
      "mp4Url": null,
      "providerTaskId": "songs_xxx",
      "tags": "ballad, piano"
    }
  ],
  "meta": {
    "limit": 10,
    "fetchedAt": "2026-04-11T12:01:00.000Z"
  }
}
```

이 응답은 [songsai-api_음악응답_스키마_초안.md](D:\songsai-music-pc\songsai-api_음악응답_스키마_초안.md:1)의
`RecentMusicItem` 모델을 사용한다.

---

## 필터 조건

최근 생성곡은 "완료곡 전용 읽기 모델"로 간주한다.

### 포함 조건

- 최신순 정렬
- 생성 완료 상태
- 오디오 URL 존재
- 에러 없음

### 제외 조건

- 생성중 상태
- 실패 상태
- 오디오 URL 없는 항목
- 임시/불안정 URL만 있는 항목
- 에러 메시지가 기록된 항목

---

## 상태 판별 기준

### 1차 구현 (wrapper 기반 임시 단계)

raw provider 필드 기준:

- 포함:
  - `status`가 `complete`, `completed`, `streaming`
  - `audio_url` 존재
  - `error_message` 없음

- 제외:
  - `submitted`
  - `queued`
  - `pending`
  - `processing`
  - `error`
  - `failed`

주의:

홈에서 "불안한 URL"을 피하려면, 실제 운용 중 `streaming`을 포함할지 여부는 보수적으로 판단한다.
현재 요구사항 기준으로는 `streaming`도 제외하고 `complete/completed`만 허용하는 쪽이 더 안전하다.

즉 추천 조건은:

- `status in ("complete", "completed")`
- `audio_url is not null`
- `error_message is null`

### 2차 구현 (도메인 저장 모델 도입 후)

DB 기준:

- `Music.status = COMPLETED`
- `Music.mp3Url is not null`
- `Music.errorMessage is null`

필요 시 `MusicAsset` 또는 `GenerationJob.result`도 보조 검증에 사용한다.

---

## 데이터 소스 전략

## 전략 A. 초기 단계

`songsai-api` 내부에서 wrapper feed를 읽고 최근 완료곡만 가공해서 반환

장점:

- 가장 빨리 구현 가능
- 현재 `songsai-api` 구조와 잘 맞음

단점:

- feed 기반이라 사용자 단위/소유권/정합성 관리가 약함
- provider 응답 형식 변화에 민감함

## 전략 B. 목표 단계

`songsai-api` 내부 DB의 `Music`/`GenerationJob`을 기준으로 최근 완료곡을 반환

장점:

- 서비스 기준 정합성 확보
- provider와 분리된 공식 읽기 모델 제공 가능
- 검색/필터/히스토리/대시보드 확장 쉬움

단점:

- `Music`/`GenerationJob` 모델 이관이 먼저 필요

### 권장 결론

- 1차는 전략 A로 빠르게 붙일 수 있음
- 하지만 최종 목표는 반드시 전략 B로 간다

---

## 소유권/범위 판단

홈 최근 생성곡이 "전체 공개 피드"인지 "로그인 사용자 기준 피드"인지 구분이 필요하다.

현재 요구사항 해석:

- "내가 만든 곡"이 아니라
- 그냥 최근 생성된 곡
- 최신순으로 보여주기

즉 초기 홈 슬라이더는 **공개 최근 완료곡 피드**로 보는 것이 자연스럽다.

나중에 필요하면 API를 둘로 나눈다.

### 공개 피드

```http
GET /api/v1/music/recent?limit=10
```

### 내 작업 피드

```http
GET /api/v1/me/music?limit=20&page=1
```

---

## 프론트 사용 방식

`songsai-music-pc` 홈 패널은 이 API만 호출한다.

프론트 책임:

- 슬라이더 렌더링
- 링크 이동
- 제목/이미지/오디오 플레이어 표시

프론트가 하지 않아야 할 것:

- status 해석
- 완료 여부 판별
- URL 신뢰도 판별
- raw feed 구조 변환

---

## 캐싱/성능 메모

최근 생성곡은 홈 진입 시 자주 호출될 가능성이 높다.

추천:

- 초기에는 짧은 TTL 캐시 허용
- 예: 15~30초 단위
- 또는 wrapper 요청 후 가공 결과를 짧게 메모리 캐시

단, 초기 구현은 캐시 없이도 가능하다.

---

## 오류 처리

API 실패 시 프론트는 전체 홈을 실패시키지 않는다.

추천 응답 정책:

- API 오류 시 500 응답
- 프론트는 빈 배열 fallback 사용

즉 홈 UI는:

- 곡이 있으면 슬라이더 표시
- 없으면 더미 카드 또는 "최근 생성곡이 없습니다" 표시

---

## 구현 우선순위

1. `GET /api/v1/music/recent?limit=10` 추가
2. wrapper 기반 완료곡 필터
3. 프론트 홈 슬라이더 연결
4. 이후 DB 기반 읽기 모델로 교체

