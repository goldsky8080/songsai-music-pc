"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./artist-studio.module.css";

type ArtistInfo = {
  id: string;
  name: string;
  joinedAt: string;
  publicCount: number;
};

type ArtistSong = {
  id: string;
  title?: string | null;
  artistId?: string | null;
  artistName?: string | null;
  imageUrl?: string | null;
  mp3Url?: string | null;
  likeCount?: number;
  likedByMe?: boolean;
  tags?: string | null;
  stylePrompt?: string | null;
  createdAt: string;
};

type ArtistResponse = {
  artist: ArtistInfo;
  items: ArtistSong[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

const fallbackCovers = [
  "/songsai-music/img/bg-img/e1.jpg",
  "/songsai-music/img/bg-img/e2.jpg",
  "/songsai-music/img/bg-img/e3.jpg",
  "/songsai-music/img/bg-img/e4.jpg",
];

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function compactText(value?: string | null) {
  if (!value) {
    return "공개된 곡을 따라 듣고 아티스트 흐름을 확인할 수 있습니다.";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 84 ? `${normalized.slice(0, 84)}...` : normalized;
}

export function ArtistStudio({ artistId }: { artistId: string }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [items, setItems] = useState<ArtistSong[]>([]);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void songsaiApiRequest<ArtistResponse>(`/api/v1/explore/artists/${artistId}?limit=18&offset=0`, {
      cache: "no-store",
    })
      .then((response) => {
        if (cancelled) {
          return;
        }

        setArtist(response.artist);
        setItems(response.items);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        if (requestError instanceof SongsaiApiError && requestError.status === 404) {
          setError("아티스트를 찾을 수 없습니다.");
          return;
        }

        setError(
          requestError instanceof Error ? requestError.message : "아티스트 곡을 불러오지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [artistId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playingUrl) {
      return;
    }

    audio.src = playingUrl;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      setPlayingId(null);
      setPlayingUrl(null);
    });
  }, [playingUrl]);

  function handlePreview(item: ArtistSong) {
    const audio = audioRef.current;
    if (!audio || !item.mp3Url) {
      return;
    }

    if (playingId === item.id) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
      setPlayingUrl(null);
      return;
    }

    setPlayingId(item.id);
    setPlayingUrl(item.mp3Url);
  }

  async function handleLike(item: ArtistSong) {
    try {
      const response = await songsaiApiRequest<{ likeCount: number; likedByMe: boolean }>(
        `/api/v1/music/${item.id}/like`,
        {
          method: item.likedByMe ? "DELETE" : "POST",
        },
      );

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                likeCount: response.likeCount,
                likedByMe: response.likedByMe,
              }
            : currentItem,
        ),
      );
    } catch (requestError) {
      if (requestError instanceof SongsaiApiError && requestError.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(`/artists/${artistId}`)}`);
        return;
      }

      setError(
        requestError instanceof Error ? requestError.message : "좋아요 처리 중 문제가 발생했습니다.",
      );
    }
  }

  return (
    <section className={styles.section}>
      {artist ? (
        <div className={styles.heroCard}>
          <p className={styles.eyebrow}>Artist Public Songs</p>
          <h1 className={styles.title}>{artist.name}</h1>
          <p className={styles.description}>
            공개곡 {artist.publicCount}곡이 SongsAI Music 흐름 안에서 연결되어 있습니다. 비로그인 상태에서도
            듣기는 가능하고, 좋아요는 로그인 후 기록됩니다.
          </p>
          <div className={styles.metaRow}>
            <span className={styles.heroChip}>공개곡 {artist.publicCount}곡</span>
            <span className={styles.heroChip}>가입일 {formatDate(artist.joinedAt)}</span>
            <Link href="/explore" className={styles.heroLink}>
              Explore 전체 보기
            </Link>
          </div>
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      {items.length > 0 ? (
        <div className={styles.grid}>
          {items.map((item, index) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.media}>
                <img
                  src={item.imageUrl || fallbackCovers[index % fallbackCovers.length]}
                  alt={item.title || "artist music cover"}
                  className={styles.cover}
                />
                {item.mp3Url ? (
                  <button
                    type="button"
                    className={styles.playButton}
                    onClick={() => handlePreview(item)}
                    aria-label={playingId === item.id ? "Pause preview" : "Play preview"}
                  >
                    <span>{playingId === item.id ? "일시정지" : "재생"}</span>
                  </button>
                ) : null}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{item.title || "제목 생성 대기 중"}</h2>
                  <span className={styles.dateText}>{formatDate(item.createdAt)}</span>
                </div>
                <p className={styles.cardDescription}>{compactText(item.tags || item.stylePrompt)}</p>
                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={item.likedByMe ? styles.likeButtonActive : styles.likeButton}
                    onClick={() => void handleLike(item)}
                  >
                    좋아요 {item.likeCount ?? 0}
                  </button>
                  <span className={styles.listenLabel}>듣기 전용 공개곡</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className={styles.empty}>아직 공개된 곡이 없습니다.</div>
      ) : null}

      <audio
        ref={audioRef}
        preload="none"
        className={styles.hiddenAudio}
        onEnded={() => {
          setPlayingId(null);
          setPlayingUrl(null);
        }}
      />
    </section>
  );
}
