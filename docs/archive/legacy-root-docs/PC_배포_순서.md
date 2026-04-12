# SongsAI Music PC 배포 순서

## 1. 서버 경로 준비

```bash
mkdir -p ~/services/songsai-music-pc
```

이 프로젝트는 아직 git 저장소가 아니므로, 로컬 `D:\songsai-music-pc` 전체를 서버 `~/services/songsai-music-pc`로 복사하는 방식이 가장 빠릅니다.

복사 시 제외 권장:

- `.next`
- `node_modules`
- `.env.local`

## 2. 서버 환경 파일 작성

서버 `~/services/songsai-music-pc/.env` 예시:

```env
DATABASE_URL="postgresql://songsai:replace-password@localhost:5432/songsai_music_pc?schema=public"
FFMPEG_PATH="ffmpeg"
FFPROBE_PATH="ffprobe"
NEXT_PUBLIC_SONGSAI_API_URL="https://api.songsai.org"
```

## 3. 의존성 설치와 빌드

```bash
cd ~/services/songsai-music-pc
npm install
npx prisma generate
npm run build
```

## 4. pm2 등록

```bash
cd ~/services/songsai-music-pc
pm2 start deploy/pm2.pc.songsai-music.config.cjs
pm2 save
pm2 status
```

## 5. nginx 연결

예시 설정 파일:

- `deploy/nginx.pc.songsai.org.conf.example`

서버 반영:

```bash
sudo cp deploy/nginx.pc.songsai.org.conf.example /etc/nginx/sites-available/pc.songsai.org
sudo ln -s /etc/nginx/sites-available/pc.songsai.org /etc/nginx/sites-enabled/pc.songsai.org
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS 인증서

```bash
sudo certbot --nginx -d pc.songsai.org
```

## 7. 확인

```bash
curl http://127.0.0.1:3000
curl https://pc.songsai.org
```
