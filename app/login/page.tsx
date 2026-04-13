"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  type PublicUser,
  SongsaiApiError,
  buildSongsaiApiUrl,
  songsaiApiRequest,
} from "@/lib/songsai-api";

import styles from "./login-page.module.css";

type AuthMode = "login" | "signup";

type AuthPayload = {
  email: string;
  name: string;
  password: string;
};

type SignupResponse = {
  user: PublicUser;
  requiresEmailVerification?: boolean;
  message?: string;
  verificationExpiresAt?: string;
};

const googleErrorMap: Record<string, string> = {
  access_denied: "Google 로그인이 취소되었습니다.",
  google_state_invalid: "Google 로그인 상태 확인에 실패했습니다. 다시 시도해 주세요.",
  google_token_failed: "Google 인증 토큰 교환에 실패했습니다.",
  google_userinfo_failed: "Google 사용자 정보를 불러오지 못했습니다.",
  google_email_not_verified: "이메일 인증이 완료된 Google 계정만 사용할 수 있습니다.",
};

const verifyMessageMap: Record<string, string> = {
  success: "이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.",
  invalid: "인증 링크가 올바르지 않습니다.",
  expired: "인증 링크가 만료되었습니다. 다시 회원가입하거나 인증 메일을 재요청해 주세요.",
  used: "이미 사용된 인증 링크입니다. 로그인해 주세요.",
};

function validateForm(mode: AuthMode, form: AuthPayload) {
  const trimmedEmail = form.email.trim();
  const trimmedName = form.name.trim();

  if (!trimmedEmail) {
    return "이메일을 입력해 주세요.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return "올바른 이메일 형식으로 입력해 주세요.";
  }

  if (!form.password) {
    return "비밀번호를 입력해 주세요.";
  }

  if (form.password.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }

  if (form.password.length > 72) {
    return "비밀번호는 72자 이하로 입력해 주세요.";
  }

  if (mode === "signup" && !trimmedName) {
    return "회원가입 시 이름을 입력해 주세요.";
  }

  return null;
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("authError");
  const verify = searchParams.get("verify");
  const nextPath = searchParams.get("next") || "/";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";

  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
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

    return googleErrorMap[authError] ?? "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.";
  }, [authError]);

  const verifyMessage = useMemo(() => {
    if (!verify) {
      return null;
    }

    return verifyMessageMap[verify] ?? null;
  }, [verify]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await songsaiApiRequest<{ user: PublicUser }>("/api/v1/me", {
          method: "GET",
        });

        if (!cancelled) {
          setUser(response.user);
          setMessage(`${response.user.name || response.user.email} 계정으로 로그인되어 있습니다.`);
        }
      } catch (requestError) {
        if (!cancelled) {
          if (requestError instanceof SongsaiApiError && requestError.status === 401) {
            setUser(null);
          } else {
            setError(
              requestError instanceof Error
                ? requestError.message
                : "현재 로그인 상태를 확인하지 못했습니다.",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (googleErrorMessage) {
      setError(googleErrorMessage);
    }
  }, [googleErrorMessage]);

  useEffect(() => {
    if (verifyMessage) {
      setMessage(verifyMessage);
      if (verify === "success") {
        setMode("login");
      }
    }
  }, [verify, verifyMessage]);

  function updateField<K extends keyof AuthPayload>(key: K, value: AuthPayload[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationMessage = validateForm(mode, form);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const path = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/signup";
      const payload =
        mode === "login"
          ? { email: form.email.trim(), password: form.password }
          : { email: form.email.trim(), password: form.password, name: form.name.trim() || undefined };

      const response = await songsaiApiRequest<SignupResponse>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setUser(response.user);
      if (mode === "signup" && response.requiresEmailVerification) {
        setUser(null);
        setMode("login");
        setMessage("인증 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.");
        setForm((current) => ({
          ...current,
          password: "",
        }));
        return;
      }

      setMessage("로그인되었습니다.");

      window.setTimeout(() => {
        window.location.assign(safeNextPath);
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

  async function handleResendVerification() {
    if (!form.email.trim()) {
      setError("이메일을 먼저 입력해 주세요.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("올바른 이메일 형식으로 입력해 주세요.");
      return;
    }

    setIsResendingVerification(true);
    setError(null);
    setMessage(null);

    try {
      const response = await songsaiApiRequest<{ message?: string }>("/api/v1/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: form.email.trim() }),
      });

      setMessage(response.message ?? "가입된 미인증 계정이면 인증 메일을 다시 보냈습니다.");
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "인증 메일 재발송 중 문제가 발생했습니다.",
      );
    } finally {
      setIsResendingVerification(false);
    }
  }

  function handleGoogleLogin() {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildSongsaiApiUrl("/api/v1/auth/google/start");

    if (redirectTo) {
      url.searchParams.set("redirectTo", redirectTo);
    }

    if (safeNextPath) {
      url.searchParams.set("next", safeNextPath);
    }

    window.location.href = url.toString();
  }

  return (
    <main className={styles.page}>
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
          <button
            className={styles.tab}
            disabled={isSubmitting}
            onClick={handleGoogleLogin}
            type="button"
          >
            Google 로그인
          </button>
        </div>

        <div className={styles.panelBody}>
          <h1 className={styles.panelTitle}>{mode === "login" ? "LOGIN" : "SIGN UP"}</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className={styles.label}>
                이름
                <input
                  className={styles.input}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="이름 또는 표시명"
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

            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
            </button>
          </form>

          {mode === "login" && !user ? (
            <div className={styles.linksRow}>
              <Link className={styles.inlineLink} href={`/reset-password?next=${encodeURIComponent(safeNextPath)}`}>
                비밀번호 재설정
              </Link>
              <button
                className={styles.inlineButton}
                disabled={isResendingVerification || isSubmitting}
                onClick={handleResendVerification}
                type="button"
              >
                {isResendingVerification ? "인증 메일 전송 중..." : "인증 메일 다시 보내기"}
              </button>
            </div>
          ) : null}

          {isCheckingSession ? <p className={styles.message}>현재 로그인 상태를 확인하는 중입니다...</p> : null}
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
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
