"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/app/admin/admin-nav";
import { buildSongsaiApiUrl, SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./inbox-studio.module.css";

type InboundEmailStatus = "NEW" | "READ" | "REPLIED" | "ARCHIVED";

type InboundAttachmentRecord = {
  id: string;
  filename: string;
  contentType?: string | null;
  size?: number | null;
  storagePath?: string | null;
  createdAt: string;
};

type InboundEmailRecord = {
  id: string;
  messageId?: string | null;
  fromEmail: string;
  fromName?: string | null;
  toEmail: string;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  receivedAt: string;
  status: InboundEmailStatus;
  createdAt: string;
  updatedAt: string;
  attachments?: InboundAttachmentRecord[];
};

type InboundEmailListResponse = {
  items: InboundEmailRecord[];
  total: number;
  limit: number;
  offset: number;
  status: InboundEmailStatus | null;
};

const statusOptions: Array<{ value: "ALL" | InboundEmailStatus; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "NEW", label: "새 메일" },
  { value: "READ", label: "읽음" },
  { value: "REPLIED", label: "답변 완료" },
  { value: "ARCHIVED", label: "보관" },
];

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getBodyPreview(item: InboundEmailRecord) {
  const raw = item.textBody || item.htmlBody || "";
  const stripped = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped || "본문이 비어 있습니다.";
}

