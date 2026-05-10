"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { type PublicUser, SongsaiApiError, buildSongsaiApiUrl, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./upload-source-studio.module.css";

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
};

type MusicListResponse = {
  items: MusicItem[];
};

type SunoUploadInitializeResponse = {
  filename: string;
  uploadUrl: string | null;
  uploadMethod: string | null;
  uploadHeaders?: Record<string, string>;
  uploadFields?: Record<string, string>;
  uploadId?: string | null;
  providerClipId?: string | null;
  providerSongId?: string | null;
  raw: Record<string, unknown>;
};

type SunoUploadFinishResponse = {
  providerClipId?: string | null;
  providerSongId?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  title?: string | null;
  status?: string | null;
  item?: MusicItem;
  raw: Record<string, unknown>;
};

type SunoUnderpaintingResponse = {
  sourceClipId: string;
  items: MusicItem[];
};

const FALLBACK_COVERS = [
  "/songsai-music/img/bg-img/e1.jpg",
  "/songsai-music/img/bg-img/e2.jpg",
  "/songsai-music/img/bg-img/e3.jpg",
  "/songsai-music/img/bg-img/e4.jpg",
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

function compactText(value?: string | null, fallback = "업로드한 음성 소스를 선택한 뒤 반주 스타일을 입혀 새 곡을 생성할 수 있습니다.") {
  if (!value) return fallback;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  return compact.length > 160 ? `${compact.slice(0, 160)}...` : compact;
}

function getCoverUrl(item: MusicItem, index: number) {
  return item.imageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length];
}

function buildPlaybackUrl(item: MusicItem) {
  if (item.mp3Url) {
    return item.mp3Url;
  }

  return buildSongsaiApiUrl(`/api/v1/music/${item.id}/download?inline=1`).toString();
}

