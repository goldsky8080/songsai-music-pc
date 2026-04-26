import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import styles from "../legal/legal-studio.module.css";

export const metadata: Metadata = {
  title: "이용약관 | SongsAI Music PC",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <section className={styles.section}>
        <article className={styles.card}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Terms of Service</p>
            <h1 className={styles.title}>이용약관</h1>
            <p className={styles.description}>
              본 약관은 SongsAI Music이 제공하는 AI 음악 생성 및 관련 서비스의 이용 조건과 절차, 회사와 이용자의
              권리와 의무를 규정합니다.
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
              <h2>1. 서비스 내용</h2>
              <p>
                SongsAI Music은 사용자가 입력한 프롬프트, 가사, 설정값을 바탕으로 음악과 관련 자산을 생성하고 관리할 수
                있는 서비스를 제공합니다.
              </p>
            </section>

            <section>
              <h2>2. 회원 계정</h2>
              <p>
                이용자는 정확한 정보를 바탕으로 회원가입을 해야 하며, 계정 및 인증 정보의 관리 책임은 회원 본인에게
                있습니다.
              </p>
            </section>

            <section>
              <h2>3. 크레딧 및 유료 서비스</h2>
              <ul>
                <li>유료 결제 또는 이벤트를 통해 크레딧이 지급될 수 있습니다.</li>
                <li>음악 생성, 비디오 생성 등 특정 기능은 정해진 크레딧을 차감할 수 있습니다.</li>
                <li>크레딧 차감 정책은 서비스 운영 정책에 따라 변경될 수 있습니다.</li>
              </ul>
            </section>

            <section>
              <h2>4. 이용 제한</h2>
              <p>
                타인의 권리를 침해하거나 관련 법령에 위반되는 방식으로 서비스를 이용하는 경우, 서비스 이용이 제한될 수
                있습니다.
              </p>
            </section>

            <section>
              <h2>5. 문의</h2>
              <p>서비스 이용 관련 문의는 support@songsai.org 또는 Support 페이지를 통해 접수할 수 있습니다.</p>
            </section>
          </div>
        </article>
      </section>
      <SiteFooter />
    </>
  );
}
