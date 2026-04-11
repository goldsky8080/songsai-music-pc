# SongsAI Music PC

`D:\one-music-gh-pages` 디자인을 바탕으로, `Next.js + React + TypeScript + PostgreSQL + Prisma + ffmpeg` 기준으로 다시 구성한 프로젝트입니다.

## 포함된 것

- 원본 songsai-music HTML 템플릿 전체 페이지를 Next.js 라우트로 매핑
- 정적 자산을 `public/songsai-music`으로 이관
- PostgreSQL 연결을 위한 Prisma 스키마
- ffmpeg 실행을 위한 Node 유틸
- 기본 상태 확인 API와 렌더 잡 API

## 시작

1. `.env.example`을 참고해 `.env`를 만듭니다.
2. `npm install`
3. `npx prisma generate`
4. `npm run dev`

## 기본 라우트

- `/`
- `/albums`
- `/event`
- `/blog`
- `/contact`
- `/elements`
- `/login`

## API

- `GET /api/health`
- `GET /api/render-jobs`
- `POST /api/render-jobs`
