"use client";

import { useEffect, useState } from "react";
import { SongsaiApiError, getSongsaiApiUrl, songsaiApiRequest } from "@/lib/songsai-api";

type MusicItem = {
  id: string;
  title: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  imageUrl?: string | null;
  mp3Url?: string | null;
  providerTaskId?: string | null;
  errorMessage?: string | null;
};

type RecentMusicResponse = {
  items: MusicItem[];
  meta: {
    limit: number;
    fetchedAt: string;
  };
};

type MusicListResponse = {
  items: MusicItem[];
};

type CreateMusicResponse = {
  item: MusicItem;
};

type WorkerRunResponse = {
  workerId: string;
  claimed: {
    generation: number;
    poll: number;
  };
};

export default function MusicTestPage() {
  const [stylePrompt, setStylePrompt] = useState("cinematic korean ballad, piano, emotional, male vocal");
  const [title, setTitle] = useState("테스트 곡");
  const [lyrics, setLyrics] = useState("이 밤이 지나가면 새로운 하루가 와");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [recentItems, setRecentItems] = useState<MusicItem[]>([]);
  const [myItems, setMyItems] = useState<MusicItem[]>([]);

  async function loadData() {
    setError(null);

    try {
      const recent = await songsaiApiRequest<RecentMusicResponse>("/api/v1/music/recent?limit=10");
      setRecentItems(recent.items);
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? `최근 완료곡 조회 실패: ${requestError.message}`
          : "최근 완료곡 조회 중 문제가 발생했습니다.",
      );
    }

    try {
      const mine = await songsaiApiRequest<MusicListResponse>("/api/v1/music?limit=10");
      setMyItems(mine.items);
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? `내 음악 목록 조회 실패: ${requestError.message}`
          : "내 음악 목록 조회 중 문제가 발생했습니다.",
      );
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate() {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await songsaiApiRequest<CreateMusicResponse>("/api/v1/music", {
        method: "POST",
        body: JSON.stringify({
          title,
          lyrics,
          stylePrompt,
          lyricMode: "manual",
          isMr: false,
          vocalGender: "auto",
          trackCount: 1,
          modelVersion: "v5_5",
        }),
      });

      setMessage(`생성 요청 저장 완료: ${response.item.title} (${response.item.status})`);
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "생성 요청 중 문제가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRunWorker() {
    setIsRunningWorker(true);
    setMessage(null);
    setError(null);

    try {
      const response = await songsaiApiRequest<WorkerRunResponse>("/api/v1/jobs/run", {
        method: "POST",
      });

      setMessage(
        `worker 실행 완료: generation ${response.claimed.generation}개, poll ${response.claimed.poll}개`,
      );
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "worker 실행 중 문제가 발생했습니다.",
      );
    } finally {
      setIsRunningWorker(false);
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 24 }}>
        <section>
          <p style={{ marginBottom: 8, color: "#666" }}>songsai-api 로컬 테스트</p>
          <h1 style={{ margin: 0 }}>Music API 테스트 패널</h1>
          <p style={{ marginTop: 8 }}>
            현재 연결 대상 API: <strong>{getSongsaiApiUrl()}</strong>
          </p>
        </section>

        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 16,
            padding: 24,
            display: "grid",
            gap: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ margin: 0 }}>생성 요청 테스트</h2>

          <label style={{ display: "grid", gap: 8 }}>
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            스타일
            <input value={stylePrompt} onChange={(event) => setStylePrompt(event.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            가사
            <textarea rows={5} value={lyrics} onChange={(event) => setLyrics(event.target.value)} />
          </label>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={handleCreate} disabled={isSubmitting || isRunningWorker}>
              {isSubmitting ? "생성 요청 중..." : "POST /api/v1/music"}
            </button>
            <button onClick={handleRunWorker} disabled={isSubmitting || isRunningWorker}>
              {isRunningWorker ? "worker 실행 중..." : "POST /api/v1/jobs/run"}
            </button>
            <button onClick={() => void loadData()} disabled={isSubmitting || isRunningWorker}>
              목록 새로고침
            </button>
          </div>

          {message ? <p style={{ color: "#0a7a2f", margin: 0 }}>{message}</p> : null}
          {error ? <p style={{ color: "#c62828", margin: 0 }}>{error}</p> : null}
        </section>

        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          <article style={{ border: "1px solid #ddd", borderRadius: 16, padding: 24, background: "#fff" }}>
            <h2 style={{ marginTop: 0 }}>최근 완료곡</h2>
            <p style={{ color: "#666" }}>GET /api/v1/music/recent?limit=10</p>
            <ul style={{ display: "grid", gap: 12, paddingLeft: 18 }}>
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong> · {item.status}
                    <br />
                    <small>{item.createdAt}</small>
                  </li>
                ))
              ) : (
                <li>아직 완료곡이 없습니다.</li>
              )}
            </ul>
          </article>

          <article style={{ border: "1px solid #ddd", borderRadius: 16, padding: 24, background: "#fff" }}>
            <h2 style={{ marginTop: 0 }}>내 음악 목록</h2>
            <p style={{ color: "#666" }}>GET /api/v1/music?limit=10</p>
            <ul style={{ display: "grid", gap: 12, paddingLeft: 18 }}>
              {myItems.length > 0 ? (
                myItems.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong> · {item.status}
                    <br />
                    <small>{item.providerTaskId || item.id}</small>
                    {item.errorMessage ? (
                      <>
                        <br />
                        <small style={{ color: "#c62828" }}>{item.errorMessage}</small>
                      </>
                    ) : null}
                  </li>
                ))
              ) : (
                <li>아직 저장된 내 음악이 없습니다.</li>
              )}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
