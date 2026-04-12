# songsai-api 백엔드 로드맵

## 이미 진행된 것

- 인증 / Google 로그인
- 로컬 프록시 기반 로그인 흐름
- `Music`, `GenerationJob`, `MusicAsset`, `Video` 기본 모델
- `POST /api/v1/music`
- `GET /api/v1/music`
- `GET /api/v1/music/recent`
- `POST /api/v1/jobs/run`
- 다운로드 가능 시간 정책

## 다음 구현 순서

1. `MusicAsset` 메타데이터 확장 정착
2. 커버 이미지 캐시 시점 정리
3. `My Assets`를 2트랙 묶음형 구조로 재설계
4. `VIDEO_RENDER`를 ffmpeg 기반 서버 렌더로 교체

## 큐 원칙

- 음악 생성도 큐
- 비디오 생성도 큐
- 완전 직렬 1개 처리 아님
- 동시성 제한 worker로 운영

추천 초기 동시성:

- `MUSIC_GENERATION`: 5
- `MUSIC_STATUS_POLL`: 5
- `VIDEO_RENDER`: 2~3

## timed lyrics

- 음악 완료 시점에 timed lyrics 저장
- 이후 비디오 렌더와 자막 처리에 사용

## 다운로드 원칙

- 새 탭 열지 않음
- attachment 응답으로 바로 다운로드
- 파일명은 제목 기반
