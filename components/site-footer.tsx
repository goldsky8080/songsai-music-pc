import styles from "./site-shell.module.css";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Studio" },
  { href: "/explore", label: "Explore" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div>
          <a href="/" className={styles.footerBrand}>
            SONGSAI-MUSIC
          </a>
          <p className={styles.footerMeta}>Copyright ©2026 All rights reserved.</p>
        </div>

        <nav className={styles.footerNav}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
