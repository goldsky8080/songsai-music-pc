"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { type PublicUser, SongsaiApiError, buildSongsaiApiUrl, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./assets-studio.module.css";

type MusicItem = {
  id: string;
  requestGroupId?: string | null;
  title?: string | null;
  provider?: string | null;
  lyrics?: string | null;
  stylePrompt?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  mp3Url?: string | null;
  imageUrl?: string | null;
  providerTaskId?: string | null;
  errorMessage?: string | null;
  tags?: string | null;
  duration?: number | string | null;
  canListen?: boolean;
  canDownload?: boolean;
  canCreateVideo?: boolean;
  canDownloadVideo?: boolean;
  downloadAvailableAt?: string | null;
  videoId?: string | null;
  videoStatus?: string | null;
  isPublic?: boolean;
  likeCount?: number;
};

type MusicPagination = {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
type MusicListResponse = { items: MusicItem[]; pagination?: MusicPagination };
type VideoResponse = {
  item: {
    id: string;
    status: string;
    mp4Url?: string | null;
  };
};
type VisibilityResponse = {
  item: {
    id: string;
    isPublic: boolean;
  };
};
type ShareResponse = {
  item: {
    id: string;
    shareUrl: string;
    mp3AssetReady: boolean;
    coverAssetReady: boolean;
  };
};
type MusicGroup = {
  id: string;
  items: MusicItem[];
};

type AssetsProviderTab = "songsai" | "ace_step";

const FALLBACK_COVERS = [
  "/songsai-music/img/bg-img/e1.jpg",
  "/songsai-music/img/bg-img/e2.jpg",
  "/songsai-music/img/bg-img/e3.jpg",
  "/songsai-music/img/bg-img/e4.jpg",
  "/songsai-music/img/bg-img/e5.jpg",
  "/songsai-music/img/bg-img/e6.jpg",
];
const PAGE_SIZE = 8;

function formatStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "완료";
    case "processing":
      return "생성 중";
    case "failed":
      return "실패";
    case "queued":
      return "대기 중";
    default:
      return status;
  }
}

function getStatusClassName(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return styles.badgeCompleted;
    case "processing":
      return styles.badgeProcessing;
    case "failed":
      return styles.badgeFailed;
    default:
      return styles.badgeQueued;
  }
}

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

