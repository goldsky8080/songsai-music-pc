"use client";

import { useEffect, useState } from "react";

import { type PublicUser, SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./members-studio.module.css";

type MembersResponse = {
  items: PublicUser[];
  total: number;
  limit: number;
  offset: number;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MembersStudio() {
  const [items, setItems] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      setLoading(true);
      setError(null);

      try {
        const response = await songsaiApiRequest<MembersResponse>("/api/v1/admin/users?limit=50", {
          method: "GET",
        });

        if (!cancelled) {
          setItems(response.items);
          setTotal(response.total);
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof SongsaiApiError) {
          if (requestError.status === 401) {
            window.location.assign("/login?next=/admin/members");
            return;
          }

          if (requestError.status === 403) {
            setError("관리자 또는 개발자 계정만 이 화면에 접근할 수 있습니다.");
          } else {
            setError(requestError.message);
          }
        } else {
          setError("회원 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin View</p>
          <h2 className={styles.title}>회원 목록</h2>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>전체 회원</span>
          <strong className={styles.statValue}>{total}</strong>
        </div>
      </div>

      {loading ? <p className={styles.message}>회원 목록을 불러오는 중입니다...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>역할</th>
                <th>인증</th>
                <th>가입일</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name || "-"}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>
                    <span className={item.emailVerifiedAt ? styles.badgeReady : styles.badgePending}>
                      {item.emailVerifiedAt ? "인증 완료" : "미인증"}
                    </span>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
