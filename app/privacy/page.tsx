import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import styles from "../legal/legal-studio.module.css";

export const metadata: Metadata = {
  title: "개인정보처리방침 | SongsAI Music PC",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <section className={styles.section}>
        <article className={styles.card}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Privacy Policy</p>
            <h1 className={styles.title}>개인정보처리방침</h1>
            <p className={styles.description}>
              SongsAI Music은 서비스 제공을 위해 필요한 최소한의 개인정보를 수집하며, 관련 법령에 따라 안전하게 관리합니다.
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
              <h2>1. 수집 항목</h2>
              <ul>
                <li>이메일 주소, 이름, 로그인 인증 정보</li>
                <li>결제 처리에 필요한 주문 및 거래 정보</li>
                <li>서비스 이용 기록, 접속 로그, 생성 요청 기록</li>
              </ul>
            </section>

            <section>
              <h2>2. 이용 목적</h2>
              <ul>
                <li>회원 식별 및 계정 관리</li>
                <li>음악 생성 결과 제공 및 고객 지원</li>
                <li>결제 확인, 크레딧 지급, 부정 이용 방지</li>
              </ul>
            </section>

            <section>
              <h2>3. 보관 기간</h2>
              <p>
                회사는 법령에서 정한 보관 기간 또는 이용 목적 달성 시까지 개인정보를 보관하며, 목적 달성 후에는 관련 법령에
                따라 안전하게 파기합니다.
              </p>
            </section>

            <section>
              <h2>4. 제3자 제공 및 처리 위탁</h2>
              <p>
                결제 처리, 이메일 발송, 인증 등 서비스 제공을 위해 필요한 범위에서 외부 서비스 제공자와 정보를 연동할 수
                있습니다.
              </p>
            </section>

            <section>
              <h2>5. 이용자 권리</h2>
              <p>
                이용자는 개인정보 열람, 정정, 삭제, 처리 정지 요청을 할 수 있으며, 문의는 support@songsai.org로 접수할
                수 있습니다.
              </p>
            </section>
          </div>
        </article>
      </section>
      <SiteFooter />
    </>
  );
}
