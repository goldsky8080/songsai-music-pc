"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { type PublicUser, SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./site-shell.module.css";

type NavChild = {
  href: string;
  label: string;
};

type NavItem = {
  href: string;
  label: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  {
    href: "/create",
    label: "Studio",
    children: [
      { href: "/create", label: "Create" },
      { href: "/assets", label: "My Assets" },
    ],
  },
  {
    href: "/explore",
    label: "Explore",
    children: [
      { href: "/explore", label: "All Songs" },
      { href: "/explore?sort=weekly", label: "Weekly Chart" },
      { href: "/explore?sort=monthly", label: "Monthly Chart" },
      { href: "/explore?sort=latest", label: "Latest Public Songs" },
    ],
  },
  { href: "/pricing", label: "Pricing" },
  {
    href: "/support",
    label: "Support",
    children: [
      { href: "/support", label: "Support Center" },
      { href: "/account", label: "Account" },
      { href: "/login", label: "Login / Sign Up" },
    ],
  },
];

function normalizeHref(href: string) {
  const [pathname] = href.split("?");
  return pathname || "/";
}

function isActive(pathname: string, href: string) {
  const target = normalizeHref(href);

  if (target === "/") {
    return pathname === "/";
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await songsaiApiRequest<{ user: PublicUser }>("/api/v1/me", {
          method: "GET",
        });

        if (!cancelled) {
          setUser(response.user);
        }
      } catch (error) {
        if (!cancelled && error instanceof SongsaiApiError && error.status === 401) {
          setUser(null);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const authLabel = useMemo(() => user?.name || user?.email || "Account", [user]);
  const isAdmin = user?.role === "ADMIN";

  async function handleLogout() {
    try {
      await songsaiApiRequest("/api/v1/auth/logout", { method: "POST" });
      window.location.assign("/");
    } catch {
      window.alert("로그아웃에 실패했습니다.");
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          SONGSAI-MUSIC
        </Link>

        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`${styles.menuArea} ${menuOpen ? styles.menuAreaOpen : ""}`}>
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <div key={item.href} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive(pathname, item.href) ? styles.navLinkActive : ""}`}
                >
                  {item.label}
                </Link>
                {item.children?.length ? (
                  <div className={styles.submenu}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`${styles.submenuLink} ${isActive(pathname, child.href) ? styles.submenuLinkActive : ""}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className={styles.actions}>
            <Link href="/create" className={styles.createButton}>
              Create
            </Link>

            {user ? (
              <div className={`${styles.navItem} ${styles.userMenuItem}`}>
                <button type="button" className={styles.userMenuButton}>
                  {authLabel}
                </button>
                <div className={`${styles.submenu} ${styles.userSubmenu}`}>
                  <Link
                    href="/account"
                    className={`${styles.submenuLink} ${isActive(pathname, "/account") ? styles.submenuLinkActive : ""}`}
                  >
                    Account
                  </Link>
                  <Link
                    href="/assets"
                    className={`${styles.submenuLink} ${isActive(pathname, "/assets") ? styles.submenuLinkActive : ""}`}
                  >
                    My Assets
                  </Link>
                  {isAdmin ? (
                    <>
                      <Link
                        href="/admin/inbox"
                        className={`${styles.submenuLink} ${isActive(pathname, "/admin/inbox") ? styles.submenuLinkActive : ""}`}
                      >
                        Admin Inbox
                      </Link>
                      <Link
                        href="/admin/members"
                        className={`${styles.submenuLink} ${isActive(pathname, "/admin/members") ? styles.submenuLinkActive : ""}`}
                      >
                        Admin Members
                      </Link>
                    </>
                  ) : null}
                  <button type="button" className={`${styles.submenuLink} ${styles.submenuButton}`} onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.auth}>
                <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`} className={styles.authLink}>
                  로그인
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
