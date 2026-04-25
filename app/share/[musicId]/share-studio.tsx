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

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  const success = document.execCommand("copy");
  document.body.removeChild(input);
  return success;
}

export function ShareStudio({ musicId }: { musicId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [item, setItem] = useState<SharedItem | null>(null);
  const [artist, setArtist] = useState<SharedArtist | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
        if (response.item.mp3Url) {
          setPlayingId(response.item.id);
          setPlayingUrl(response.item.mp3Url);
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
    () => item?.imageUrl || fallbackCovers[0],
    [item?.imageUrl],
  );

  function playItem(target: SharedItem) {
    const audio = audioRef.current;
    if (!audio || !target.mp3Url) {
      return;
    }

    if (playingId === target.id && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
      setPlayingUrl(null);
      return;
    }

    if (playingId === target.id && audio.paused) {
      setAutoPlayBlocked(false);
      void audio.play().catch(() => {
        setAutoPlayBlocked(true);
      });
      return;
    }

    setAutoPlayBlocked(false);
    setPlayingId(target.id);
    setPlayingUrl(target.mp3Url);
  }

  async function handleCopyShareUrl() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const copied = await copyText(window.location.href);
      setMessage(copied ? "공유 링크를 복사했습니다." : "공유 링크 복사에 실패했습니다.");
    } catch {
      setMessage("공유 링크 복사에 실패했습니다.");
    }
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
          <p className={styles.description}>{compactText(item.lyrics, "공유된 공개곡을 바로 재생할 수 있습니다.")}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.playButton} onClick={() => playItem(item)}>
              {playingId === item.id ? "재생 중지" : autoPlayBlocked ? "클릭해서 재생" : "지금 재생"}
            </button>
            <Link href={`/artists/${artist.id}`} className={styles.secondaryAction}>
              아티스트 다른곡 보기
            </Link>
            <button type="button" className={styles.secondaryAction} onClick={() => void handleCopyShareUrl()}>
              공유
            </button>
            <Link href="/" className={styles.secondaryAction}>
              홈으로
            </Link>
          </div>
          {autoPlayBlocked ? (
            <p className={styles.notice}>브라우저 자동 재생 정책 때문에 재생 버튼을 한 번 눌러주세요.</p>
          ) : null}
          {message ? <p className={styles.notice}>{message}</p> : null}
        </div>
      </div>

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