async function uploadFileToRemoteTarget(file: File, init: SunoUploadInitializeResponse) {
  if (!init.uploadUrl) {
    throw new Error("Suno upload URL was not returned.");
  }

  const method = (init.uploadMethod || "POST").toUpperCase();

  if (init.uploadFields && Object.keys(init.uploadFields).length > 0) {
    const formData = new FormData();

    for (const [key, value] of Object.entries(init.uploadFields)) {
      formData.append(key, value);
    }

    formData.append("file", file);

    const response = await fetch(init.uploadUrl, {
      method,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Remote upload failed with status ${response.status}.`);
    }

    return;
  }

  const headers = new Headers(init.uploadHeaders ?? {});
  if (!headers.has("Content-Type") && file.type) {
    headers.set("Content-Type", file.type);
  }

  const response = await fetch(init.uploadUrl, {
    method,
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Remote upload failed with status ${response.status}.`);
  }
}

function mergeUniqueMusicItems(current: MusicItem[], incoming: MusicItem[]) {
  const seen = new Set<string>();
  const merged: MusicItem[] = [];

  for (const item of [...incoming, ...current]) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function UploadSourceStudio() {
  const router = useRouter();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [user, setUser] = useState<PublicUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sourceItems, setSourceItems] = useState<MusicItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const selectedSource = useMemo(
    () => sourceItems.find((item) => item.id === selectedSourceId) ?? null,
    [selectedSourceId, sourceItems],
  );

  async function loadSourceItems() {
    const response = await songsaiApiRequest<MusicListResponse>("/api/v1/music?provider=suno_upload&limit=24&offset=0");
    setSourceItems(response.items);
    setSelectedSourceId((current) => current ?? response.items[0]?.id ?? null);
    return response.items;
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const response = await songsaiApiRequest<{ user: PublicUser }>("/api/v1/me", {
          method: "GET",
        });

        if (cancelled) {
          return;
        }

        setUser(response.user);
        await loadSourceItems();
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof SongsaiApiError && requestError.status === 401) {
          router.replace("/login?next=/upload-source");
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "무반주 업로드 화면을 준비하는 중 문제가 발생했습니다.",
        );
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  async function handleUpload() {
    if (!selectedFile) {
      setError("먼저 업로드할 무반주 오디오 파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const initialized = await songsaiApiRequest<SunoUploadInitializeResponse>("/api/v1/suno/uploads/initialize", {
        method: "POST",
        body: JSON.stringify({
          filename: selectedFile.name,
        }),
      });

      await uploadFileToRemoteTarget(selectedFile, initialized);

      const finished = await songsaiApiRequest<SunoUploadFinishResponse>("/api/v1/suno/uploads/finish", {
        method: "POST",
        body: JSON.stringify({
          filename: selectedFile.name,
          uploadId: initialized.uploadId,
          initializeResponse: initialized.raw,
        }),
      });

      if (finished.item) {
        setSourceItems((current) => mergeUniqueMusicItems(current, [finished.item!]));
        setSelectedSourceId(finished.item.id);
      } else {
        const loaded = await loadSourceItems();
        setSelectedSourceId(loaded[0]?.id ?? null);
      }

      setSelectedFile(null);
      setMessage(`업로드가 완료되었습니다. ${finished.title || selectedFile.name} 소스가 내 목록에 추가되었습니다.`);
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "무반주 파일 업로드에 실패했습니다.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCreateUnderpainting() {
    const sourceClipId = selectedSource?.providerTaskId?.trim();

    if (!selectedSource || !sourceClipId) {
      setError("반주를 입힐 업로드 소스를 먼저 선택해주세요.");
      return;
    }

    if (!lyrics.trim() || !stylePrompt.trim()) {
      setError("가사와 반주 스타일 프롬프트를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await songsaiApiRequest<SunoUnderpaintingResponse>("/api/v1/suno/underpainting", {
        method: "POST",
        body: JSON.stringify({
          sourceClipId,
          title: title.trim() || undefined,
          lyrics: lyrics.trim(),
          stylePrompt: stylePrompt.trim(),
        }),
      });

      const createdIds = response.items.map((item) => item.id).join(", ");
      setMessage(`배경음악 추가 요청이 완료되었습니다. 생성된 곡 id: ${createdIds || "-"}`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "배경음악 추가 요청에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
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

  if (isCheckingSession) {
    return <div className={styles.loading}>무반주 업로드 화면을 준비하는 중입니다...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <section className={styles.section}>
      <audio ref={previewAudioRef} hidden onEnded={() => setPlayingItemId(null)} />

      <article className={styles.introCard}>
        <p className={styles.eyebrow}>Suno Vocal Upload</p>
        <h1 className={styles.introTitle}>무반주 소스를 업로드하고 배경음악을 입혀 새 곡으로 확장하세요.</h1>
        <p className={styles.introText}>
          무반주 오디오를 Suno 업로드 흐름으로 먼저 등록한 뒤, 내 업로드 소스 목록에서 선택해서 반주와 편곡을 덧입히는
          작업 전용 화면입니다.
        </p>
        <div className={styles.heroMeta}>
          <span className={styles.heroChip}>Upload to Suno</span>
          <span className={styles.heroChip}>Source Saved to My Music</span>
          <span className={styles.heroChip}>Underpainting Ready</span>
        </div>
      </article>

      <div className={styles.layout}>
        <article className={styles.panelCard}>
          <h2 className={styles.blockTitle}>무반주 업로드</h2>
          <p className={styles.blockText}>
            mp3, wav, m4a 같은 보컬 중심 파일을 업로드하면 내 소스 목록에 저장되고, 이후 선택해서 배경음악을 입힐 수 있습니다.
          </p>

          <label className={styles.fieldLabel}>
            업로드할 오디오 파일
            <input
              className={styles.fileInput}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void handleUpload()}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? "업로드 중..." : "무반주 파일 업로드"}
            </button>
            <a href="/create" className={styles.secondaryLink}>
              일반 곡 생성으로 이동
            </a>
          </div>

          {message ? <div className={styles.message}>{message}</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
        </article>

        <article className={styles.panelCard}>
          <h2 className={styles.blockTitle}>배경음악 추가</h2>
          <p className={styles.blockText}>
            업로드된 소스를 선택한 뒤 가사와 스타일 프롬프트를 입력하면 해당 보컬에 맞춘 반주 생성 요청을 보냅니다.
          </p>

          <div className={styles.selectedBox}>
            <span className={styles.selectedLabel}>선택된 소스</span>
            <strong>{selectedSource?.title || "아직 선택된 소스가 없습니다."}</strong>
            <p>{selectedSource ? compactText(selectedSource.tags || selectedSource.stylePrompt) : "왼쪽 목록에서 업로드된 소스를 선택해주세요."}</p>
          </div>

          <label className={styles.fieldLabel}>
            새 곡 제목
            <input
              className={styles.textInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 불효는 웁니다.. (Add Instrumental)"
            />
          </label>

          <label className={styles.fieldLabel}>
            가사
            <textarea
              className={styles.textArea}
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder="업로드한 보컬에 맞춘 가사나 구조를 입력하세요."
            />
          </label>

          <label className={styles.fieldLabel}>
            반주 스타일 프롬프트
            <textarea
              className={styles.textArea}
              value={stylePrompt}
              onChange={(event) => setStylePrompt(event.target.value)}
              placeholder="예: nostalgic trot, accordion lead, warm upright bass, brushed snare, bittersweet mood"
            />
          </label>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void handleCreateUnderpainting()}
              disabled={isSubmitting || !selectedSource}
            >
              {isSubmitting ? "배경음악 생성 요청 중..." : "선택한 소스에 배경음악 입히기"}
            </button>
          </div>
        </article>
      </div>

      <article className={styles.listCard}>
        <div className={styles.listHeader}>
          <div>
            <p className={styles.eyebrow}>My Uploaded Sources</p>
            <h2 className={styles.blockTitle}>내 무반주 소스 목록</h2>
            <p className={styles.blockText}>업로드가 끝난 소스는 이 목록에 쌓이고, 클릭해서 바로 반주 추가 대상으로 선택할 수 있습니다.</p>
          </div>
        </div>

        {sourceItems.length > 0 ? (
          <div className={styles.sourceGrid}>
            {sourceItems.map((item, index) => {
              const selected = item.id === selectedSourceId;
              return (
                <article
                  key={item.id}
                  className={`${styles.sourceCard} ${selected ? styles.sourceCardSelected : ""}`}
                  onClick={() => setSelectedSourceId(item.id)}
                >
                  <div className={styles.sourceMedia}>
                    <img
                      src={getCoverUrl(item, index)}
                      alt={item.title || "uploaded source cover"}
                      className={styles.sourceImage}
                    />
                    <button
                      type="button"
                      className={styles.previewButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePreviewToggle(item);
                      }}
                      aria-label={playingItemId === item.id ? "Pause source preview" : "Play source preview"}
                    >
                      {playingItemId === item.id ? "❚❚" : "▷"}
                    </button>
                  </div>
                  <div className={styles.sourceBody}>
                    <strong className={styles.sourceTitle}>{item.title || "Untitled Upload"}</strong>
                    <span className={styles.sourceMeta}>{formatDate(item.createdAt)}</span>
                    <p className={styles.sourceText}>{compactText(item.tags || item.stylePrompt || item.lyrics)}</p>
                    <div className={styles.sourceFooter}>
                      <span className={styles.sourceBadge}>{item.status}</span>
                      <span className={styles.sourceClip}>clip id: {item.providerTaskId || "-"}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>아직 업로드된 소스가 없습니다.</strong>
            <p>위 업로드 영역에서 무반주 오디오를 등록하면 이 목록에 바로 추가됩니다.</p>
          </div>
        )}
      </article>
    </section>
  );
}
