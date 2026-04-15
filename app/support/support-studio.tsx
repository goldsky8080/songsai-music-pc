"use client";

import { useEffect, useMemo, useState } from "react";

import { type PublicUser, SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./support-studio.module.css";

type SupportType = "account" | "billing" | "music" | "video" | "download" | "other";

type MusicItem = {
  id: string;
  title?: string | null;
  stylePrompt?: string | null;
  createdAt: string;
};

type MusicListResponse = {
  items: MusicItem[];
};

const supportTypeOptions: Array<{ value: SupportType; label: string; hint: string }> = [
  { value: "music", label: "음악 생성", hint: "생성 실패, 상태 갱신, 결과 확인 관련 문의" },
  { value: "video", label: "비디오 생성", hint: "비디오 생성, 렌더 상태, 다운로드 관련 문의" },
  { value: "download", label: "다운로드", hint: "mp3, 커버, 자막, 파일 접근 관련 문의" },
  { value: "account", label: "계정", hint: "로그인, 인증 메일, 비밀번호 재설정 관련 문의" },
  { value: "billing", label: "요금/크레딧", hint: "향후 요금제, 이용 정책, 결제 문의" },
  { value: "other", label: "기타", hint: "분류하기 어려운 운영 문의" },
];

function formatMusicLabel(item: MusicItem) {
  const title = item.title?.trim() || "제목 생성 대기 중";
  const date = new Date(item.createdAt);
  const stamp = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

  return stamp ? `${title} · ${stamp}` : title;
}

export function SupportStudio() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [musicItems, setMusicItems] = useState<MusicItem[]>([]);
  const [type, setType] = useState<SupportType>("music");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [relatedMusicId, setRelatedMusicId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await songsaiApiRequest<{ user: PublicUser }>("/api/v1/me", { cache: "no-store" });
        if (cancelled) return;

        setUser(me.user);
        setName(me.user.name ?? "");
        setEmail(me.user.email ?? "");

        const music = await songsaiApiRequest<MusicListResponse>("/api/v1/music?limit=12", { cache: "no-store" });
        if (cancelled) return;

        setMusicItems(music.items ?? []);
      } catch (loadError) {
        if (cancelled) return;

        if (loadError instanceof SongsaiApiError && loadError.status === 401) {
          setUser(null);
          setMusicItems([]);
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "지원 화면을 불러오지 못했습니다.");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTypeHint = useMemo(
    () => supportTypeOptions.find((option) => option.value === type)?.hint ?? "",
    [type],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setSubmitting(false);
      setError("이름을 입력해 주세요.");
      return;
    }

    if (!trimmedEmail) {
      setSubmitting(false);
      setError("회신받을 이메일을 입력해 주세요.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setSubmitting(false);
      setError("올바른 이메일 형식으로 입력해 주세요.");
      return;
    }

    if (!trimmedTitle) {
      setSubmitting(false);
      setError("문의 제목을 입력해 주세요.");
      return;
    }

    if (trimmedMessage.length < 10) {
      setSubmitting(false);
      setError("문의 내용을 조금 더 자세히 적어 주세요.");
      return;
    }

    try {
      const response = await songsaiApiRequest<{ message?: string }>("/api/v1/support/contact", {
        method: "POST",
        body: JSON.stringify({
          type,
          name: trimmedName,
          email: trimmedEmail,
          title: trimmedTitle,
          message: trimmedMessage,
          relatedMusicId: relatedMusicId || null,
        }),
      });

      setSuccess(response.message ?? "문의가 접수되었습니다. 운영 흐름 안에서 확인한 뒤 이어서 답변드릴게요.");
      setTitle("");
      setMessage("");
      setRelatedMusicId("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "문의 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.layout}>
        <article className={styles.formCard}>
          <div className={styles.formIntro}>
            <p className={styles.eyebrow}>SongsAI Support</p>
            <h2 className={styles.title}>작업 흐름 안에서 바로 이어지는 문의</h2>
            <p className={styles.description}>
              계정, 음악 생성, 다운로드, 비디오 생성 중 막히는 지점이 있다면 지금 상태 그대로 남겨주세요.
              SongsAI Music은 계정과 작업 이력을 기준으로 문의 흐름을 이어갈 수 있게 준비되어 있습니다.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>문의 유형</span>
                <select value={type} onChange={(event) => setType(event.target.value as SupportType)}>
                  {supportTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>{selectedTypeHint}</small>
              </label>

              <label className={styles.field}>
                <span>관련 곡</span>
                <select value={relatedMusicId} onChange={(event) => setRelatedMusicId(event.target.value)}>
                  <option value="">선택 안 함</option>
                  {musicItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatMusicLabel(item)}
                    </option>
                  ))}
                </select>
                <small>특정 곡과 연결하면 문제를 더 빠르게 확인할 수 있습니다.</small>
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>이름</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="답변받을 이름을 입력해 주세요"
                />
              </label>

              <label className={styles.field}>
                <span>회신 이메일</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>문의 제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 비디오 생성이 중간에서 멈춰 있습니다"
              />
            </label>

            <label className={styles.field}>
              <span>문의 내용</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="문제가 발생한 화면, 시점, 관련 곡, 기대한 동작을 함께 적어주시면 확인이 더 빨라집니다."
              />
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}
            {success ? <p className={styles.success}>{success}</p> : null}

            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "문의 접수 중..." : "문의 남기기"}
            </button>
          </form>
        </article>

        <aside className={styles.sidebar}>
          <article className={styles.sideCard}>
            <h3>이런 문의를 남겨주세요</h3>
            <ul>
              <li>음악 생성이 예상과 다르게 멈추거나 상태가 갱신되지 않을 때</li>
              <li>다운로드, 미리듣기, 비디오 생성이 원하는 흐름으로 이어지지 않을 때</li>
              <li>로그인, 인증 메일, 비밀번호 재설정 같은 계정 문제가 있을 때</li>
            </ul>
          </article>

          <article className={styles.sideCard}>
            <h3>접수 후 어떻게 이어지나요</h3>
            <p>
              문의는 운영 수신함으로 바로 들어가며, 필요한 경우 관련 곡과 계정 흐름을 함께 확인합니다.
              로그인 상태에서 문의하면 최근 작업 이력을 기준으로 더 빠르게 이어서 답변할 수 있습니다.
            </p>
          </article>

          <article className={styles.sideCard}>
            <h3>현재 안내</h3>
            <p>
              {user
                ? `${user.name ?? user.email} 계정 기준으로 문의 흐름을 연결합니다.`
                : "비로그인 상태에서도 문의는 가능하지만, 로그인 후 문의하면 작업 이력 연결이 더 쉬워집니다."}
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
