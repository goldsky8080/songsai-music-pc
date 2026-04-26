"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentCurrency, PaymentPayMethod, WindowType, requestPayment } from "@portone/browser-sdk/v2";
import { SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";
import styles from "./pricing-studio.module.css";

type CreditBalance = {
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
};

type PortonePrepareResponse = {
  paymentId: string;
  paymentOrderId: string;
  storeId: string;
  channelKey: string;
  pgProvider?: string;
  redirectUrl: string;
  noticeUrls: string[];
  orderName: string;
  totalAmount: number;
  currency: "KRW";
  bypass?: {
    galaxia?: {
      ITEM_CODE?: string;
    };
  };
  customer: {
    customerId?: string;
    fullName?: string;
    email?: string;
  };
};

const creditProducts = [
  { code: "credit_110", credits: 110, priceLabel: "₩11,000", description: "가볍게 시작하기 좋은 기본 충전 팩" },
  { code: "credit_350", credits: 350, priceLabel: "₩33,000", description: "가장 무난한 표준 충전 팩" },
  { code: "credit_590", credits: 590, priceLabel: "₩55,000", description: "자주 생성하는 사용자를 위한 확장 팩" },
] as const;

const usagePolicies = [
  "Suno 음악 생성은 현재 10 크레딧 차감 기준으로 설계되어 있습니다.",
  "ACE-Step 음악 생성은 현재 8 크레딧 차감 기준으로 설계되어 있습니다.",
  "무료 크레딧이 먼저 차감되고, 부족한 경우 유료 크레딧이 이어서 차감됩니다.",
  "결제 성공 확정은 PortOne 검증 및 webhook 기준으로 처리되며, 프론트 성공 응답만으로는 지급하지 않습니다.",
];

export function PricingStudio() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      try {
        const response = await songsaiApiRequest<CreditBalance>("/api/v1/me/balance", { method: "GET" });
        if (!cancelled) {
          setBalance(response);
        }
      } catch {
        if (!cancelled) {
          setBalance(null);
        }
      } finally {
        if (!cancelled) {
          setBalanceLoaded(true);
        }
      }
    }

    void loadBalance();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCheckout(productCode: (typeof creditProducts)[number]["code"]) {
    setLoadingCode(productCode);
    setActionError("");
    setActionMessage("");

    try {
      const prepared = await songsaiApiRequest<PortonePrepareResponse>("/api/v1/payments/portone/prepare", {
        method: "POST",
        body: JSON.stringify({ productCode }),
      });

      const paymentRequest = {
        storeId: prepared.storeId,
        paymentId: prepared.paymentId,
        orderName: prepared.orderName,
        totalAmount: prepared.totalAmount,
        currency: PaymentCurrency.KRW,
        payMethod: PaymentPayMethod.CARD,
        channelKey: prepared.channelKey,
        customer: prepared.customer,
        redirectUrl: prepared.redirectUrl,
        noticeUrls: prepared.noticeUrls,
        windowType: {
          pc: WindowType.POPUP,
          mobile: WindowType.REDIRECTION,
        },
        customData: {
          productCode,
          paymentOrderId: prepared.paymentOrderId,
        },
        bypass: prepared.bypass,
      } as unknown as Parameters<typeof requestPayment>[0];

      const paymentResult = await requestPayment(paymentRequest);

      if (!paymentResult) {
        setActionMessage("결제창이 열렸습니다. 결제가 끝나면 잔액을 다시 확인해 주세요.");
        return;
      }

      if (paymentResult.code) {
        setActionError(paymentResult.message ?? "결제가 취소되었거나 실패했습니다.");
        return;
      }

      const completed = await songsaiApiRequest<{
        paid: boolean;
        status: string;
        balance: CreditBalance;
      }>("/api/v1/payments/portone/complete", {
        method: "POST",
        body: JSON.stringify({ paymentId: paymentResult.paymentId }),
      });

      setBalance(completed.balance);
      setActionMessage(
        completed.paid
          ? "결제가 확인되어 크레딧이 지급되었습니다."
          : `결제 상태가 아직 확정되지 않았습니다. 현재 상태: ${completed.status}`,
      );
    } catch (error) {
      if (error instanceof SongsaiApiError && error.status === 401) {
        window.location.href = "/login?next=/pricing";
        return;
      }

      setActionError(error instanceof Error ? error.message : "결제 시작에 실패했습니다.");
    } finally {
      setLoadingCode(null);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.heroBlock}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>PortOne Credits</p>
            <h2 className={styles.title}>크레딧을 충전하고 음악 생성마다 안정적으로 차감하는 구조로 운영합니다.</h2>
            <p className={styles.description}>
              SongsAI Music은 PortOne 결제창과 서버 검증, webhook 기반 지급 흐름으로 확장됩니다. 지금은 국내 원화 충전형
              결제와 크레딧 차감 원장을 먼저 붙여 두는 단계입니다.
            </p>
            <div className={styles.heroBadgeRow}>
              <span className={styles.heroBadge}>PortOne Checkout</span>
              <span className={styles.heroBadge}>Server Verification</span>
              <span className={styles.heroBadge}>Ledger Based</span>
            </div>
          </div>

          <div className={styles.heroAside}>
            <div className={styles.highlightCard}>
              <p>Current Balance</p>
              <strong>{balanceLoaded ? balance?.totalCredits ?? 0 : "-"}</strong>
            </div>
            <div className={styles.highlightCard}>
              <p>Free Credits</p>
              <strong>{balanceLoaded ? balance?.freeCredits ?? 0 : "-"}</strong>
            </div>
            <div className={styles.highlightCard}>
              <p>Paid Credits</p>
              <strong>{balanceLoaded ? balance?.paidCredits ?? 0 : "-"}</strong>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Credit Packs</p>
          <h3>먼저 3개 팩으로 시작하고, 이후 구독형이나 프로모션 팩으로 확장할 수 있습니다.</h3>
        </div>
        <div className={styles.cardGrid}>
          {creditProducts.map((product) => (
            <article key={product.code} className={styles.infoCard}>
              <h4>{product.credits} Credits</h4>
              <p>{product.description}</p>
              <div className={styles.packMeta}>
                <strong>{product.priceLabel}</strong>
                <span>{product.code}</span>
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleCheckout(product.code)}
                disabled={loadingCode === product.code}
              >
                {loadingCode === product.code ? "이동 중..." : "PortOne으로 충전"}
              </button>
            </article>
          ))}
        </div>
        {actionMessage ? <p className={styles.statusSuccess}>{actionMessage}</p> : null}
        {actionError ? <p className={styles.statusError}>{actionError}</p> : null}
      </section>

      <section className={styles.dualSection}>
        <article className={styles.panel}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Usage Policy</p>
            <h3>현재 적용 예정인 차감 규칙</h3>
          </div>
          <ul className={styles.list}>
            {usagePolicies.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Next Step</p>
            <h3>다음 확장 계획</h3>
          </div>
          <ul className={styles.list}>
            <li>월 구독형 또는 정기 충전형 크레딧</li>
            <li>결제 내역과 차감 내역 조회 화면</li>
            <li>비디오 생성 차감 정책 분리</li>
            <li>관리자 수동 지급 및 조정 도구</li>
          </ul>
        </article>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCopy}>
          <p className={styles.eyebrow}>Start Here</p>
          <h3>충전 후 바로 Create로 이어져 생성 흐름을 테스트할 수 있습니다.</h3>
          <p>
            로그인 상태라면 PortOne 결제창으로 이동해 결제를 시작하고, 서버에서 결제가 확인되면 계정 잔액에 바로 반영됩니다.
          </p>
        </div>
        <div className={styles.ctaButtons}>
          <Link href="/create" className={styles.primaryButton}>
            Create로 이동
          </Link>
          <Link href="/account" className={styles.secondaryButton}>
            Account 보기
          </Link>
          <Link href="/assets" className={styles.secondaryButton}>
            My Assets 보기
          </Link>
        </div>
      </section>
    </section>
  );
}
