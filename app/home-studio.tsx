"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./home-studio.module.css";

type ExploreSort = "latest" | "weekly" | "monthly";

type HomeSong = {
  id: string;
  title?: string | null;
  artistId?: string | null;
  artistName?: string | null;
  imageUrl?: string | null;
  likeCount?: number;
  createdAt: string;
  tags?: string | null;
};

type ExploreResponse = {
  items: HomeSong[];
};

const sectionConfig: Array<{
  sort: ExploreSort;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
}> = [
  {
    sort: "weekly",
    title: "Weekly Likes",
    eyebrow: "This Week",
    description: "최근 7일 좋아요 기준으로 지금 가장 반응이 큰 공개곡입니다.",
    href: "/explore?sort=weekly",
  },
  {
    sort: "monthly",
    title: "Monthly Favorites",
    eyebrow: "This Month",
    description: "최근 30일 누적 반응이 쌓인 공개곡을 한 번에 모아봅니다.",
    href: "/explore?sort=monthly",
  },
  {
    sort: "latest",
    title: "Latest Public Songs",
    eyebrow: "Just Released",
    description: "방금 공개된 새 곡을 빠르게 둘러보고 바로 미리듣기할 수 있습니다.",
    href: "/explore",
  },
];

const fallbackCovers = [
  "/songsai-music/img/bg-img/e1.jpg",
  "/songsai-music/img/bg-img/e2.jpg",
  "/songsai-music/img/bg-img/e3.jpg",
  "/songsai-music/img/bg-img/e4.jpg",
  "/songsai-music/img/bg-img/e5.jpg",
  "/songsai-music/img/bg-img/e6.jpg",
];

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function compactText(value?: string | null) {
  if (!value) {
    return "SongsAI 공개곡을 홈에서 바로 듣고 Explore로 이어갈 수 있습니다.";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 68 ? `${normalized.slice(0, 68)}...` : normalized;
}

export function HomeStudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [itemsBySort, setItemsBySort] = useState<Record<ExploreSort, HomeSong[]>>({
    latest: [],
    weekly: [],
    monthly: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      setLoading(true);
      setError("");

      try {
        const responses = await Promise.all(
          sectionConfig.map((section) =>
            songsaiApiRequest<ExploreResponse>(`/api/v1/explore?sort=${section.sort}&limit=4&offset=0`, {
              cache: "no-store",
            }),
          ),
        );

        if (cancelled) {
          return;
        }

        setItemsBySort({
          weekly: responses[0]?.items ?? [],
          monthly: responses[1]?.items ?? [],
          latest: responses[2]?.items ?? [],
        });
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error ? requestError.message : "홈 공개곡 섹션을 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSections();

    return () => {
      cancelled = true;
    };
  }, []);

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

  function handlePreview(item: HomeSong) {
    const audio = audioRef.current;
    if (!audio) {
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
    setPlayingUrl(`/api/public-preview/${item.id}`);
  }

  const totalVisibleSongs = useMemo(
    () => Object.values(itemsBySort).reduce((count, list) => count + list.length, 0),
    [itemsBySort],
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SongsAI Home</p>
          <h1 className={styles.heroTitle}>공개곡 탐색과 제작 흐름이 한 화면에서 이어지는 홈</h1>
          <p className={styles.heroText}>
            Studio에서 곡을 만들고, Explore에서 반응을 확인하고, Home에서는 지금 가장 많이 듣는 공개곡을 바로 발견할 수
            있게 정리했습니다.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create" className={styles.primaryAction}>
              Create a Song
            </Link>
            <Link href="/explore" className={styles.secondaryAction}>
              Explore All Songs
            </Link>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <span className={styles.heroMetricLabel}>Live Public Flow</span>
          <strong className={styles.heroMetricValue}>{totalVisibleSongs}</strong>
          <p className={styles.heroMetricText}>홈에서 바로 노출 중인 공개곡 카드 수</p>
          <div className={styles.heroChips}>
            <span className={styles.heroChip}>Weekly ranking</span>
            <span className={styles.heroChip}>Monthly favorites</span>
            <span className={styles.heroChip}>Latest drops</span>
          </div>
        </div>
      </section>

      <section className={styles.sections}>
        {error ? <div className={styles.error}>{error}</div> : null}

        {sectionConfig.map((section) => {
          const items = itemsBySort[section.sort];

          return (
            <article key={section.sort} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>{section.eyebrow}</p>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                </div>
                <a href={section.href} className={styles.sectionLink}>
                  View More
                </a>
              </div>
              <p className={styles.sectionDescription}>{section.description}</p>

              {loading ? (
                <div className={styles.loading}>공개곡을 불러오는 중입니다...</div>
              ) : items.length > 0 ? (
                <div className={styles.songList}>
                  {items.map((item, index) => (
                    <article key={item.id} className={styles.songCard}>
                      <div className={styles.songMedia}>
                        <img
                          src={item.imageUrl || fallbackCovers[index % fallbackCovers.length]}
                          alt={item.title || "public song cover"}
                          className={styles.songImage}
                        />
                        <button
                          type="button"
                          className={styles.playButton}
                          onClick={() => handlePreview(item)}
                          aria-label={playingId === item.id ? "Pause preview" : "Play preview"}
                        >
                          {playingId === item.id ? "Pause" : "Play"}
                        </button>
                      </div>
                      <div className={styles.songBody}>
                        <div className={styles.songTop}>
                          <h3 className={styles.songTitle}>{item.title || "제목 생성 대기 중"}</h3>
                          <span className={styles.songDate}>{formatDate(item.createdAt)}</span>
                        </div>
                        {item.artistId ? (
                          <Link href={`/artists/${item.artistId}`} className={styles.artistLink}>
                            {item.artistName || "SongsAI Artist"}
                          </Link>
                        ) : (
                          <p className={styles.artistText}>{item.artistName || "SongsAI Artist"}</p>
                        )}
                        <p className={styles.songText}>{compactText(item.tags)}</p>
                        <div className={styles.songMeta}>
                          <span className={styles.likeBadge}>좋아요 {item.likeCount ?? 0}</span>
                          <a href={section.href} className={styles.listenMore}>
                            Explore
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>아직 노출할 공개곡이 없습니다.</div>
              )}
            </article>
          );
        })}
      </section>

      <audio
        ref={audioRef}
        preload="none"
        className={styles.hiddenAudio}
        onEnded={() => {
          setPlayingId(null);
          setPlayingUrl(null);
        }}
      />
    </main>
  );
}
