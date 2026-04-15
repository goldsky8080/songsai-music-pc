"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./explore-studio.module.css";

type ExploreSort = "latest" | "weekly" | "monthly";

type ExploreItem = {
  id: string;
  title?: string | null;
  artistId?: string | null;
  artistName?: string | null;
  imageUrl?: string | null;
  mp3Url?: string | null;
  status: string;
  likeCount?: number;
  likedByMe?: boolean;
  stylePrompt?: string | null;
  tags?: string | null;
  createdAt: string;
  downloadAvailableAt?: string;
};

type ExplorePagination = {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

type ExploreResponse = {
  items: ExploreItem[];
  pagination: ExplorePagination;
};

const PAGE_SIZE = 12;

const sortOptions: Array<{ value: ExploreSort; label: string; description: string }> = [
  { value: "latest", label: "Latest", description: "최근 공개곡을 최신 순으로 확인합니다." },
  { value: "weekly", label: "Weekly", description: "최근 7일 좋아요 기준 공개곡 순위입니다." },
  { value: "monthly", label: "Monthly", description: "최근 30일 좋아요 기준 공개곡 순위입니다." },
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
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatLikeCount(value?: number) {
  const count = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `좋아요 ${count}`;
}

function getSortMetaLabel(sort: ExploreSort) {
  switch (sort) {
    case "weekly":
      return "최근 7일 좋아요 집계";
    case "monthly":
      return "최근 30일 좋아요 집계";
    case "latest":
    default:
      return "최신 공개 순";
  }
}

function getRankBadge(sort: ExploreSort, index: number) {
  if (sort === "latest") {
    return index < 3 ? "NEW" : null;
  }

  return `#${index + 1}`;
}

function compactText(value?: string | null) {
  if (!value) {
    return "SongsAI Music에서 공개된 곡을 바로 듣고 좋아요를 누를 수 있습니다.";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 86 ? `${normalized.slice(0, 86)}...` : normalized;
}

function mergeItems(current: ExploreItem[], incoming: ExploreItem[], append: boolean) {
  const base = append ? [...current, ...incoming] : incoming;
  const seen = new Set<string>();
  const merged: ExploreItem[] = [];

  for (const item of base) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function ExploreStudio() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sort = (searchParams.get("sort") as ExploreSort) || "latest";
  const safePathname = pathname || "/explore";
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [pagination, setPagination] = useState<ExplorePagination>({
    offset: 0,
    limit: PAGE_SIZE,
    total: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const activeSort = useMemo(
    () => sortOptions.find((option) => option.value === sort) ?? sortOptions[0],
    [sort],
  );

  async function loadPage(offset: number, append: boolean) {
    const response = await songsaiApiRequest<ExploreResponse>(
      `/api/v1/explore?sort=${sort}&limit=${PAGE_SIZE}&offset=${offset}`,
      { cache: "no-store" },
    );

    setItems((current) => mergeItems(current, response.items, append));
    setPagination(response.pagination);
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    void songsaiApiRequest<ExploreResponse>(
      `/api/v1/explore?sort=${sort}&limit=${PAGE_SIZE}&offset=0`,
      { cache: "no-store" },
    )
      .then((response) => {
        if (cancelled) {
          return;
        }

        setItems(response.items);
        setPagination(response.pagination);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "공개곡 목록을 불러오는 중 문제가 발생했습니다.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sort]);

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

  function handleSortChange(nextSort: ExploreSort) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextSort === "latest") {
      next.delete("sort");
    } else {
      next.set("sort", nextSort);
    }

    const query = next.toString();
    window.location.assign(query ? `${safePathname}?${query}` : safePathname);
  }

  function handlePreview(item: ExploreItem) {
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

  async function handleLike(item: ExploreItem) {
    setError("");
    setMessage("");

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
        window.location.assign(`/login?next=${encodeURIComponent(`${safePathname}${window.location.search}`)}`);
        return;
      }

      setError(
        requestError instanceof Error ? requestError.message : "좋아요 처리 중 문제가 발생했습니다.",
      );
    }
  }

  async function handleLoadMore() {
    if (isLoadingMore || !pagination.hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setError("");

    try {
      await loadPage(items.length, true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "추가 공개곡을 불러오는 중 문제가 발생했습니다.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  const hasMore = pagination.hasMore;

  return (
    <section className={styles.section}>
      <div className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SongsAI Explore</p>
          <h1 className={styles.title}>공개곡을 바로 듣고, 좋아요와 순위로 흐름을 따라가세요</h1>
          <p className={styles.description}>
            Explore에서는 로그인 없이도 공개곡을 둘러보고 미리듣기를 할 수 있습니다. 좋아요는 계정으로
            누르고, 순위는 주간과 월간 기준으로 다시 정리됩니다.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.heroChip}>공개곡 기본값 Public</span>
          <span className={styles.heroChip}>비로그인 청취 가능</span>
          <span className={styles.heroChip}>좋아요 기반 순위</span>
        </div>
      </div>

      <section className={styles.controlsCard}>
        <div className={styles.controlsCopy}>
          <p className={styles.controlsEyebrow}>Sort</p>
          <h2 className={styles.controlsTitle}>{activeSort.label}</h2>
          <p className={styles.controlsDescription}>{activeSort.description}</p>
        </div>
        <div className={styles.controlsActions}>
          <div className={styles.summaryChips}>
            <span className={styles.summaryChip}>{getSortMetaLabel(sort)}</span>
            <span className={styles.summaryChip}>공개곡 {pagination.total}</span>
          </div>
          <div className={styles.sortTabs}>
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === sort ? styles.sortTabActive : styles.sortTab}
                onClick={() => handleSortChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {message ? <div className={styles.message}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      {isLoading ? (
        <div className={styles.loading}>공개곡을 불러오는 중입니다...</div>
      ) : items.length > 0 ? (
        <div className={styles.grid}>
          {items.map((item, index) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.media}>
                <img
                  src={item.imageUrl || fallbackCovers[index % fallbackCovers.length]}
                  alt={item.title || "public songs cover"}
                  className={styles.cover}
                />
                {getRankBadge(sort, index) ? (
                  <span className={styles.rankBadge}>{getRankBadge(sort, index)}</span>
                ) : null}
                {item.id ? (
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
                  <div>
                    <h3 className={styles.cardTitle}>{item.title || "제목 생성 대기 중"}</h3>
                    {item.artistId ? (
                      <Link href={`/artists/${item.artistId}`} className={styles.artistLink}>
                        {item.artistName || "SongsAI Artist"}
                      </Link>
                    ) : (
                      <p className={styles.artistText}>{item.artistName || "SongsAI Artist"}</p>
                    )}
                  </div>
                  <span className={styles.dateText}>{formatDate(item.createdAt)}</span>
                </div>
                <p className={styles.cardDescription}>{compactText(item.tags || item.stylePrompt)}</p>
                <div className={styles.cardStats}>
                  <span className={styles.statPill}>{formatLikeCount(item.likeCount)}</span>
                  <span className={styles.statText}>{getSortMetaLabel(sort)}</span>
                </div>
                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={item.likedByMe ? styles.likeButtonActive : styles.likeButton}
                    onClick={() => void handleLike(item)}
                  >
                    {item.likedByMe ? "좋아요 취소" : "좋아요"} · {item.likeCount ?? 0}
                  </button>
                  <span className={styles.listenLabel}>미리듣기 가능한 공개곡</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          아직 공개된 곡이 없습니다. Create에서 곡을 만들면 기본 공개 상태로 Explore에서 바로 들을 수 있게
          됩니다.
        </div>
      )}

      {hasMore && items.length > 0 ? (
        <div className={styles.loadMoreActions}>
          <button type="button" className={styles.loadMoreButton} onClick={() => void handleLoadMore()}>
            {isLoadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      ) : null}
      {isLoadingMore ? <p className={styles.loadMoreText}>다음 공개곡을 불러오는 중입니다...</p> : null}
      {!hasMore && items.length > 0 ? (
        <p className={styles.loadMoreText}>모든 공개곡을 불러왔습니다.</p>
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
