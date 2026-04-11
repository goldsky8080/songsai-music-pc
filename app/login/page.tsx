"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  PublicUser,
  SongsaiApiError,
  getSongsaiApiUrl,
  songsaiApiRequest,
} from "@/lib/songsai-api";

import styles from "./login-page.module.css";

type AuthMode = "login" | "signup";

type AuthPayload = {
  email: string;
  name: string;
  password: string;
};

const googleErrorMap: Record<string, string> = {
  access_denied: "Google 로그인 과정이 취소되었습니다.",
  google_state_invalid: "Google 로그인 상태 검증에 실패했습니다. 다시 시도해 주세요.",
  google_token_failed: "Google 토큰 교환에 실패했습니다.",
  google_userinfo_failed: "Google 사용자 정보를 불러오지 못했습니다.",
  google_email_not_verified: "이메일 인증이 완료된 Google 계정만 사용할 수 있습니다.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("authError");

  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AuthPayload>({
    email: "",
    name: "",
    password: "",
  });

  const googleErrorMessage = useMemo(() => {
    if (!authError) {
      return null;
    }

    return googleErrorMap[authError] ?? "로그인 중 문제가 발생했습니다. 다시 시도해 주세요.";
  }, [authError]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await songsaiApiRequest<{ user: PublicUser }>("/api/v1/me", {
          method: "GET",
        });

        if (!cancelled) {
          setUser(response.user);
          setMessage(`${response.user.email} 계정으로 로그인되어 있습니다.`);
        }
      } catch (requestError) {
        if (!cancelled && !(requestError instanceof SongsaiApiError && requestError.status === 401)) {
          setError("현재 로그인 상태를 확인하지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (googleErrorMessage) {
      setError(googleErrorMessage);
    }
  }, [googleErrorMessage]);

  function updateField<K extends keyof AuthPayload>(key: K, value: AuthPayload[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const path = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/signup";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, name: form.name || undefined };

      const response = await songsaiApiRequest<{ user: PublicUser }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setUser(response.user);
      setMessage(
        mode === "login"
          ? "로그인되었습니다. 메인 화면으로 이동합니다."
          : "회원가입이 완료되었습니다. 메인 화면으로 이동합니다.",
      );

      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "요청 처리 중 문제가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await songsaiApiRequest("/api/v1/auth/logout", {
        method: "POST",
      });

      setUser(null);
      setMessage("로그아웃되었습니다.");
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "로그아웃에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : "";
    const url = new URL(`${getSongsaiApiUrl()}/api/v1/auth/google/start`);

    if (redirectTo) {
      url.searchParams.set("redirectTo", redirectTo);
    }

    window.location.href = url.toString();
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.brandBlock}>
          <p className={styles.eyebrow}>songsai-music pc</p>
          <h1 className={styles.title}>음악 작업의 시작점을 하나로 묶는 로그인 허브</h1>
          <p className={styles.description}>
            이메일 로그인, 회원가입, Google 로그인까지 모두 공용 `songsai-api` 인증으로 연결합니다.
            이후에는 생성 이력, 자산 흐름, 작업 상태를 같은 계정 기준으로 이어갈 수 있습니다.
          </p>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>공용 인증</p>
              <p className={styles.statValue}>API 중심</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>로그인 방식</p>
              <p className={styles.statValue}>Email + Google</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>연결 대상</p>
              <p className={styles.statValue}>PC 프론트</p>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.tabs}>
            <button
              className={mode === "login" ? styles.tabActive : styles.tab}
              onClick={() => setMode("login")}
              type="button"
            >
              로그인
            </button>
            <button
              className={mode === "signup" ? styles.tabActive : styles.tab}
              onClick={() => setMode("signup")}
              type="button"
            >
              회원가입
            </button>
          </div>

          <div className={styles.panelBody}>
            <h2 className={styles.panelTitle}>{mode === "login" ? "LOGIN" : "SIGN UP"}</h2>
            <p className={styles.panelSubtitle}>
              {mode === "login"
                ? "기존 계정으로 로그인하고 작업 화면으로 바로 이어가세요."
                : "새 계정을 만든 뒤 바로 songsai-music PC 작업 공간으로 들어갈 수 있습니다."}
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <label className={styles.label}>
                  이름
                  <input
                    className={styles.input}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="이름 또는 활동명"
                    value={form.name}
                  />
                </label>
              ) : null}

              <label className={styles.label}>
                이메일
                <input
                  autoComplete="email"
                  className={styles.input}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                />
              </label>

              <label className={styles.label}>
                비밀번호
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className={styles.input}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="8자 이상 입력"
                  type="password"
                  value={form.password}
                />
              </label>

              <p className={styles.helper}>
                현재 연결 대상 API: <strong>{getSongsaiApiUrl()}</strong>
              </p>

              <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
                {isSubmitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
              </button>
            </form>

            <div className={styles.divider}>또는</div>

            <button
              className={styles.secondaryButton}
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
              type="button"
            >
              Google로 계속하기
            </button>

            {isCheckingSession ? (
              <p className={styles.message}>현재 로그인 상태를 확인하는 중입니다...</p>
            ) : null}

            {message ? <p className={styles.message}>{message}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            {user ? (
              <div className={styles.statusRow}>
                <span className={styles.statusPill}>로그인됨: {user.name || user.email}</span>
                <button className={styles.ghostButton} onClick={handleLogout} type="button">
                  로그아웃
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
