## MusicAsset 컬럼 확장

현재 `songsai-api`의 `MusicAsset`에는 아래 저장 메타데이터가 추가된 상태다.

- `storageTier`
- `storageKey`
- `storagePath`
- `publicUrl`
- `checksum`
- `archivedAt`

목적:

- SSD hot storage와 NAS archive를 구분하기 위한 기본 메타데이터 확보
- 파일 실제 위치와 공개 URL을 분리
- 이후 아카이브 이동 시 DB 전체 경로 수정 없이 처리 가능하게 준비

## 커버 이미지 캐시 1차 구현

현재 구현 방향:

1. 음악 poll 완료 시 `syncMusicCoverImageAsset()` 실행
2. provider `imageUrl`을 우리 서버 저장소에 다운로드
3. `MusicAssetType.COVER_IMAGE`로 `MusicAsset` upsert
4. 프론트 응답의 완료곡 `imageUrl`은 원본 Suno URL 대신
   `APP_URL/api/v1/music/{id}/cover`
   형태의 backend 절대 URL을 사용
5. `/api/v1/music/[id]/cover` 라우트는
   - 로컬 파일 우선 서빙
   - 없으면 캐시 시도
   - 그래도 없으면 원본 이미지 fallback
   순서로 동작

## 현재 기대 효과

- 완료곡은 홈/자산 화면에서 Suno 이미지 주소 대신 우리 서버 주소를 사용
- 비디오 렌더 시 커버 이미지를 재사용할 수 있는 기반 확보
- 향후 NAS 아카이브 전환 시 `MusicAsset` 메타데이터를 그대로 활용 가능

## 다음 순서

1. 로컬 backend 재시작 후 커버 이미지 캐시 동작 확인
2. `My Assets`를 2트랙 묶음 구조로 재설계
3. `VIDEO_RENDER`를 provider videoUrl poll 방식에서
   ffmpeg 기반 서버 렌더 방식으로 교체
