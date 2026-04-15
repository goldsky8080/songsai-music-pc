"use client";

import { usePathname } from "next/navigation";

import styles from "./admin-nav.module.css";

const items = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/inbox", label: "Inbox" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin navigation">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            className={`${styles.link} ${isActive ? styles.linkActive : ""}`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