function getDisplayName(item: InboundEmailRecord) {
  return item.fromName?.trim() || item.fromEmail;
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) {
    return "-";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentDownloadUrl(emailId: string, attachmentId: string) {
  return buildSongsaiApiUrl(
    `/api/v1/admin/inbound-emails/${emailId}/attachments/${attachmentId}`,
  ).toString();
}

export function InboxStudio() {
  const [items, setItems] = useState<InboundEmailRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InboundEmailRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | InboundEmailStatus>("ALL");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInbox() {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({ limit: "40" });

        if (statusFilter !== "ALL") {
          query.set("status", statusFilter);
        }

        const response = await songsaiApiRequest<InboundEmailListResponse>(
          `/api/v1/admin/inbound-emails?${query.toString()}`,
          { method: "GET" },
        );

        if (cancelled) {
          return;
        }

        setItems(response.items);
        setTotal(response.total);

        const nextSelectedId =
          response.items.find((item) => item.id === selectedId)?.id ??
          response.items[0]?.id ??
          null;

        setSelectedId(nextSelectedId);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof SongsaiApiError) {
          if (requestError.status === 401) {
            window.location.assign("/login?next=/admin/inbox");
            return;
          }

          if (requestError.status === 403) {
            window.location.assign("/");
            return;
          }

          setError(requestError.message);
        } else {
          setError("수신함을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInbox();

    return () => {
      cancelled = true;
    };
  }, [selectedId, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!selectedId) {
        setSelectedItem(null);
        return;
      }

      setDetailLoading(true);
      setDetailError(null);

      try {
        const detail = await songsaiApiRequest<InboundEmailRecord>(
          `/api/v1/admin/inbound-emails/${selectedId}`,
          { method: "GET" },
        );

        if (cancelled) {
          return;
        }

        setSelectedItem(detail);

        if (detail.status === "NEW") {
          const updated = await songsaiApiRequest<InboundEmailRecord>(
            `/api/v1/admin/inbound-emails/${selectedId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ status: "READ" }),
            },
          );

          if (cancelled) {
            return;
          }

          setSelectedItem(updated);
          setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof SongsaiApiError) {
          setDetailError(requestError.message);
        } else {
          setDetailError("메일 상세를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedBody = useMemo(() => {
    if (!selectedItem) {
      return "";
    }

    return selectedItem.textBody || getBodyPreview(selectedItem);
  }, [selectedItem]);

  async function updateStatus(status: InboundEmailStatus) {
    if (!selectedId) {
      return;
    }

    try {
      const updated = await songsaiApiRequest<InboundEmailRecord>(
        `/api/v1/admin/inbound-emails/${selectedId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );

      setSelectedItem(updated);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      if (requestError instanceof SongsaiApiError) {
        setDetailError(requestError.message);
      } else {
        setDetailError("상태를 변경하지 못했습니다.");
      }
    }
  }

  return (
    <section className={styles.section}>
      <AdminNav />
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin Inbox</p>
          <h2 className={styles.title}>문의 메일 수신함</h2>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>전체 메일</span>
            <strong className={styles.statValue}>{total}</strong>
          </div>
          <select
            className={styles.filter}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | InboundEmailStatus)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <p className={styles.message}>수신 메일 목록을 불러오는 중입니다...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error ? (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            {items.length === 0 ? <p className={styles.empty}>수신된 메일이 없습니다.</p> : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.listItem} ${selectedId === item.id ? styles.listItemActive : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className={styles.listItemTop}>
                  <strong className={styles.listItemName}>{getDisplayName(item)}</strong>
                  <span
                    className={`${styles.statusBadge} ${
                      item.status === "NEW" ? styles.statusNew : styles.statusMuted
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className={styles.listItemSubject}>{item.subject || "(제목 없음)"}</p>
                <p className={styles.listItemPreview}>{getBodyPreview(item)}</p>
                <span className={styles.listItemTime}>{formatDate(item.receivedAt)}</span>
              </button>
            ))}
          </aside>

          <section className={styles.detail}>
            {detailLoading ? <p className={styles.message}>메일 상세를 불러오는 중입니다...</p> : null}
            {detailError ? <p className={styles.error}>{detailError}</p> : null}

            {!detailLoading && !detailError && selectedItem ? (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <p className={styles.detailEyebrow}>Inbound Email</p>
                    <h3 className={styles.detailTitle}>{selectedItem.subject || "(제목 없음)"}</h3>
                  </div>
                  <div className={styles.detailActions}>
                    <button type="button" className={styles.secondaryButton} onClick={() => updateStatus("READ")}>
                      읽음
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={() => updateStatus("REPLIED")}>
                      답변 완료
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={() => updateStatus("ARCHIVED")}>
                      보관
                    </button>
                  </div>
                </div>

                <dl className={styles.metaGrid}>
                  <div>
                    <dt>보낸 사람</dt>
                    <dd>{getDisplayName(selectedItem)}</dd>
                  </div>
                  <div>
                    <dt>보낸 주소</dt>
                    <dd>{selectedItem.fromEmail}</dd>
                  </div>
                  <div>
                    <dt>받는 주소</dt>
                    <dd>{selectedItem.toEmail}</dd>
                  </div>
                  <div>
                    <dt>수신 시각</dt>
                    <dd>{formatDate(selectedItem.receivedAt)}</dd>
                  </div>
                  <div>
                    <dt>상태</dt>
                    <dd>{selectedItem.status}</dd>
                  </div>
                  <div>
                    <dt>메시지 ID</dt>
                    <dd>{selectedItem.messageId || "-"}</dd>
                  </div>
                </dl>

                <div className={styles.bodyCard}>
                  <pre className={styles.bodyText}>{selectedBody}</pre>
                </div>

                <div className={styles.attachmentsCard}>
                  <div className={styles.attachmentsHeader}>
                    <h4 className={styles.attachmentsTitle}>첨부파일</h4>
                    <span className={styles.attachmentsCount}>{selectedItem.attachments?.length ?? 0}개</span>
                  </div>

                  {selectedItem.attachments && selectedItem.attachments.length > 0 ? (
                    <div className={styles.attachmentsList}>
                      {selectedItem.attachments.map((attachment) => (
                        <div key={attachment.id} className={styles.attachmentItem}>
                          <div className={styles.attachmentTop}>
                            <strong className={styles.attachmentName}>{attachment.filename}</strong>
                            <a
                              className={`${styles.secondaryButton} ${styles.downloadButton}`}
                              href={getAttachmentDownloadUrl(selectedItem.id, attachment.id)}
                            >
                              다운로드
                            </a>
                          </div>
                          <div className={styles.attachmentMeta}>
                            <span>{attachment.contentType || "알 수 없는 형식"}</span>
                            <span>{formatFileSize(attachment.size)}</span>
                            <span>{attachment.storagePath ? "저장됨" : "메타데이터만 저장"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.empty}>첨부파일이 없습니다.</p>
                  )}
                </div>
              </>
            ) : null}

            {!detailLoading && !detailError && !selectedItem ? (
              <p className={styles.empty}>왼쪽 목록에서 메일을 선택해 주세요.</p>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
