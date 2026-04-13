# songsai-api 백엔드 로드맵

## 현재 반영된 방향

### 생성

- `POST /api/v1/music`
  - 큐 적재 전용이 아니라 provider를 직접 호출하는 흐름으로 전환
  - 초기 `providerTaskId`, `title`, `mp3Url`, `imageUrl`, `tags`, `duration`를 바로 저장

### 목록

- `GET /api/v1/music`
  - 최근 생성 목록 조회
  - 최근 5분 안의 곡 중 `title/mp3Url/imageUrl`이 비어 있으면 provider 상태를 가볍게 다시 조회해 목록에 반영

### 다운로드 / 미리듣기

- `GET /api/v1/music/:id/download?inline=1`
  - 5분 전: preview refresh only
  - 5분 후: full sync 가능

- `GET /api/v1/music/:id/download`
  - 5분 전: 차단
  - 5분 후: 최신 provider 상태 확인 후 다운로드 허용

### poll job

- `MUSIC_STATUS_POLL`
  - 생성 자체 담당 아님
  - 후속 상태 확인과 메타데이터 갱신용

## 이번 단계에서 확정된 세부 흐름

### 1. 음악 생성

- 프론트가 `POST /api/v1/music`를 호출한다.
- 백엔드가 Suno를 직접 호출한다.
- 성공 시 `Music` 레코드와 `requestGroupId`를 생성한다.
- Suno가 2곡을 반환하면 같은 `requestGroupId`로 2개 `Music`을 만든다.
- 각 곡에는 `providerTaskId`, 초기 `title/mp3Url/imageUrl/tags/duration`를 저장한다.

### 2. 429 처리

- Suno가 `429 Too Many Requests`를 반환하면 즉시 429로 응답한다.
- 사용자 문구는 `현재 생성 대기열이 가득 차 있습니다. 잠시 후 다시 시도해 주세요.`로 통일한다.
- `providerMessage`, `runningClipIds`는 디버깅과 후속 fallback 판단용으로 함께 내려준다.

### 3. 5분 전 preview 흐름

- 생성 직후부터 5분 전까지는 preview only 상태다.
- 이 구간에서는:
  - 미리듣기만 허용
  - 다운로드/비디오 생성 비활성화
  - mp3/image/lyrics/title asset 저장 금지
  - 최종 완료 처리 금지

- 허용되는 것은 가벼운 상태 갱신뿐이다.
  - `title`
  - `mp3Url`
  - `imageUrl`
  - `tags`
  - `duration`

### 4. 5분 후 full sync 흐름

- 사용자가 아래 중 하나를 시도하면 full sync를 수행한다.
  - 미리듣기
  - 다운로드
  - 비디오 생성

- full sync 대상:
  - 최신 `title`
  - 최신 `mp3Url`
  - 최신 `imageUrl`
  - `tags`
  - `duration`
  - timed lyrics

- 이후 수행:
  - 커버 이미지 캐시
  - 타임라인 가사 캐시
  - mp3 lazy cache
  - DB 최종 갱신
  - 완료 처리

### 5. mp3 lazy cache

- mp3는 생성 직후 즉시 캐시하지 않는다.
- 아래 시점에만 lazy cache한다.
  - 다운로드 시점
  - 비디오 생성 시점
  - 필요 시 5분 후 inline playback 시점

## 크레딧 설계 메모

아직 구현 보류지만 기준은 먼저 고정한다.

- 차감 시점은 버튼 클릭 시점이 아니라 `provider accepted` 시점
- `429`, validation error, auth error는 미차감
- 추후 `CreditTransaction`으로 연결 가능하게 설계

## 다음 구현 순서

1. inline preview / full sync 분리 흐름 안정화
2. 생성 직후 제목/커버/mp3Url 자동 반영 안정화
3. 5분 후 full sync 시점의 제목/tags/duration 갱신 안정화
4. mp3 lazy cache와 cover/lyrics cache 검증
5. My Assets 최종 구조 정리
6. ffmpeg 기반 `VIDEO_RENDER` 정리

## 추후 확장 방향

- 단기: Suno 직접 호출
- 중기: 유료 API fallback
- 장기: 로컬 음악 생성 모델 fallback

이 확장을 위해 provider 교체 가능한 구조를 유지한다.
