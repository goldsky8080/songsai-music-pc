# songsai-api 듣기 / 다운로드 흐름 정리

## 현재 방향

- `songsai_api` schema가 진짜 원본이다.
- 홈 최근 완료곡은 `COMPLETED + mp3Url 있음` 조건만 보여준다.
- `My Assets`에서는 `QUEUED / PROCESSING / COMPLETED / FAILED`를 모두 보여준다.
- 생성 직후에는 불안정한 URL이어도 `mp3Url`이 있으면 듣기 가능하다.
- 다운로드는 `createdAt + 5분` 이후에만 허용한다.
- 다운로드 API 진입 시 provider 상태를 다시 확인하고, 최신 `mp3Url / imageUrl / videoUrl`로 `Music`을 갱신한다.
- 서버 자산(`MusicAsset`)이 있으면 서버 파일 URL을 우선 사용하고, 없으면 provider 원본 URL을 그대로 클라이언트에 전달한다.

## API

### `GET /api/v1/music`

- 로그인 사용자 기준 음악 목록 조회
- 각 항목에 아래 정보를 포함한다.
  - `status`
  - `mp3Url`
  - `imageUrl`
  - `downloadAvailableAt`
  - `canListen`
  - `canDownload`

### `GET /api/v1/music/:id/download`

- 로그인 사용자 자신의 곡만 처리
- 아직 5분 전이면 `409`
- 5분 후면 provider 상태를 다시 확인
- 최신 URL이 있으면 DB 갱신
- `MusicAsset(MP3)`가 있으면 `publicUrl` 반환
- 없으면 `Music.mp3Url` 반환

## 프론트

### Home

- `/api/v1/music/recent?limit=10`
- 완료곡만 슬라이더 + 공용 플레이어로 노출

### My Assets

- `/assets`
- `/api/v1/music?limit=24`
- 상태 / 생성 시각 / 다운로드 가능 시각 / 듣기 / 다운로드 버튼 노출
- 다운로드 버튼은 5분 이후 활성화

## 다음 확장 후보

1. 다운로드 버튼 비활성 상태를 실시간 카운트다운으로 표시
2. `듣기` 진입 시에도 provider 상태 재확인 옵션 추가
3. `MusicAsset` lazy 캐시 job 추가
4. 라이선스 인증서 발급을 `My Assets`에 통합
