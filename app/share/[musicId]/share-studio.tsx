"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./share-studio.module.css";

type SharedArtist = {
  id: string;
  name: string;
  joinedAt: string;
  publicCount: number;
};

type SharedItem = {
  id: string;
  title?: string | null;
  artistId?: string | null;
  artistName?: string | null;
  imageUrl?: string | null;
  mp3Url?: string | null;
  likeCount?: number;
  likedByMe?: boolean;
  stylePrompt?: string | null;
  tags?: string | null;
  lyrics?: string | null;
  createdAt: string;
};

type ShareResponse = {
  item: SharedItem;
  artist: SharedArtist;
  related: SharedItem[];
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
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function compactText(value?: string | null, fallback = "공유된 곡의 분위기와 메모가 여기에 표시됩니다.") {
  if (!value) {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 200 ? `${normalized.slice(0, 200)}...` : normalized;
}

export function ShareStudio({ musicId }: { musicId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [item, setItem] = useState<SharedItem | null>(null);
  const [artist, setArtist] = useState<SharedArtist | null>(null);
  const [related, setRelated] = useState<SharedItem[]>([]);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void songsaiApiRequest<ShareResponse>(`/api/v1/explore/${musicId}`, {
      cache: "no-store",
    })
      .then((response) => {
        if (cancelled) {
          return;
        }

        setItem(response.item);
        setArtist(response.artist);
        setRelated(response.related);
        if (response.item.mp3Url) {
          setPlayingId(response.item.id);
          setPlayingUrl(`/api/public-preview/${response.item.id}`);
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        if (requestError instanceof SongsaiApiError && requestError.status === 404) {
          setError("공유된 곡을 찾을 수 없습니다.");
          return;
        }

        setError(
          requestError instanceof Error ? requestError.message : "공유 곡을 불러오는 중 문제가 발생했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [musicId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playingUrl) {
      return;
    }

    audio.src = playingUrl;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      setAutoPlayBlocked(true);
    });
  }, [playingUrl]);

  const heroImage = useMemo(
    () => item?.imageUrl || related[0]?.imageUrl || fallbackCovers[0],
    [item?.imageUrl, related],
  );

  function playItem(target: SharedItem) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (playingId === target.id && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
      setPlayingUrl(null);
      return;
    }

    setAutoPlayBlocked(false);
    setPlayingId(target.id);
    setPlayingUrl(`/api/public-preview/${target.id}`);
  }

  if (error) {
    return (
      <section className={styles.section}>
        <div className={styles.errorCard}>{error}</div>
      </section>
    );
  }

  if (!item || !artist) {
    return (
      <section className={styles.section}>
        <div className={styles.loadingCard}>공유된 곡을 불러오는 중입니다...</div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.heroCard} style={{ backgroundImage: `url(${heroImage})` }}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Shared Track</p>
          <h1 className={styles.title}>{item.title || "공유된 곡"}</h1>
          <p className={styles.meta}>
            {artist.name} · {formatDate(item.createdAt)} · 공개곡 {artist.publicCount}곡
          </p>
          <p className={styles.description}>{compactText(item.tags || item.stylePrompt || item.lyrics)}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.playButton} onClick={() => playItem(item)}>
              {playingId === item.id ? "재생 중지" : autoPlayBlocked ? "클릭해서 재생" : "지금 재생"}
            </button>
            <Link href={`/artists/${artist.id}`} className={styles.secondaryAction}>
              아티스트 다른 곡 보기
            </Link>
          </div>
          {autoPlayBlocked ? (
            <p className={styles.notice}>브라우저 자동 재생 정책 때문에 재생 버튼을 한 번 눌러주세요.</p>
          ) : null}
        </div>
      </div>

      <div className={styles.detailGrid}>
        <article className={styles.panel}>
          <h2 className={styles.panelTitle}>이 곡 소개</h2>
          <p className={styles.panelBody}>{compactText(item.lyrics || item.stylePrompt || item.tags, "가사나 소개 문구가 아직 없습니다.")}</p>
        </article>
        <article className={styles.panel}>
          <h2 className={styles.panelTitle}>공유 링크</h2>
          <p className={styles.panelBody}>{typeof window !== "undefined" ? window.location.href : `/share/${musicId}`}</p>
        </article>
      </div>

      {related.length > 0 ? (
        <div className={styles.relatedSection}>
          <div className={styles.relatedHeader}>
            <p className={styles.relatedEyebrow}>More From Artist</p>
            <h2 className={styles.relatedTitle}>{artist.name}의 다른 공개곡</h2>
          </div>
          <div className={styles.relatedGrid}>
            {related.map((relatedItem, index) => (
              <article key={relatedItem.id} className={styles.relatedCard}>
                <div className={styles.relatedMedia}>
                  <img
                    src={relatedItem.imageUrl || fallbackCovers[index % fallbackCovers.length]}
                    alt={relatedItem.title || "shared music cover"}
                    className={styles.relatedImage}
                  />
                  <button type="button" className={styles.relatedPlayButton} onClick={() => playItem(relatedItem)}>
                    {playingId === relatedItem.id ? "중지" : "재생"}
                  </button>
                </div>
                <div className={styles.relatedBody}>
                  <h3 className={styles.relatedCardTitle}>{relatedItem.title || "제목 생성 중"}</h3>
                  <p className={styles.relatedCardMeta}>{formatDate(relatedItem.createdAt)}</p>
                  <div className={styles.relatedLinks}>
                    <Link href={`/share/${relatedItem.id}`} className={styles.inlineLink}>
                      이 곡 열기
                    </Link>
                    <Link href={`/artists/${artist.id}`} className={styles.inlineLinkMuted}>
                      아티스트 페이지
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
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
