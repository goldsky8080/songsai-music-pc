# songsai-api 음악 응답 스키마 초안

## 목적

이 문서는 `songsai-api`가 프론트에 내려줄 "공식 음악 응답 모델"의 초안을 정의한다.

핵심 원칙:

- 프론트는 Suno/SONGS raw wrapper 응답을 직접 사용하지 않는다.
- `songsai-api`가 provider 응답을 정규화해서 전달한다.
- 내부 provider 필드명과 외부 API 응답 필드명은 분리한다.
- 가능한 한 `D:\music`에서 이미 검증된 music domain 모델을 기준으로 한다.

---

## 계층 분리

### 1. Provider Raw Layer

내부 wrapper/외부 provider 기준 필드 예:

- `id`
- `title`
- `image_url`
- `audio_url`
- `video_url`
- `created_at`
- `status`
- `prompt`
- `gpt_description_prompt`
- `tags`
- `error_message`

이 계층은 `songsai-api` 내부 adapter에서만 사용한다.

### 2. Provider Normalized Layer

`songsai-api` 내부에서 provider를 표준화한 결과:

- `providerTaskId`
- `status`
- `mp3Url`
- `videoUrl`
- `imageUrl`
- `imageLargeUrl`
- `generatedLyrics`
- `providerPrompt`
- `providerDescriptionPrompt`
- `errorMessage`

이 계층은 내부 service/provider 계층용이다.

### 3. Public API Response Layer

프론트가 실제로 받는 응답.
이 문서의 핵심 대상이다.

---

## 상태 규칙

Public API에서 허용하는 음악 상태:

- `queued`
- `processing`
- `completed`
- `failed`

매핑 원칙:

- provider `submitted`, `pending`, `queued` -> `queued`
- provider `processing` -> `processing`
- provider `streaming`, `complete`, `completed` -> `completed`
- provider `error`, `failed` -> `failed`

---

## 기본 공개 엔티티

## MusicItem

하나의 음악 생성 요청 또는 프론트가 표시할 음악 묶음 단위.

```ts
type MusicItem = {
  id: string;
  requestGroupId: string | null;
  title: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt?: string;
  lyrics?: string | null;
  requestLyrics?: string | null;
  generatedLyrics?: string | null;
  stylePrompt?: string | null;
  imageUrl?: string | null;
  imageLargeUrl?: string | null;
  mp3Url?: string | null;
  mp4Url?: string | null;
  provider?: string | null;
  providerTaskId?: string | null;
  tags?: string | null;
  duration?: number | string | null;
  errorMessage?: string | null;
  tracks?: MusicTrack[];
};
```

설명:

- `id`
  - 프론트가 참조하는 기본 식별자
- `requestGroupId`
  - 같은 생성 요청에서 묶인 트랙 그룹 식별용
- `title`
  - 반드시 프론트 표시용 제목으로 가공된 값
- `status`
  - 프론트에서 바로 사용할 수 있는 상태
- `createdAt`
  - 정렬 기준
- `imageUrl`, `mp3Url`
  - 홈/리스트/카드 UI 핵심 자산
- `tracks`
  - 2트랙 이상 생성 결과가 있을 때 상세 트랙 목록

---

## MusicTrack

한 음악 묶음 안의 개별 트랙.

```ts
type MusicTrack = {
  id: string;
  providerTaskId?: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  mp3Url?: string | null;
  mp4Url?: string | null;
  imageUrl?: string | null;
  imageLargeUrl?: string | null;
  duration?: number | string | null;
  createdAt?: string | null;
  errorMessage?: string | null;
};
```

---

## RecentMusicItem

홈 슬라이더/최근 생성곡 영역 최적화 모델.

```ts
type RecentMusicItem = {
  id: string;
  title: string;
  status: "completed";
  createdAt: string;
  imageUrl: string | null;
  mp3Url: string;
  mp4Url?: string | null;
  providerTaskId?: string | null;
  tags?: string | null;
};
```

설명:

- 최근 생성곡은 "완료곡 전용 읽기 모델"로 본다.
- `status`는 사실상 항상 `completed`
- `mp3Url`은 필수
- `imageUrl`은 없을 수 있으나 있으면 사용

---

## 응답 래퍼

### 단건 조회

```ts
type MusicDetailResponse = {
  item: MusicItem;
};
```

### 목록 조회

```ts
type MusicListResponse = {
  items: MusicItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

### 최근 생성곡

```ts
type RecentMusicResponse = {
  items: RecentMusicItem[];
  meta: {
    limit: number;
    fetchedAt: string;
  };
};
```

---

## 제목 규칙

`title`은 provider 원본 제목을 그대로 쓰지 않아도 된다.

우선순위:

1. 저장된 사용자 제목
2. provider/generated lyrics에서 유도한 제목
3. style prompt 조합
4. fallback `"제목 없는 곡"`

즉 프론트는 제목 계산 로직을 다시 구현하지 않는다.

---

## 홈 최근 생성곡용 완료 조건

`RecentMusicItem`으로 내려갈 조건:

- `status === "completed"`
- `mp3Url` 존재
- `mp3Url` 비어 있지 않음
- `errorMessage` 없음

초기 wrapper 기반 단계에서는 provider raw 필드에서 위 조건을 만족하는 항목만 변환한다.

장기적으로는 `Music.status`, `Music.mp3Url`, `GenerationJob.result` 기준으로 판별한다.

---

## 왜 raw 필드를 그대로 외부에 노출하지 않는가

이유:

- provider 변경에 취약함
- 프론트가 상태 매핑과 예외 처리를 직접 떠안게 됨
- Suno/SONGS의 status, field naming이 바뀌면 프론트가 깨짐
- 홈/히스토리/상세/다운로드 화면마다 중복 해석 코드가 생김

따라서 raw 필드는 내부 adapter 전용으로만 유지한다.

---

## 현재 기준 추천

지금 `songsai-api`에서 바로 도입할 공개 모델은 아래 두 가지다.

1. `MusicItem`
2. `RecentMusicItem`

그리고 provider adapter 내부에서는 이미 `D:\music` 스타일의
`ProviderMusicResult`를 기준으로 확장하는 방향이 가장 자연스럽다.

