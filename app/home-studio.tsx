"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import styles from "./home-studio.module.css";

type ExploreSort = "latest" | "weekly" | "monthly";

type HomeSong = {
  id: string;
  title?: string | null;
  artistId?: string | null;
  artistName?: string | null;
  imageUrl?: string | null;
  mp3Url?: string | null;
  lyrics?: string | null;
  likeCount?: number;
  createdAt: string;
  tags?: string | null;
};

type ExploreResponse = { items: HomeSong[] };
type RecentResponse = { items: HomeSong[] };

function getHomeFallbackApiBase() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/proxy`;
  }

  return "/api/proxy";
}

async function requestHomePublicData<T>(path: string): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = [
    `${getHomeFallbackApiBase()}${normalizedPath}`,
    `https://api.songsai.org${normalizedPath}`,
  ];

  let lastError: Error | null = null;

  for (const target of candidates) {
    try {
      const response = await fetch(target, {
        cache: "no-store",
        credentials: target.startsWith("http") ? "include" : "same-origin",
      });

      if (!response.ok) {
        lastError = new Error(`Home public request failed: ${response.status} @ ${target}`);
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Unknown home request failure @ ${target}`);
    }
  }

  throw lastError ?? new Error(`Home public request failed: ${normalizedPath}`);
}

const heroSlides = [
  {
    id: "primary",
    eyebrow: "프리미엄 AI 음악 제작 스튜디오",
    title: "당신의 아이디어를\n완성된 음악으로",
    echo: "당신의 아이디어를 완성된 음악으로",
    description: "프롬프트, 스타일, 가사, 자산과 결과 확인까지 한 흐름으로 이어지는 songsai-music PC 작업 공간.",
    href: "/login",
    cta: "지금 시작하기",
    imageUrl: "/songsai-music/img/bg-img/hero-songsai-main.png",
    primary: true,
  },
  {
    id: "secondary",
    eyebrow: "생성부터 자산 관리까지 한 번에",
    title: "곡, 커버, 영상까지\n끊기지 않는 워크플로",
    echo: "곡, 커버, 영상까지 끊기지 않는 워크플로",
    description: "최근 작업, 다운로드 자산, 진행 상태를 데스크톱 환경에 맞게 더 풍부하게 확인해보세요.",
    href: "/assets",
    cta: "작업 둘러보기",
    imageUrl: "/songsai-music/img/bg-img/bg-4.jpg",
    primary: false,
  },
] as const;

const workflowCards = [
  ["곡 생성 콘솔", "프롬프트와 스타일 입력", "/songsai-music/img/bg-img/a1.jpg"],
  ["가사 워크플로", "직접 입력과 생성 모드", "/songsai-music/img/bg-img/a2.jpg"],
  ["스타일 프리셋", "장르와 무드 조합", "/songsai-music/img/bg-img/a3.jpg"],
  ["자산 미리보기", "커버와 결과 확인", "/songsai-music/img/bg-img/a4.jpg"],
  ["커버 이미지", "시각 자산 미리보기", "/songsai-music/img/bg-img/a5.jpg"],
  ["비디오 확장", "뮤직비디오 제작 연결", "/songsai-music/img/bg-img/a6.jpg"],
  ["결제와 크레딧", "잔액과 충전 흐름", "/songsai-music/img/bg-img/a7.jpg"],
] as const;

const featureCards = [
  ["실시간 생성 상태", "작업 큐와 진행률", "/songsai-music/img/bg-img/b1.jpg", "/songsai-music/audio/dummy-audio.mp3"],
  ["다운로드 자산", "오디오와 이미지 정리", "/songsai-music/img/bg-img/b2.jpg", ""],
  ["비디오 제작 패널", "시각 자산 미리보기", "/songsai-music/img/bg-img/b3.jpg", ""],
  ["공개곡 노출", "Explore와 Artist 연결", "/songsai-music/img/bg-img/b4.jpg", ""],
  ["실시간 생성 상태", "작업 큐와 진행률", "/songsai-music/img/bg-img/b1.jpg", "/songsai-music/audio/dummy-audio.mp3"],
  ["다운로드 자산", "오디오와 이미지 정리", "/songsai-music/img/bg-img/b2.jpg", ""],
] as const;

const emptyPublicMessages: Record<ExploreSort, string> = {
  weekly: "이번 주 좋아요가 집계된 공개곡이 아직 없습니다.",
  monthly: "이번 달 좋아요가 집계된 공개곡이 아직 없습니다.",
  latest: "아직 공개된 곡이 없습니다.",
};

const usageScenes = [
  ["가사 워크플로", "/songsai-music/img/bg-img/pa1.jpg"],
  ["브랜드 캠페인 음악", "/songsai-music/img/bg-img/pa2.jpg"],
  ["유튜브 배경음 제작", "/songsai-music/img/bg-img/pa3.jpg"],
  ["숏폼용 하이라이트", "/songsai-music/img/bg-img/pa4.jpg"],
  ["광고용 짧은 테마", "/songsai-music/img/bg-img/pa5.jpg"],
  ["보컬 데모 작업", "/songsai-music/img/bg-img/pa6.jpg"],
  ["커버 이미지 실험", "/songsai-music/img/bg-img/pa7.jpg"],
] as const;

function formatHomeDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatShortDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function compactText(value?: string | null, fallback = "가사 일부가 여기에 표시됩니다.") {
  if (!value) return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > 140 ? `${normalized.slice(0, 140)}...` : normalized;
}

function buildArtistHref(item: HomeSong, fallback: string) {
  return item.artistId ? `/artists/${item.artistId}` : fallback;
}

function buildPreviewUrl(item: HomeSong) {
  if (item.id.startsWith("fallback-")) {
    return item.mp3Url || "/songsai-music/audio/dummy-audio.mp3";
  }
  return `/api/public-preview/${item.id}`;
}

function buildRecentAudioUrl(item: HomeSong) {
  return item.mp3Url || buildPreviewUrl(item);
}

export function HomeStudio() {
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const selectedAudioRef = useRef<HTMLAudioElement | null>(null);

  const [heroIndex, setHeroIndex] = useState(0);
  const [recentSongs, setRecentSongs] = useState<HomeSong[]>([]);
  const [publicSongs, setPublicSongs] = useState<Record<ExploreSort, HomeSong[]>>({
    weekly: [],
    monthly: [],
    latest: [],
  });
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      const [recentResult, weeklyResult, monthlyResult, latestResult] = await Promise.allSettled([
        requestHomePublicData<RecentResponse>("/api/v1/music/recent?limit=10"),
        requestHomePublicData<ExploreResponse>("/api/v1/explore?sort=weekly&limit=6&offset=0"),
        requestHomePublicData<ExploreResponse>("/api/v1/explore?sort=monthly&limit=6&offset=0"),
        requestHomePublicData<ExploreResponse>("/api/v1/explore?sort=latest&limit=6&offset=0"),
      ]);

      if (recentResult.status === "rejected") {
        console.error("[home] recent request failed", recentResult.reason);
      }
      if (weeklyResult.status === "rejected") {
        console.error("[home] weekly request failed", weeklyResult.reason);
      }
      if (monthlyResult.status === "rejected") {
        console.error("[home] monthly request failed", monthlyResult.reason);
      }
      if (latestResult.status === "rejected") {
        console.error("[home] latest request failed", latestResult.reason);
      }

      if (cancelled) return;

      if (recentResult.status === "fulfilled") {
        setRecentSongs(recentResult.value.items);
        setSelectedTrackId(recentResult.value.items[0]?.id ?? "");
      }

      setPublicSongs({
        weekly: weeklyResult.status === "fulfilled" ? weeklyResult.value.items : [],
        monthly: monthlyResult.status === "fulfilled" ? monthlyResult.value.items : [],
        latest: latestResult.status === "fulfilled" ? latestResult.value.items : [],
      });
    }

    void loadHomeData();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTrack = useMemo(
    () => recentSongs.find((item) => item.id === selectedTrackId) || recentSongs[0] || null,
    [recentSongs, selectedTrackId],
  );

  useEffect(() => {
    const audio = selectedAudioRef.current;
    if (!audio || !selectedTrack) return;
    audio.src = buildRecentAudioUrl(selectedTrack);
    audio.load();
  }, [selectedTrack]);

  function handleSelectRecentTrack(item: HomeSong) {
    setSelectedTrackId(item.id);
    const audio = selectedAudioRef.current;
    if (!audio) return;
    audio.src = buildRecentAudioUrl(item);
    audio.load();
    void audio.play().catch(() => undefined);
  }

  function handleTogglePreview(item: HomeSong, playKey = item.id) {
    const audio = previewAudioRef.current;
    if (!audio) return;

    if (previewPlayingId === playKey && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      setPreviewPlayingId(null);
      return;
    }

    audio.src = buildPreviewUrl(item);
    audio.currentTime = 0;
    setPreviewPlayingId(playKey);
    void audio.play().catch(() => setPreviewPlayingId(null));
  }

  return (
    <main className={styles.home}>
      <section className="hero-area">
        <div className={`hero-slides ${styles.heroDeck}`}>
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`single-hero-slide songsai-hero-slide d-flex align-items-center justify-content-center ${
                slide.primary ? "songsai-hero-slide-primary" : ""
              } ${index === heroIndex ? styles.heroVisible : styles.heroHidden}`}
            >
              <div className="slide-img bg-img" style={{ backgroundImage: `url(${slide.imageUrl})` }} />
              <div className="container">
                <div className="row">
                  <div className="col-12">
                    <div className="hero-slides-content songsai-hero-content text-center">
                      <h6>{slide.eyebrow}</h6>
                      <h2>
                        {slide.title.split("\n").map((line, lineIndex, lines) => (
                          <Fragment key={`${slide.id}-${line}`}>
                            {line}
                            {lineIndex < lines.length - 1 ? <br /> : null}
                          </Fragment>
                        ))}
                        <span>{slide.echo}</span>
                      </h2>
                      <p>{slide.description}</p>
                      <Link href={slide.href} className="btn songsaiMusic-btn mt-50">
                        {slide.cta} <i className="fa fa-angle-double-right" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.heroDots}>
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`${styles.heroDot} ${index === heroIndex ? styles.heroDotActive : ""}`}
              onClick={() => setHeroIndex(index)}
              aria-label={`${index + 1}번 슬라이드`}
            />
          ))}
        </div>
      </section>

      <section className="latest-albums-area section-padding-100">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="section-heading style-2">
                <p>지금 확인해야 할 핵심 흐름</p>
                <h2>메인 작업 패널</h2>
              </div>
            </div>
          </div>
          <div className="row justify-content-center">
            <div className="col-12 col-lg-9">
              <div className="ablums-text text-center mb-70">
                <p>
                  songsai-music PC 버전은 단순 소개 페이지가 아니라 실제 음악 제작 흐름을 담는 작업 공간입니다. 생성 콘솔,
                  자산 확인, 다운로드, 비디오 확장까지 한 화면에서 이어지는 경험을 목표로 합니다.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.recentPlayer}>
            {selectedTrack ? (
              <>
                <div className={styles.recentPlayerCover}>
                  <img src={selectedTrack.imageUrl || "/songsai-music/img/bg-img/a1.jpg"} alt={selectedTrack.title || "선택된 곡"} />
                </div>
                <div className={styles.recentPlayerBody}>
                  <p className={styles.recentPlayerEyebrow}>Selected Track</p>
                  <h3 className={styles.recentPlayerTitle}>{selectedTrack.title || "재생할 곡을 선택해 주세요"}</h3>
                  <p className={styles.recentPlayerMeta}>{formatHomeDate(selectedTrack.createdAt)}</p>
                  <p className={styles.recentPlayerLyrics}>{compactText(selectedTrack.lyrics || selectedTrack.tags)}</p>
                  <audio ref={selectedAudioRef} className={styles.recentPlayerAudio} controls preload="none" />
                </div>
              </>
            ) : (
              <div className={styles.emptyRecent}>
                <p className={styles.recentPlayerEyebrow}>Selected Track</p>
                <h3 className={styles.recentPlayerTitle}>최근 생성곡이 없습니다</h3>
                <p className={styles.recentPlayerLyrics}>
                  Create에서 곡을 만들면 완료된 최근 생성 결과가 이 영역에 표시됩니다.
                </p>
              </div>
            )}
          </div>

          {recentSongs.length > 0 ? (
            <div className={`albums-slideshow ${styles.albumRail}`}>
              {recentSongs.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`single-album ${styles.albumCard} ${selectedTrack?.id === item.id ? styles.albumCardActive : ""}`}
                onClick={() => handleSelectRecentTrack(item)}
              >
                <div className={styles.recentCoverWrap}>
                  <img src={item.imageUrl || workflowCards[index % workflowCards.length][2]} alt={item.title || "최근 생성 곡"} className={styles.recentCover} />
                  <span className={styles.recentPlay}>
                    <span className="icon-play-button" />
                  </span>
                </div>
                <div className="album-info">
                  <h5>{item.title || "제목 없는 곡"}</h5>
                  <p className={styles.recentMeta}>{formatHomeDate(item.createdAt)}</p>
                </div>
              </button>
              ))}
            </div>
          ) : null}

          <div className="row">
            {workflowCards.map(([title, description, imageUrl]) => (
              <div key={title} className={`col-12 col-sm-6 col-lg-3 ${styles.workflowCol}`}>
                <div className="single-album">
                  <img src={imageUrl} alt={title} />
                  <div className="album-info">
                    <h5>{title}</h5>
                    <p>{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="songsaiMusic-buy-now-area has-fluid bg-gray section-padding-100">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="section-heading style-2">
                <p>지금 확인해야 할 핵심 흐름</p>
                <h2>주요 기능 미리보기</h2>
              </div>
            </div>
          </div>
          <div className="row">
            {featureCards.map(([title, description, imageUrl, previewUrl], index) => (
              <div key={`${title}-${index}`} className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div className="single-album-area">
                  <div className="album-thumb">
                    <img src={imageUrl} alt={title} />
                    {previewUrl ? (
                      <div className="play-icon">
                        <button
                          type="button"
                          className={`${styles.iconButton} ${previewPlayingId === `feature-${index}` ? styles.iconButtonActive : ""}`}
                          onClick={() =>
                            handleTogglePreview(
                              {
                                id: `${title}-${index}`,
                                title,
                                imageUrl,
                                createdAt: new Date().toISOString(),
                                mp3Url: previewUrl,
                              },
                              `feature-${index}`,
                            )
                          }
                          aria-label="미리듣기"
                        >
                          <span className="icon-play-button" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="album-info">
                    <h5>{title}</h5>
                    <p>{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-artist-area section-padding-100 bg-img bg-overlay bg-fixed" style={{ backgroundImage: "url(/songsai-music/img/bg-img/bg-4.jpg)" }}>
        <div className="container">
          <div className="row align-items-end">
            <div className="col-12 col-md-5 col-lg-4">
              <div className="featured-artist-thumb">
                <img src="/songsai-music/img/bg-img/fa.jpg" alt="대표 작업 미리듣기" />
              </div>
            </div>
            <div className="col-12 col-md-7 col-lg-8">
              <div className="featured-artist-content">
                <div className="section-heading white text-left mb-30">
                  <p>지금 확인해야 할 핵심 흐름</p>
                  <h2>대표 작업 미리듣기</h2>
                </div>
                <p>songsai-music PC 버전은 단순 소개 페이지가 아니라 실제 음악 제작 흐름을 담는 작업 공간입니다.</p>
                <div className="song-play-area">
                  <div className="song-name">
                    <p>01. {selectedTrack?.title || "대표 작업 미리듣기"}</p>
                  </div>
                  {selectedTrack ? <audio controls preload="none" src={buildRecentAudioUrl(selectedTrack)} /> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="miscellaneous-area section-padding-100-0">
        <div className="container">
          <div className="row">
            <div className="col-12 col-lg-4">
              <div className="weeks-top-area mb-100">
                <div className="section-heading text-left mb-50">
                  <p>공개곡 Explore</p>
                  <h2>주간 좋아요 순위</h2>
                </div>
                {publicSongs.weekly.length > 0 ? publicSongs.weekly.map((item) => (
                  <a key={item.id} className="single-top-item d-flex songsai-home-ranked-item" href={buildArtistHref(item, "/explore?sort=weekly")}>
                    <div className="thumbnail songsai-home-thumb-with-play">
                      <img src={item.imageUrl || "/songsai-music/img/bg-img/wt1.jpg"} alt={item.title || "주간 공개곡"} />
                      <button
                        type="button"
                        className={`songsai-home-play-btn songsai-home-play-btn--overlay ${previewPlayingId === `weekly-${item.id}` ? "is-playing" : ""}`}
                        onClick={(event) => {
                          event.preventDefault();
                          handleTogglePreview(item, `weekly-${item.id}`);
                        }}
                        aria-label="미리듣기"
                      >
                        <span className="icon-play-button" />
                      </button>
                    </div>
                    <div className="content-">
                      <h6>{item.title || "제목 생성 중"}</h6>
                      <p>{`${item.artistName || "SongsAI Artist"} · 좋아요 ${item.likeCount ?? 0}`}</p>
                    </div>
                  </a>
                )) : <p className={styles.emptyListMessage}>{emptyPublicMessages.weekly}</p>}
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="new-hits-area mb-100">
                <div className="section-heading text-left mb-50">
                  <p>공개곡 Explore</p>
                  <h2>월간 좋아요 순위</h2>
                </div>
                {publicSongs.monthly.length > 0 ? publicSongs.monthly.map((item) => (
                  <div key={item.id} className="single-new-item d-flex align-items-center justify-content-between songsai-home-public-item">
                    <div className="first-part d-flex align-items-center">
                      <div className="thumbnail">
                        <img src={item.imageUrl || "/songsai-music/img/bg-img/wt7.jpg"} alt={item.title || "월간 공개곡"} />
                      </div>
                      <div className="content-">
                        <h6>{item.title || "제목 생성 중"}</h6>
                        <p>{`${item.artistName || "SongsAI Artist"} · 좋아요 ${item.likeCount ?? 0}`}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`songsai-home-play-btn ${previewPlayingId === `monthly-${item.id}` ? "is-playing" : ""}`}
                      onClick={() => handleTogglePreview(item, `monthly-${item.id}`)}
                      aria-label="미리듣기"
                    >
                      <span className="icon-play-button" />
                    </button>
                  </div>
                )) : <p className={styles.emptyListMessage}>{emptyPublicMessages.monthly}</p>}
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="popular-artists-area mb-100">
                <div className="section-heading text-left mb-50">
                  <p>공개곡 Explore</p>
                  <h2>최신 공개곡</h2>
                </div>
                {publicSongs.latest.length > 0 ? publicSongs.latest.map((item) => (
                  <a key={item.id} className="single-artists d-flex align-items-center songsai-home-latest-item" href={buildArtistHref(item, "/explore")}>
                    <div className="thumbnail songsai-home-thumb-with-play">
                      <img src={item.imageUrl || "/songsai-music/img/bg-img/pa1.jpg"} alt={item.title || "최신 공개곡"} />
                      <button
                        type="button"
                        className={`songsai-home-play-btn songsai-home-play-btn--overlay ${previewPlayingId === `latest-${item.id}` ? "is-playing" : ""}`}
                        onClick={(event) => {
                          event.preventDefault();
                          handleTogglePreview(item, `latest-${item.id}`);
                        }}
                        aria-label="미리듣기"
                      >
                        <span className="icon-play-button" />
                      </button>
                    </div>
                    <div className="content-">
                      <h6>{item.title || "제목 생성 중"}</h6>
                      <p>{`${item.artistName || "SongsAI Artist"} · ${formatShortDate(item.createdAt)}`}</p>
                    </div>
                  </a>
                )) : <p className={styles.emptyListMessage}>{emptyPublicMessages.latest}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-area section-padding-100 bg-img bg-overlay bg-fixed has-bg-img" style={{ backgroundImage: "url(/songsai-music/img/bg-img/bg-2.jpg)" }}>
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="section-heading white">
                <p>지금 확인해야 할 핵심 흐름</p>
                <h2>문의 남기기</h2>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <div className="contact-form-area">
                <form>
                  <div className="row">
                    <div className="col-md-6 col-lg-4"><div className="form-group"><input type="text" className="form-control" placeholder="이름" /></div></div>
                    <div className="col-md-6 col-lg-4"><div className="form-group"><input type="email" className="form-control" placeholder="이메일" /></div></div>
                    <div className="col-lg-4"><div className="form-group"><input type="text" className="form-control" placeholder="제목" /></div></div>
                    <div className="col-12"><div className="form-group"><textarea className="form-control" cols={30} rows={10} placeholder="메시지" /></div></div>
                    <div className="col-12 text-center">
                      <Link href="/support" className="btn songsaiMusic-btn mt-30">
                        Support로 이동 <i className="fa fa-angle-double-right" />
                      </Link>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`section-padding-100 ${styles.usageSection}`}>
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="section-heading style-2">
                <p>지금 확인해야 할 핵심 흐름</p>
                <h2>주요 활용 장면</h2>
              </div>
            </div>
          </div>
          <div className="row">
            {usageScenes.map(([title, imageUrl]) => (
              <div key={title} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="single-album">
                  <img src={imageUrl} alt={title} />
                  <div className="album-info">
                    <h5>{title}</h5>
                    <p>실제 작업 시나리오</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <audio ref={previewAudioRef} className="songsai-home-hidden-audio" preload="none" onEnded={() => setPreviewPlayingId(null)} />
    </main>
  );
}
