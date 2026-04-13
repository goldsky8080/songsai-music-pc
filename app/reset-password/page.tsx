"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./reset-password.module.css";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const nextPath = searchParams.get("next") || "/login";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mode = useMemo(() => (token ? "reset" : "request"), [token]);

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("이메일을 입력해 주세요.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("올바른 이메일 형식으로 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await songsaiApiRequest<{ message?: string }>("/api/v1/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });

      setMessage(response.message ?? "가입된 이메일이면 비밀번호 재설정 메일을 보냈습니다.");
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "비밀번호 재설정 메일 요청 중 문제가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!password) {
      setError("새 비밀번호를 입력해 주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (password.length > 72) {
      setError("비밀번호는 72자 이하로 입력해 주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await songsaiApiRequest<{ message?: string }>("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setMessage(response.message ?? "비밀번호가 재설정되었습니다. 다시 로그인해 주세요.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        window.location.assign(safeNextPath);
      }, 900);
    } catch (requestError) {
      setError(
        requestError instanceof SongsaiApiError
          ? requestError.message
          : "비밀번호 재설정 중 문제가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.panelBody}>
          <h1 className={styles.title}>{mode === "reset" ? "RESET PASSWORD" : "FORGOT PASSWORD"}</h1>
          <p className={styles.description}>
            {mode === "reset"
              ? "새 비밀번호를 입력하면 바로 로그인 화면으로 돌아갑니다."
              : "가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다."}
          </p>

          {mode === "request" ? (
            <form className={styles.form} onSubmit={handleRequestReset}>
              <label className={styles.label}>
                이메일
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
                {isSubmitting ? "처리 중..." : "재설정 메일 보내기"}
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleResetPassword}>
              <label className={styles.label}>
                새 비밀번호
                <input
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8자 이상 입력"
                />
              </label>

              <label className={styles.label}>
                새 비밀번호 확인
                <input
                  className={styles.input}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="같은 비밀번호를 다시 입력"
                />
              </label>

              <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
                {isSubmitting ? "처리 중..." : "비밀번호 재설정"}
              </button>
            </form>
          )}

          {message ? <p className={styles.message}>{message}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.linksRow}>
            <Link className={styles.inlineLink} href={safeNextPath as "/" | "/login"}>
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
