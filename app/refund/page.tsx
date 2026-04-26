import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import styles from "../legal/legal-studio.module.css";

export const metadata: Metadata = {
  title: "환불정책 | SongsAI Music PC",
};

export default function RefundPage() {
  return (
    <>
      <SiteHeader />
      <section className={styles.section}>
        <article className={styles.card}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Refund Policy</p>
            <h1 className={styles.title}>환불정책</h1>
            <p className={styles.description}>
              SongsAI Music의 크레딧 충전 및 디지털 서비스 이용과 관련한 환불 기준은 아래 정책에 따릅니다.
            </p>
          </header>

          <div className={styles.businessBlock}>
            <p>상호명: SongsAI Music</p>
            <p>대표자명: 김지영</p>
            <p>사업자등록번호: 302-18-02267</p>
            <p>대표 전화: 010-0000-0000</p>
            <p>사업장 주소: 충청북도 청주시</p>
            <p>이메일: support@songsai.org</p>
          </div>

          <div className={styles.content}>
            <section>
              <h2>1. 크레딧 충전</h2>
              <p>
                크레딧은 디지털 형태의 사용권으로 제공되며, 결제 완료 후 계정에 지급됩니다. 지급 내역은 계정 및 결제
                기록에서 확인할 수 있습니다.
              </p>
            </section>

            <section>
              <h2>2. 환불 가능 기준</h2>
              <ul>
                <li>결제 오류 또는 중복 결제가 확인된 경우</li>
                <li>충전된 크레딧이 전혀 사용되지 않은 상태에서 환불 요청이 접수된 경우</li>
                <li>관련 법령상 청약철회 또는 환불이 허용되는 경우</li>
              </ul>
            </section>

            <section>
              <h2>3. 환불 제한 기준</h2>
              <ul>
                <li>충전된 크레딧의 전부 또는 일부가 이미 사용된 경우</li>
                <li>이용자의 단순 변심으로 디지털 서비스 사용이 개시된 경우</li>
                <li>약관 또는 운영 정책 위반으로 이용이 제한된 경우</li>
              </ul>
            </section>

            <section>
              <h2>4. 환불 요청 방법</h2>
              <p>
                환불 문의는 support@songsai.org 또는 Support 페이지를 통해 접수할 수 있으며, 주문번호와 계정 정보를 함께
                제공해 주셔야 확인이 빠릅니다.
              </p>
            </section>

            <section>
              <h2>5. 처리 기간</h2>
              <p>
                환불 승인 후 실제 결제 취소 및 카드사 반영까지는 결제 수단 및 PG사 정책에 따라 영업일 기준 수일이 소요될 수
                있습니다.
              </p>
            </section>
          </div>
        </article>
      </section>
      <SiteFooter />
    </>
  );
}
