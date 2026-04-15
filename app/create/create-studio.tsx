"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type PublicUser,
  SongsaiApiError,
  buildSongsaiApiUrl,
  getSongsaiApiUrl,
  songsaiApiRequest,
} from "@/lib/songsai-api";

import styles from "./create-studio.module.css";

type LyricMode = "manual" | "ai_lyrics" | "auto";
type VocalGender = "auto" | "female" | "male";
type ModelVersion = "v4_5_plus" | "v5" | "v5_5";
type AutoTopic = "love" | "hometown" | "comfort" | "life";
type AutoEmotion = "yearning" | "warmth" | "lonely" | "hopeful";
type AutoGenre = "trot" | "ballad" | "dance" | "pop";
type AutoTempo = "slow" | "medium" | "fast";
type AutoInstrument = "guitar" | "piano" | "strings" | "synth";

type MusicItem = {
  id: string;
  requestGroupId?: string | null;
  title?: string | null;
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
};

type MusicPagination = {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
type MusicListResponse = { items: MusicItem[]; pagination?: MusicPagination };
type CreateMusicResponse = { item: MusicItem };
type VideoResponse = {
  item: {
    id: string;
    status: string;
    mp4Url?: string | null;
  };
};

type MusicGroup = {
  id: string;
  items: MusicItem[];
};

const TOPIC_LABELS: Record<AutoTopic, string> = {
  love: "사랑",
  hometown: "고향",
  comfort: "위로",
  life: "인생",
};

const EMOTION_LABELS: Record<AutoEmotion, string> = {
  yearning: "그리움",
  warmth: "따뜻함",
  lonely: "외로움",
  hopeful: "희망",
};

const GENRE_LABELS: Record<AutoGenre, string> = {
  trot: "트로트",
  ballad: "발라드",
  dance: "댄스",
  pop: "팝",
};

const TEMPO_LABELS: Record<AutoTempo, string> = {
  slow: "느리게",
  medium: "중간 템포",
  fast: "빠르게",
};

const INSTRUMENT_LABELS: Record<AutoInstrument, string> = {
  guitar: "기타",
  piano: "피아노",
  strings: "스트링",
  synth: "신스",
};

const MODEL_CHOICES: Array<{ value: ModelVersion; label: string }> = [
  { value: "v4_5_plus", label: "Blue" },
  { value: "v5", label: "Red" },
  { value: "v5_5", label: "Gold" },
];

const FALLBACK_COVERS = [
  "/songsai-music/img/bg-img/e1.jpg",
  "/songsai-music/img/bg-img/e2.jpg",
  "/songsai-music/img/bg-img/e3.jpg",
  "/songsai-music/img/bg-img/e4.jpg",
  "/songsai-music/img/bg-img/e5.jpg",
  "/songsai-music/img/bg-img/e6.jpg",
];
const PAGE_SIZE = 6;

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

function buildAutoTitle(topic: AutoTopic, emotion: AutoEmotion) {
  return `${TOPIC_LABELS[topic]}의 ${EMOTION_LABELS[emotion]}`;
}

function buildAutoLyrics(input: {
  topic: AutoTopic;
  emotion: AutoEmotion;
  genre: AutoGenre;
  tempo: AutoTempo;
  instrument: AutoInstrument;
  vocalGender: VocalGender;
  stylePrompt: string;
}) {
  const singerText =
    input.vocalGender === "female"
      ? "여성 보컬이 자연스럽게 느껴지도록 써줘."
      : input.vocalGender === "male"
        ? "남성 보컬이 자연스럽게 느껴지도록 써줘."
        : "보컬 성별은 곡 분위기에 맞게 자연스럽게 선택해줘.";
  const styleText = input.stylePrompt.trim()
    ? `${input.stylePrompt.trim()} 분위기도 반영하고`
    : "곡의 분위기가 선명하게 느껴지도록 하고";

  return `${TOPIC_LABELS[input.topic]}을 주제로 ${EMOTION_LABELS[input.emotion]} 감정을 담은 한국어 가사를 만들어줘.
${GENRE_LABELS[input.genre]} 스타일에 ${TEMPO_LABELS[input.tempo]} 흐름, ${INSTRUMENT_LABELS[input.instrument]} 중심 편곡을 상상하게 써줘.
${styleText} 후렴이 기억에 남도록 구성해줘. ${singerText}`;
}

function buildAutoStylePrompt(input: {
  genre: AutoGenre;
  tempo: AutoTempo;
  instrument: AutoInstrument;
  emotion: AutoEmotion;
  vocalGender: VocalGender;
}) {
  const parts = [
    GENRE_LABELS[input.genre],
    `${TEMPO_LABELS[input.tempo]} 흐름`,
    `${INSTRUMENT_LABELS[input.instrument]} 중심`,
    EMOTION_LABELS[input.emotion],
  ];

  if (input.vocalGender === "female") parts.push("여성 보컬");
  if (input.vocalGender === "male") parts.push("남성 보컬");

  return parts.join(", ");
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

export function CreateStudio() {
  const router = useRouter();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [lyricMode, setLyricMode] = useState<LyricMode>("manual");
  const [isMr, setIsMr] = useState(false);
  const [vocalGender, setVocalGender] = useState<VocalGender>("auto");
  const [modelVersion, setModelVersion] = useState<ModelVersion>("v5_5");
  const [autoTopic, setAutoTopic] = useState<AutoTopic>("hometown");
  const [autoEmotion, setAutoEmotion] = useState<AutoEmotion>("yearning");
  const [autoGenre, setAutoGenre] = useState<AutoGenre>("ballad");
  const [autoTempo, setAutoTempo] = useState<AutoTempo>("medium");
  const [autoInstrument, setAutoInstrument] = useState<AutoInstrument>("piano");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingVideoId, setIsCreatingVideoId] = useState<string | null>(null);
  const [myItems, setMyItems] = useState<MusicItem[]>([]);
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [progressTick, setCountdownTick] = useState(() => Date.now());
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [videoProgressStarts, setVideoProgressStarts] = useState<Record<string, number>>({});

  const generatedTitle = useMemo(() => buildAutoTitle(autoTopic, autoEmotion), [autoEmotion, autoTopic]);
  const generatedLyrics = useMemo(
    () =>
      buildAutoLyrics({
        topic: autoTopic,
        emotion: autoEmotion,
        genre: autoGenre,
        tempo: autoTempo,
        instrument: autoInstrument,
        vocalGender,
        stylePrompt,
      }),
    [autoEmotion, autoGenre, autoInstrument, autoTempo, autoTopic, stylePrompt, vocalGender],
  );

  const generatedStylePrompt = useMemo(
    () =>
      buildAutoStylePrompt({
        genre: autoGenre,
        tempo: autoTempo,
        instrument: autoInstrument,
        emotion: autoEmotion,
        vocalGender,
      }),
    [autoEmotion, autoGenre, autoInstrument, autoTempo, vocalGender],
  );

  const groupedItems = useMemo(() => groupMusicItems(myItems), [myItems]);

  async function loadMyItems(offset = 0, append = false) {
    const mine = await songsaiApiRequest<MusicListResponse>(`/api/v1/music?limit=${PAGE_SIZE}&offset=${offset}`);
    setMyItems((current) => mergeMusicItems(current, mine.items, append));
    setVideoProgressStarts((current) => {
      const next = { ...current };
      for (const item of mine.items) {
        if (item.canDownloadVideo || item.videoStatus === "completed" || item.videoStatus === "failed") {
          delete next[item.id];
        }
      }
      return next;
    });
    setHasMore(mine.pagination?.hasMore ?? mine.items.length === PAGE_SIZE);
    setNextOffset(offset + mine.items.length);
    return mine.items;
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
        await loadMyItems(0, false);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof SongsaiApiError && requestError.status === 401) {
          router.replace("/login?next=/create");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Create 화면을 준비하는 중 문제가 발생했습니다.",
        );
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (isMr && lyricMode === "ai_lyrics") {
      setLyricMode("manual");
    }
  }, [isMr, lyricMode]);

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

    const shouldRefreshPreview = myItems.some((item) => {
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
      void loadMyItems(0, false);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [isCheckingSession, myItems, user]);

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

  async function handleCreate() {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        lyrics: lyricMode === "auto" ? generatedLyrics : lyrics,
        stylePrompt: lyricMode === "auto" ? generatedStylePrompt : stylePrompt,
        lyricMode,
        isMr,
        vocalGender,
        trackCount: 1 as const,
        modelVersion,
      };

      const response = await songsaiApiRequest<CreateMusicResponse>("/api/v1/music", {
        method: "POST",
        body: JSON.stringify({
          ...(lyricMode !== "auto" && title.trim().length > 0 ? { title: title.trim() } : {}),
          ...payload,
        }),
      });

      setMyItems((current) => mergeMusicItems(current, [response.item], false));
      setMessage(`생성 요청을 등록했습니다. ${response.item.title || "제목 생성 대기 중"}`);
      await loadMyItems(0, false);

      setTitle("");
      setLyrics("");
      setStylePrompt("");
      setLyricMode("manual");
      setIsMr(false);
      setVocalGender("auto");
      setModelVersion("v5_5");
      setAutoTopic("hometown");
      setAutoEmotion("yearning");
      setAutoGenre("ballad");
      setAutoTempo("medium");
      setAutoInstrument("piano");
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "음악 생성 요청을 처리하지 못했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
      await loadMyItems(0, false);
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

  function moveSlide(groupId: string, itemCount: number, direction: -1 | 1) {
    setActiveSlides((current) => {
      const currentIndex = current[groupId] ?? 0;
      const nextIndex = (currentIndex + direction + itemCount) % itemCount;
      return { ...current, [groupId]: nextIndex };
    });
  }

  function handlePreviewToggle(item: MusicItem) {
    const audio = previewAudioRef.current;

    if (!audio) {
      return;
    }

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
        void loadMyItems(nextOffset, true).finally(() => {
          setIsLoadingMore(false);
        });
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isCheckingSession, isLoadingMore, nextOffset, user]);

  if (isCheckingSession) {
    return <div className={styles.loading}>로그인 상태와 생성 화면을 준비 중입니다...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <section className={`blog-area section-padding-100 ${styles.section}`}>
      <div className="container">
        <div className="row">
          <div className="col-12">
            <article className={styles.introCard}>
              <p className={styles.eyebrow}>SongsAI Create</p>
              <h1 className={styles.introTitle}>음악 생성 스튜디오</h1>
              <p className={styles.introText}>
                생성 직후에는 초기 제목, 커버, 미리듣기 URL을 먼저 쓰고, 5분 뒤 사용자가 듣기/다운로드/비디오 생성을 할 때 최신 파일과 정보를 정리하는 흐름으로 맞춰가고 있습니다.
              </p>
              <div className={styles.heroMeta}>
                <span className={styles.heroChip}>{user.name || user.email}</span>
                <span className={styles.heroChip}>최근 6개 생성 요청</span>
                <span className={styles.heroChip}>API: {getSongsaiApiUrl()}</span>
              </div>
            </article>

            <article className={styles.panelCard}>
              <h2 className={styles.blockTitle}>Create</h2>
              <p className={styles.blockText}>
                제목을 비우면 자동 제목 생성 흐름을 따르고, 생성 직후에는 초기 미리듣기 URL로 먼저 들을 수 있습니다. 다운로드와 비디오 생성은 5분 뒤부터 가능합니다.
              </p>

              <div className={styles.fieldGrid}>
                <label className={styles.fieldLabel}>
                  제목
                  <input
                    className={styles.textInput}
                    value={lyricMode === "auto" ? "" : title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={lyricMode === "auto"}
                    placeholder={
                      lyricMode === "auto"
                        ? "AI 자동 생성 모드에서는 제목을 따로 보내지 않습니다."
                        : "비워두면 제목 자동 생성 흐름을 사용합니다."
                    }
                  />
                </label>

                <div className={styles.optionGroup}>
                  <span className={styles.optionLabel}>가사 모드</span>
                  <div className={styles.optionButtons}>
                    {[
                      { value: "manual", label: "직접 입력" },
                      ...(!isMr ? [{ value: "ai_lyrics", label: "AI가사" }] : []),
                      { value: "auto", label: "AI 자동 생성" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={lyricMode === option.value ? styles.selectedOptionButton : styles.optionButton}
                        onClick={() => setLyricMode(option.value as LyricMode)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className={styles.checkRow}>
                  <input
                    className={styles.checkbox}
                    type="checkbox"
                    checked={isMr}
                    onChange={(event) => setIsMr(event.target.checked)}
                  />
                  <span className={styles.checkText}>MR 생성</span>
                </label>

                {lyricMode === "auto" ? (
                  <div className={styles.autoBuilder}>
                    <div className={styles.optionGroup}>
                      <span className={styles.optionLabel}>주제</span>
                      <div className={styles.optionButtons}>
                        {(Object.keys(TOPIC_LABELS) as AutoTopic[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={autoTopic === option ? styles.selectedOptionButton : styles.optionButton}
                            onClick={() => setAutoTopic(option)}
                          >
                            {TOPIC_LABELS[option]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.optionGroup}>
                      <span className={styles.optionLabel}>감정</span>
                      <div className={styles.optionButtons}>
                        {(Object.keys(EMOTION_LABELS) as AutoEmotion[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={autoEmotion === option ? styles.selectedOptionButton : styles.optionButton}
                            onClick={() => setAutoEmotion(option)}
                          >
                            {EMOTION_LABELS[option]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.optionGroup}>
                      <span className={styles.optionLabel}>장르</span>
                      <div className={styles.optionButtons}>
                        {(Object.keys(GENRE_LABELS) as AutoGenre[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={autoGenre === option ? styles.selectedOptionButton : styles.optionButton}
                            onClick={() => setAutoGenre(option)}
                          >
                            {GENRE_LABELS[option]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.optionGroup}>
                      <span className={styles.optionLabel}>템포</span>
                      <div className={styles.optionButtons}>
                        {(Object.keys(TEMPO_LABELS) as AutoTempo[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={autoTempo === option ? styles.selectedOptionButton : styles.optionButton}
                            onClick={() => setAutoTempo(option)}
                          >
                            {TEMPO_LABELS[option]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.optionGroup}>
                      <span className={styles.optionLabel}>악기 중심</span>
                      <div className={styles.optionButtons}>
                        {(Object.keys(INSTRUMENT_LABELS) as AutoInstrument[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={autoInstrument === option ? styles.selectedOptionButton : styles.optionButton}
                            onClick={() => setAutoInstrument(option)}
                          >
                            {INSTRUMENT_LABELS[option]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.previewBox}>
                      <p className={styles.previewTitle}>자동 제목 미리보기</p>
                      <p className={styles.previewBody}>{generatedTitle}</p>
                    </div>

                    <div className={styles.previewBox}>
                      <p className={styles.previewTitle}>자동 스타일 프롬프트</p>
                      <p className={styles.previewBody}>{generatedStylePrompt}</p>
                    </div>
                  </div>
                ) : null}

                <label className={styles.fieldLabel}>
                  {lyricMode === "manual" ? "가사" : lyricMode === "ai_lyrics" ? "AI가사 느낌 입력" : "자동 생성 미리보기"}
                  <textarea
                    className={styles.textArea}
                    value={lyricMode === "auto" ? generatedLyrics : lyrics}
                    onChange={(event) => setLyrics(event.target.value)}
                    disabled={lyricMode === "auto"}
                    placeholder={
                      lyricMode === "manual"
                        ? "비워두면 빈 가사로 요청합니다."
                        : "AI 가사에 반영할 문장이나 분위기를 적어주세요."
                    }
                  />
                  <div className={styles.hintRow}>
                    <span>
                      {lyricMode === "auto"
                        ? "선택한 옵션을 기준으로 요청 직전에 자동 문장을 만듭니다."
                        : "생성 요청에 그대로 들어가는 본문입니다."}
                    </span>
                    <span>{(lyricMode === "auto" ? generatedLyrics : lyrics).length}자</span>
                  </div>
                </label>

                <label className={styles.fieldLabel}>
                  스타일 프롬프트
                  <textarea
                    className={styles.textArea}
                    value={lyricMode === "auto" ? generatedStylePrompt : stylePrompt}
                    onChange={(event) => setStylePrompt(event.target.value)}
                    disabled={lyricMode === "auto"}
                    placeholder="예: emotional rock ballad, cinematic, male vocal, piano and guitar"
                  />
                </label>

                <div className={styles.optionGroup}>
                  <span className={styles.optionLabel}>보컬 성별</span>
                  <div className={styles.optionButtons}>
                    {[
                      { value: "auto", label: "자동" },
                      { value: "female", label: "여성" },
                      { value: "male", label: "남성" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={vocalGender === option.value ? styles.selectedOptionButton : styles.optionButton}
                        onClick={() => setVocalGender(option.value as VocalGender)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.optionGroup}>
                  <span className={styles.optionLabel}>모델 버전</span>
                  <div className={styles.optionButtons}>
                    {MODEL_CHOICES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={modelVersion === option.value ? styles.selectedOptionButton : styles.optionButton}
                        onClick={() => setModelVersion(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {message ? <div className={styles.message}>{message}</div> : null}
              {error ? <div className={styles.error}>{error}</div> : null}

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => void handleCreate()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "등록 중..." : "Create"}
                </button>
              </div>

              <p className={styles.metaLine}>
                Create는 `POST /api/v1/music` 한 번으로 생성 요청을 보냅니다. 생성 직후에는 초기 미리듣기만 가능하고, 5분 뒤부터 다운로드/비디오 생성이 가능합니다.
              </p>
            </article>

            <article className={styles.listCard}>
              <h2 className={styles.blockTitle}>My Recent Requests</h2>
              <p className={styles.blockText}>
                최근 생성 요청을 카드 단위로 보여줍니다. 한 번 생성에서 2곡이 나오면 카드 하나에 묶고, 카드 안에서 곡을 넘겨볼 수 있습니다.
              </p>

              {groupedItems.length > 0 ? (
                <div className={styles.requestGrid}>
                  {groupedItems.map((group, groupIndex) => {
                    const activeIndex = Math.min(activeSlides[group.id] ?? 0, Math.max(group.items.length - 1, 0));
                    const activeItem = group.items[activeIndex];
                    const ready = isStabilized(activeItem.createdAt);
                    const canDownloadVideo = Boolean(
                      activeItem.canDownloadVideo && activeItem.videoId && activeItem.videoStatus === "completed",
                    );
                    const isVideoPending =
                      activeItem.videoStatus === "queued" || activeItem.videoStatus === "processing";
                    const canCreateVideo =
                      ready && Boolean(activeItem.canCreateVideo) && !canDownloadVideo && !isVideoPending;
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
                          <span className={getStatusClassName(activeItem.status)}>{formatStatusLabel(activeItem.status)}</span>
                          {group.items.length > 1 ? (
                            <div className={styles.slideControls}>
                              <button
                                type="button"
                                className={styles.slideButton}
                                onClick={() => moveSlide(group.id, group.items.length, -1)}
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

                          {activeItem.mp3Url || activeItem.providerTaskId ? (
                            <p className={styles.previewHint}>
                              이미지를 눌러 현재 슬라이드 곡을 미리듣기 할 수 있습니다.
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
                            {canDownloadVideo ? (
                              <a href={buildVideoDownloadUrl(activeItem)} className={styles.assetButton}>
                                비디오 다운로드
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className={canDownloadVideo ? styles.hiddenAudio : canCreateVideo ? styles.assetButton : styles.assetButtonDisabled}
                              disabled={canDownloadVideo || !canCreateVideo || isCreatingVideoId === activeItem.id}
                              onClick={() => void handleCreateVideo(activeItem)}
                            >
                              {isCreatingVideoId === activeItem.id ? "비디오 준비 중..." : "비디오 생성"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>
                  아직 생성 요청이 없습니다. 위 Create 영역에서 첫 곡을 만들면 여기에 카드가 바로 추가됩니다.
                </div>
              )}
              {groupedItems.length > 0 ? <div ref={loadMoreRef} className={styles.loadMoreSentinel} /> : null}
              {isLoadingMore ? <p className={styles.loadMoreText}>이전 생성 요청을 더 불러오는 중입니다...</p> : null}
              {!hasMore && groupedItems.length > 0 ? (
                <p className={styles.loadMoreText}>모든 생성 요청을 불러왔습니다.</p>
              ) : null}
            </article>
            <audio
              ref={previewAudioRef}
              preload="none"
              className={styles.hiddenAudio}
              onEnded={() => {
                setPlayingItemId(null);
                setPlayingUrl(null);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