function getRemainingSeconds(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return 0;
  const deadline = createdTime + 5 * 60 * 1000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function isStabilized(createdAt: string) {
  return getRemainingSeconds(createdAt) <= 0;
}

function formatRemainingLabel(item: MusicItem) {
  const seconds = getRemainingSeconds(item.createdAt);
  if (seconds <= 0) return "5분 경과 · 다운로드 가능";
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `5분 뒤 다운로드 가능 · ${minutes}:${String(remain).padStart(2, "0")}`;
}

function compactText(value?: string | null, fallback = "상세 정보는 생성 후 자동으로 채워집니다.") {
  if (!value) return fallback;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

function getCoverUrl(item: MusicItem, index: number) {
  return item.imageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length];
}

function buildPlaybackUrl(item: MusicItem) {
  if (!isStabilized(item.createdAt) && item.mp3Url) {
    return item.mp3Url;
  }

  return buildSongsaiApiUrl(`/api/v1/music/${item.id}/download?inline=1`).toString();
}

function buildDownloadUrl(item: MusicItem) {
  return buildSongsaiApiUrl(`/api/v1/music/${item.id}/download`).toString();
}

function buildVideoDownloadUrl(item: MusicItem) {
  return buildSongsaiApiUrl(`/api/v1/music/${item.id}/video/download`).toString();
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

function getSimulatedVideoProgress(item: MusicItem, nowMs: number, startedAtMs?: number | null) {
  if (item.videoStatus === "completed" || item.canDownloadVideo) {
    return null;
  }

  if (!startedAtMs && item.videoStatus !== "queued" && item.videoStatus !== "processing") {
    return null;
  }

  const startedAt = startedAtMs ?? new Date(item.updatedAt || item.createdAt).getTime();
  const safeStartedAt = Number.isFinite(startedAt) ? startedAt : nowMs;
  const elapsedSeconds = Math.max(0, (nowMs - safeStartedAt) / 1000);
  const percent = Math.min(95, Math.max(12, Math.round(12 + elapsedSeconds * 0.9)));

  return {
    label: item.videoStatus === "processing" ? "비디오 생성 중" : "비디오 생성 준비 중",
    detail: "프론트에서 진행 상태를 표시하고 있습니다. 완료되면 자동으로 다운로드 상태로 전환됩니다.",
    percent,
  };
}

function groupMusicItems(items: MusicItem[]) {
  const groups = new Map<string, MusicGroup>();

  for (const item of items) {
    const groupId = item.requestGroupId || item.id;
    const existing = groups.get(groupId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(groupId, { id: groupId, items: [item] });
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }));
}

function getProviderQueryValue(tab: AssetsProviderTab) {
  return tab === "ace_step" ? "ace_step" : "suno";
}

function mergeMusicItems(existing: MusicItem[], incoming: MusicItem[], append: boolean) {
  const base = append ? [...existing, ...incoming] : [...incoming, ...existing];
  const seen = new Set<string>();
  const merged: MusicItem[] = [];

  for (const item of base) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function AssetsStudio() {
  const router = useRouter();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [items, setItems] = useState<MusicItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [isCreatingVideoId, setIsCreatingVideoId] = useState<string | null>(null);
  const [isUpdatingVisibilityId, setIsUpdatingVisibilityId] = useState<string | null>(null);
  const [isPreparingShareId, setIsPreparingShareId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [progressTick, setCountdownTick] = useState(() => Date.now());
  const [videoProgressStarts, setVideoProgressStarts] = useState<Record<string, number>>({});
  const [activeProviderTab, setActiveProviderTab] = useState<AssetsProviderTab>("songsai");
  const [shareTooltipId, setShareTooltipId] = useState<string | null>(null);

  const groupedItems = useMemo(() => groupMusicItems(items), [items]);
  const visibleGroups = groupedItems;

  async function loadItems(offset = 0, append = false) {
    const provider = getProviderQueryValue(activeProviderTab);
    const response = await songsaiApiRequest<MusicListResponse>(
      `/api/v1/music?provider=${provider}&limit=${PAGE_SIZE}&offset=${offset}`,
    );
    setItems((current) => (append ? mergeMusicItems(current, response.items, true) : response.items));
    setVideoProgressStarts((current) => {
      const next = { ...current };
      for (const item of response.items) {
        if (item.canDownloadVideo || item.videoStatus === "completed" || item.videoStatus === "failed") {
          delete next[item.id];
        }
      }
      return next;
    });
    setHasMore(response.pagination?.hasMore ?? response.items.length === PAGE_SIZE);
    setNextOffset(offset + response.items.length);
    return response.items;
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const response = await songsaiApiRequest<{ user: PublicUser }>("/api/v1/me", {
          method: "GET",
        });
        if (cancelled) return;
        setUser(response.user);
        await loadItems(0, false);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof SongsaiApiError && requestError.status === 401) {
          router.replace("/login?next=/assets");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "My Assets 화면을 준비하는 중 문제가 발생했습니다.",
        );
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [activeProviderTab, router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isCheckingSession || !user) {
      return;
    }

    const shouldRefreshPreview = items.some((item) => {
      if (isStabilized(item.createdAt)) {
        return false;
      }

      const normalizedTitle = item.title?.trim() ?? "";
      return !item.mp3Url || !item.imageUrl || normalizedTitle.length === 0 || normalizedTitle === "제목 생성 대기 중";
    });

    if (!shouldRefreshPreview) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadItems(0, false);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [isCheckingSession, items, user]);

  useEffect(() => {
    if (isCheckingSession || !user) {
      return;
    }

    const hasPendingVideo = items.some(
      (item) => item.videoStatus === "queued" || item.videoStatus === "processing",
    );

    if (!hasPendingVideo) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadItems(0, false);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [isCheckingSession, items, user]);

  useEffect(() => {
    const audio = previewAudioRef.current;

    if (!audio || !playingUrl) {
      return;
    }

    audio.src = playingUrl;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      setPlayingItemId(null);
      setPlayingUrl(null);
    });
  }, [playingUrl]);

  function moveSlide(groupId: string, itemCount: number, direction: -1 | 1) {
    setActiveSlides((current) => {
      const currentIndex = current[groupId] ?? 0;
      const nextIndex = (currentIndex + direction + itemCount) % itemCount;
      return { ...current, [groupId]: nextIndex };
    });
  }

  function handlePreviewToggle(item: MusicItem) {
    const audio = previewAudioRef.current;

    if (!audio) return;

    if (playingItemId === item.id) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingItemId(null);
      setPlayingUrl(null);
      return;
    }

    setPlayingItemId(item.id);
    setPlayingUrl(buildPlaybackUrl(item));
  }

  async function handleCreateVideo(item: MusicItem) {
    setIsCreatingVideoId(item.id);
    setError(null);
    setMessage(null);
    setVideoProgressStarts((current) => ({ ...current, [item.id]: Date.now() }));

    try {
      const response = await songsaiApiRequest<VideoResponse>(`/api/v1/music/${item.id}/video`, {
        method: "POST",
      });
      setMessage(`비디오 요청을 등록했습니다. ${response.item.status}`);
      await loadItems(0, false);
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "비디오 생성 요청을 처리하지 못했습니다.",
      );
    } finally {
      setIsCreatingVideoId(null);
    }
  }

  async function handleVisibilityToggle(item: MusicItem) {
    setIsUpdatingVisibilityId(item.id);
    setError(null);
    setMessage(null);

    try {
      const response = await songsaiApiRequest<VisibilityResponse>(`/api/v1/music/${item.id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic: !item.isPublic }),
      });

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                isPublic: response.item.isPublic,
              }
            : currentItem,
        ),
      );
      setMessage(
        response.item.isPublic
          ? "이 곡이 Explore에 공개되도록 변경했습니다."
          : "이 곡을 private로 전환해 Explore에서 숨겼습니다.",
      );
    } catch (requestError) {
      if (requestError instanceof SongsaiApiError && requestError.status === 401) {
        setError("로그인이 만료되었습니다. 다시 로그인한 뒤 공개 상태를 변경해 주세요.");
        return;
      }

      if (requestError instanceof SongsaiApiError && requestError.status === 404) {
        setError("공개 상태 변경 API가 아직 연결되지 않았습니다. songsai-api에 visibility 엔드포인트를 먼저 추가해 주세요.");
        return;
      }

      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "공개 상태를 변경하지 못했습니다.",
      );
    } finally {
      setIsUpdatingVisibilityId(null);
    }
  }

  async function handleCopyShareUrl(item: MusicItem) {
    if (item.isPublic === false || !isStabilized(item.createdAt)) {
      setShareTooltipId(null);
      setMessage(null);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      setIsPreparingShareId(item.id);
      setError(null);
      setMessage(null);

      const response = await songsaiApiRequest<ShareResponse>(`/api/v1/music/${item.id}/share`, {
        method: "POST",
      });
      const copied = await copyText(response.item.shareUrl);
      setError(null);
      setMessage(null);
      setShareTooltipId(copied ? item.id : null);
      if (copied) {
        window.setTimeout(() => {
          setShareTooltipId((current) => (current === item.id ? null : current));
        }, 1800);
      }
    } catch (requestError) {
      setShareTooltipId(null);
      setMessage(null);
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "공유 링크 복사에 실패했습니다.",
      );
    } finally {
      setIsPreparingShareId((current) => (current === item.id ? null : current));
    }
  }

  useEffect(() => {
    if (isCheckingSession || !user || !hasMore || isLoadingMore) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) {
          return;
        }

        setIsLoadingMore(true);
        void loadItems(nextOffset, true).finally(() => {
          setIsLoadingMore(false);
        });
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isCheckingSession, isLoadingMore, nextOffset, user]);

  if (isCheckingSession) {
    return <div className={styles.loading}>내 자산 화면을 준비하고 있습니다...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <section className={`blog-area section-padding-100 ${styles.section}`} data-react-assets-page="true">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <article className={styles.introCard}>
              <p className={styles.eyebrow}>SongsAI Assets</p>
              <h1 className={styles.introTitle}>내 자산 관리</h1>
              <p className={styles.introText}>
                Create에서 생성한 곡들을 request group 기준으로 묶어 보여줍니다. 5분 전에는 미리듣기만
                가능하고, 5분이 지나면 다운로드와 비디오 생성이 열립니다.
              </p>
              <div className={styles.heroMeta}>
                <span className={styles.heroChip}>{user.name || user.email}</span>
                <span className={styles.heroChip}>최근 24곡 기준</span>
                <span className={styles.heroChip}>2트랙 그룹 카드</span>
              </div>
            </article>

            <article className={styles.listCard}>
              <h2 className={styles.blockTitle}>My Assets</h2>
              <p className={styles.blockText}>
                생성 요청 한 번에 묶인 곡들은 카드 하나 안에서 넘겨보며 관리할 수 있습니다.
                5분 전에는 미리듣기만 가능하고, 이후에는 다운로드와 비디오 생성이 가능합니다.
              </p>
              <div className={styles.providerTabs} role="tablist" aria-label="Assets provider tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProviderTab === "songsai"}
                  className={activeProviderTab === "songsai" ? styles.providerTabActive : styles.providerTab}
                  onClick={() => setActiveProviderTab("songsai")}
                >
                  SongsAI
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProviderTab === "ace_step"}
                  className={activeProviderTab === "ace_step" ? styles.providerTabActive : styles.providerTab}
                  onClick={() => setActiveProviderTab("ace_step")}
                >
                  ACE-Step
                </button>
              </div>

              {message ? <div className={styles.message}>{message}</div> : null}
              {error ? <div className={styles.error}>{error}</div> : null}

              {visibleGroups.length > 0 ? (
                <div className={styles.requestGrid}>
                  {visibleGroups.map((group, groupIndex) => {
                    const activeIndex = Math.min(activeSlides[group.id] ?? 0, Math.max(group.items.length - 1, 0));
                    const activeItem = group.items[activeIndex];
                    const isAceStepItem = activeItem.provider === "ACE_STEP";
                    const ready = isStabilized(activeItem.createdAt);
                    const canDownloadVideo = Boolean(
                      activeItem.canDownloadVideo && activeItem.videoId && activeItem.videoStatus === "completed",
                    );
                    const isVideoPending =
                      activeItem.videoStatus === "queued" || activeItem.videoStatus === "processing";
                    const canCreateVideo =
                      !isAceStepItem && ready && Boolean(activeItem.canCreateVideo) && !canDownloadVideo && !isVideoPending;
                    const canShare = ready && activeItem.isPublic !== false;
                    const videoProgress = getSimulatedVideoProgress(
                      activeItem,
                      progressTick,
                      videoProgressStarts[activeItem.id],
                    );

                    return (
                      <article key={group.id} className={styles.requestCard}>
                        <div className={styles.requestMedia}>
                          <img
                            src={getCoverUrl(activeItem, groupIndex)}
                            alt={activeItem.title || "generated music cover"}
                            className={styles.requestImage}
                          />
                          <div className={styles.mediaHeader}>
                            <h3 className={styles.mediaTitle}>{activeItem.title || "제목 생성 대기 중"}</h3>
                            <p className={styles.mediaMeta}>
                              {formatDate(activeItem.createdAt)}
                              {activeItem.duration ? ` · ${activeItem.duration}` : ""}
                            </p>
                          </div>
                          {activeItem.mp3Url || activeItem.providerTaskId ? (
                            <button
                              type="button"
                              className={styles.previewButton}
                              onClick={() => handlePreviewToggle(activeItem)}
                              aria-label={playingItemId === activeItem.id ? "Pause preview" : "Play preview"}
                            >
                              <span className={styles.previewButtonInner}>
                                {playingItemId === activeItem.id ? "❚❚" : "▷"}
                              </span>
                            </button>
                          ) : null}
                          <div className={styles.mediaBadges}>
                            <span className={getStatusClassName(activeItem.status)}>{formatStatusLabel(activeItem.status)}</span>
                            <button
                              type="button"
                              className={
                                activeItem.isPublic === false
                                  ? styles.mediaTogglePrivate
                                  : styles.mediaTogglePublic
                              }
                              disabled={isUpdatingVisibilityId === activeItem.id}
                              onClick={() => void handleVisibilityToggle(activeItem)}
                            >
                              {isUpdatingVisibilityId === activeItem.id
                                ? "변경 중"
                                : activeItem.isPublic === false
                                  ? "Private"
                                  : "Public"}
                            </button>
                          </div>
                          {group.items.length > 1 ? (
                            <div className={styles.slideControls}>
                              <button
                                type="button"
                                className={styles.slideButton}
                                onClick={() => moveSlide(group.id, group.items.length, -1)}
                                aria-label="이전 곡"
                              >
                                ‹
                              </button>
                              <span className={styles.slideIndicator}>
                                {activeIndex + 1} / {group.items.length}
                              </span>
                              <button
                                type="button"
                                className={styles.slideButton}
                                onClick={() => moveSlide(group.id, group.items.length, 1)}
                                aria-label="다음 곡"
                              >
                                ›
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className={styles.requestBody}>
                          <h3 className={styles.requestTitle}>{activeItem.title || "제목 생성 대기 중"}</h3>
                          <p className={styles.requestMeta}>
                            {formatDate(activeItem.createdAt)}
                            {activeItem.duration ? ` · ${activeItem.duration}` : ""}
                          </p>
                          <p className={styles.requestCountdown}>{formatRemainingLabel(activeItem)}</p>
                          <p className={styles.requestDescription}>
                            {activeItem.errorMessage
                              ? activeItem.errorMessage
                              : compactText(activeItem.stylePrompt || activeItem.tags || activeItem.lyrics)}
                          </p>
                          <div className={styles.visibilityRow}>
                            <span
                              className={
                                activeItem.isPublic === false
                                  ? styles.visibilityChipPrivate
                                  : styles.visibilityChipPublic
                              }
                            >
                              {activeItem.isPublic === false ? "Private" : "Public"}
                            </span>
                            <span className={styles.visibilityMeta}>
                              {activeItem.isPublic === false
                                ? "Explore와 Artist 페이지에서 숨김"
                                : "Explore와 Artist 페이지에 노출"}
                            </span>
                          </div>

                          {activeItem.mp3Url || activeItem.providerTaskId ? (
                            <p className={styles.previewHint}>
                              이미지 중앙 플레이 버튼으로 현재 슬라이드의 곡을 미리듣기할 수 있습니다.
                            </p>
                          ) : (
                            <div className={styles.infoBox}>미리듣기 준비 중입니다.</div>
                          )}

                          {videoProgress ? (
                            <div className={styles.videoProgress}>
                              <div className={styles.videoProgressHeader}>
                                <span>{videoProgress.label}</span>
                                <strong>{videoProgress.percent}%</strong>
                              </div>
                              <div className={styles.videoProgressTrack}>
                                <span style={{ width: `${videoProgress.percent}%` }} />
                              </div>
                              <p>{videoProgress.detail}</p>
                            </div>
                          ) : null}

                          <div className={styles.assetRow}>
                            <button
                              type="button"
                              className={styles.assetButtonSecondary}
                              disabled={isUpdatingVisibilityId === activeItem.id}
                              onClick={() => void handleVisibilityToggle(activeItem)}
                            >
                              {isUpdatingVisibilityId === activeItem.id
                                ? "공개 상태 변경 중.."
                                : activeItem.isPublic === false
                                  ? "Make Public"
                                  : "Make Private"}
                            </button>
                            <a
                              href={ready ? buildDownloadUrl(activeItem) : undefined}
                              className={ready ? styles.assetButton : styles.assetButtonDisabled}
                              aria-disabled={!ready}
                              onClick={(event) => {
                                if (!ready) event.preventDefault();
                              }}
                            >
                              다운로드
                            </a>
                            <button
                              type="button"
                              className={canShare && isPreparingShareId !== activeItem.id ? styles.assetButton : styles.assetButtonDisabled}
                              disabled={!canShare || isPreparingShareId === activeItem.id}
                              onClick={() => void handleCopyShareUrl(activeItem)}
                            >
                              {isPreparingShareId === activeItem.id ? "공유 준비중.." : "공유"}
                            </button>
                            {shareTooltipId === activeItem.id ? (
                              <span className={styles.shareTooltip} role="status" aria-live="polite">
                                복사되었습니다.
                              </span>
                            ) : null}
                            {canDownloadVideo ? (
                              <a href={buildVideoDownloadUrl(activeItem)} className={styles.assetButton}>
                                비디오 다운
                              </a>
                            ) : !isAceStepItem ? (
                              <button
                                type="button"
                                className={canCreateVideo ? styles.assetButton : styles.assetButtonDisabled}
                                disabled={isAceStepItem || !canCreateVideo || isCreatingVideoId === activeItem.id}
                                onClick={() => void handleCreateVideo(activeItem)}
                              >
                                {isAceStepItem
                                  ? "ACE-Step 비디오 미지원"
                                  : isCreatingVideoId === activeItem.id
                                  ? "비디오 준비 중..."
                                  : isVideoPending
                                    ? "비디오 생성 중..."
                                    : "비디오 생성"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>
                  아직 생성된 자산이 없습니다. Create에서 첫 곡을 만들면 여기에서 그룹 카드 형태로 바로
                  관리할 수 있습니다.
                </div>
              )}

              {visibleGroups.length > 0 ? <div ref={loadMoreRef} className={styles.loadMoreSentinel} /> : null}
              {isLoadingMore ? <p className={styles.loadMoreText}>이전 자산을 더 불러오는 중입니다...</p> : null}
              {!hasMore && visibleGroups.length > 0 ? (
                <p className={styles.loadMoreText}>모든 자산을 불러왔습니다.</p>
              ) : null}

              <audio
                ref={previewAudioRef}
                preload="none"
                className={styles.hiddenAudio}
                onEnded={() => {
                  setPlayingItemId(null);
                  setPlayingUrl(null);
                }}
              />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
