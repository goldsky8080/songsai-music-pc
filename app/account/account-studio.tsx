"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { type PublicUser, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./account-studio.module.css";

type AccountSummary = {
  musicCount: number;
  videoCount: number;
  supportCount: number;
  latestActivityAt: string | null;
  joinedAt: string;
};

type InquiryItem = {
  id: string;
  subject?: string | null;
  preview: string;
  status: "NEW" | "READ" | "REPLIED" | "ARCHIVED";
  receivedAt: string;
};

type InquiryResponse = {
  items: InquiryItem[];
};

type AccountStudioProps = {
  initialUser: PublicUser;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleLabel(role: PublicUser["role"]) {
  if (role === "ADMIN") return "관리자";
  if (role === "DEVELOPER") return "개발자";
  return "사용자";
}

function getInquiryStatusLabel(status: InquiryItem["status"]) {
  switch (status) {
    case "NEW":
      return "접수됨";
    case "READ":
      return "확인 중";
    case "REPLIED":
      return "답변 완료";
    case "ARCHIVED":
      return "보관";
    default:
      return status;
  }
}

export function AccountStudio({ initialUser }: AccountStudioProps) {
  const [user, setUser] = useState(initialUser);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [inquiriesLoaded, setInquiriesLoaded] = useState(false);
  const [name, setName] = useState(initialUser.name ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryResponse, inquiryResponse] = await Promise.all([
          songsaiApiRequest<AccountSummary>("/api/v1/account/summary", { method: "GET" }),
          songsaiApiRequest<InquiryResponse>("/api/v1/account/inquiries", { method: "GET" }),
        ]);

        if (!cancelled) {
          setSummary(summaryResponse);
          setInquiries(inquiryResponse.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
          setInquiries([]);
        }
      } finally {
        if (!cancelled) {
          setSummaryLoaded(true);
          setInquiriesLoaded(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const roleLabel = useMemo(() => getRoleLabel(user.role), [user.role]);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSavingProfile(false);
      setProfileError("이름을 입력해 주세요.");
      return;
    }

    try {
      const response = await songsaiApiRequest<{ user: PublicUser; message?: string }>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });

      setUser(response.user);
      setName(response.user.name ?? trimmedName);
      setProfileMessage(response.message ?? "프로필이 업데이트되었습니다.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "프로필 저장에 실패했습니다.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword) {
      setSavingPassword(false);
      setPasswordError("현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (newPassword.length < 8) {
      setSavingPassword(false);
      setPasswordError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    try {
      const response = await songsaiApiRequest<{ message?: string }>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage(response.message ?? "비밀번호가 변경되었습니다.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.layout}>
        <article className={styles.primaryCard}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>My Account</p>
            <h2 className={styles.title}>계정 정보와 보안 상태를 한곳에 모았습니다</h2>
            <p className={styles.description}>
              SongsAI Music은 계정 기준으로 생성 이력, 자산, 문의 흐름을 이어갑니다. 여기서 이름과 보안 상태를
              확인하고 바로 다음 작업으로 이동할 수 있습니다.
            </p>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoTile}>
              <span>이메일</span>
              <strong>{user.email}</strong>
            </div>
            <div className={styles.infoTile}>
              <span>역할</span>
              <strong>{roleLabel}</strong>
            </div>
            <div className={styles.infoTile}>
              <span>인증 상태</span>
              <strong>{user.emailVerifiedAt ? "이메일 인증 완료" : "이메일 인증 대기"}</strong>
            </div>
            <div className={styles.infoTile}>
              <span>가입일</span>
              <strong>{formatDate(summary?.joinedAt ?? user.createdAt ?? null)}</strong>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <h3>프로필</h3>
          <form className={styles.form} onSubmit={handleProfileSubmit}>
            <label className={styles.field}>
              <span>이름</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="이름을 입력해 주세요" />
            </label>

            {profileError ? <p className={styles.error}>{profileError}</p> : null}
            {profileMessage ? <p className={styles.success}>{profileMessage}</p> : null}

            <button className={styles.button} type="submit" disabled={savingProfile}>
              {savingProfile ? "저장 중..." : "프로필 저장"}
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <h3>보안</h3>
          <form className={styles.form} onSubmit={handlePasswordSubmit}>
            <label className={styles.field}>
              <span>현재 비밀번호</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="현재 비밀번호"
              />
            </label>
            <label className={styles.field}>
              <span>새 비밀번호</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="8자 이상 입력"
              />
            </label>

            {!user.emailVerifiedAt ? (
              <p className={styles.notice}>이메일 인증이 아직 완료되지 않았다면 로그인 화면에서 인증 메일을 다시 보낼 수 있습니다.</p>
            ) : null}

            {passwordError ? <p className={styles.error}>{passwordError}</p> : null}
            {passwordMessage ? <p className={styles.success}>{passwordMessage}</p> : null}

            <button className={styles.button} type="submit" disabled={savingPassword}>
              {savingPassword ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <h3>작업 요약</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryTile}>
              <span>생성한 곡</span>
              <strong>{summary?.musicCount ?? 0}</strong>
            </div>
            <div className={styles.summaryTile}>
              <span>생성한 비디오</span>
              <strong>{summary?.videoCount ?? 0}</strong>
            </div>
            <div className={styles.summaryTile}>
              <span>문의 수</span>
              <strong>{summary?.supportCount ?? 0}</strong>
            </div>
            <div className={styles.summaryTile}>
              <span>최근 작업</span>
              <strong>{summaryLoaded ? formatDate(summary?.latestActivityAt ?? null) : "불러오는 중"}</strong>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <h3>문의 내역</h3>
          <div className={styles.inquiryList}>
            {inquiriesLoaded && inquiries.length === 0 ? (
              <p className={styles.empty}>아직 남긴 문의가 없습니다. 문제가 생기면 Support에서 바로 문의를 남길 수 있습니다.</p>
            ) : null}

            {!inquiriesLoaded ? <p className={styles.empty}>문의 내역을 불러오는 중입니다.</p> : null}

            {inquiries.map((item) => (
              <article key={item.id} className={styles.inquiryCard}>
                <div className={styles.inquiryMeta}>
                  <span className={styles.inquiryStatus}>{getInquiryStatusLabel(item.status)}</span>
                  <span>{formatDate(item.receivedAt)}</span>
                </div>
                <h4>{item.subject?.trim() || "제목 없는 문의"}</h4>
                <p>{item.preview?.trim() || "문의 내용이 아직 정리되지 않았습니다."}</p>
              </article>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <h3>빠른 이동</h3>
          <div className={styles.linkGrid}>
            <Link href="/create" className={styles.linkButton}>
              Create로 이동
            </Link>
            <Link href="/assets" className={styles.linkButton}>
              My Assets 보기
            </Link>
            <Link href="/support" className={styles.linkButton}>
              Support 문의하기
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
