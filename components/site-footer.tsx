import styles from "./site-shell.module.css";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Studio" },
  { href: "/explore", label: "Explore" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
];

const legalItems = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrandBlock}>
          <a href="/" className={styles.footerBrand}>
            SONGSAI-MUSIC
          </a>
          <p className={styles.footerMeta}>Copyright 2026 All rights reserved.</p>
          <div className={styles.footerCompany}>
            <p>상호명: SongsAI Music</p>
            <p>대표자명: 김지영</p>
            <p>사업자등록번호: 302-18-02267</p>
            <p>대표 전화: 010-0000-0000</p>
            <p>사업장 주소: 충청북도 청주시</p>
            <p>이메일: support@songsai.org</p>
          </div>
        </div>

        <div className={styles.footerLinks}>
          <nav className={styles.footerNav}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <nav className={styles.footerLegalNav}>
            {legalItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
