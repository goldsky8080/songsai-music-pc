"use client";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { type PublicUser, SongsaiApiError, songsaiApiRequest } from "@/lib/songsai-api";

import styles from "./site-shell.module.css";

type NavChild = {
  label: string;
  href?: string;
  action?: "logout";
};

type NavItem = {
  href: string;
  label: string;
  children?: NavChild[];
};

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
  const navItems = useMemo<NavItem[]>(() => {
    const supportChildren: NavChild[] = [{ href: "/support", label: "Support Center" }];

    if (user) {
      supportChildren.push({ href: "/account", label: "Account" });
      //supportChildren.push({ href: "/assets", label: "My Assets" });
      supportChildren.push({ label: "logOut", action: "logout" });
    } else {
      supportChildren.push({ href: "/login", label: "Login / Sign Up" });
    }

    return [
      { href: "/", label: "Home" },
      {
        href: "/create",
        label: "Studio",
        children: [
          { href: "/create", label: "Create" },
          { href: "/ace-step", label: "ACE-Step" },
          { href: "/assets", label: "My Assets" },
        ],
      },
      { href: "/explore", label: "Explore" },
      { href: "/pricing", label: "Pricing" },
      {
        href: "/support",
        label: "Support",
        children: supportChildren,
      },
    ];
  }, [user]);

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
        <a href="/" className={styles.brand}>
          SONGSAI-MUSIC
        </a>

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
                <a
                  href={item.href}
                  className={`${styles.navLink} ${isActive(pathname, item.href) ? styles.navLinkActive : ""}`}
                >
                  {item.label}
                </a>
                {item.children?.length ? (
                  <div className={styles.submenu}>
                    {item.children.map((child) => (
                      child.href ? (
                        <a
                          key={`${item.href}-${child.href}`}
                          href={child.href}
                          className={`${styles.submenuLink} ${isActive(pathname, child.href) ? styles.submenuLinkActive : ""}`}
                        >
                          {child.label}
                        </a>
                      ) : (
                        <button
                          key={`${item.href}-${child.label}`}
                          type="button"
                          className={`${styles.submenuLink} ${styles.submenuButton}`}
                          onClick={child.action === "logout" ? handleLogout : undefined}
                        >
                          {child.label}
                        </button>
                      )
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className={styles.actions}>
            <a href="/create" className={styles.createButton}>
              Create
            </a>

            {user ? (
              <div className={`${styles.navItem} ${styles.userMenuItem}`}>
                <button type="button" className={styles.userMenuButton}>
                  {authLabel}
                </button>
                <div className={`${styles.submenu} ${styles.userSubmenu}`}>
                  <a
                    href="/account"
                    className={`${styles.submenuLink} ${isActive(pathname, "/account") ? styles.submenuLinkActive : ""}`}
                  >
                    Account
                  </a>
                  <a
                    href="/assets"
                    className={`${styles.submenuLink} ${isActive(pathname, "/assets") ? styles.submenuLinkActive : ""}`}
                  >
                    My Assets
                  </a>
                  {isAdmin ? (
                    <>
                      <a
                        href="/admin/inbox"
                        className={`${styles.submenuLink} ${isActive(pathname, "/admin/inbox") ? styles.submenuLinkActive : ""}`}
                      >
                        Admin Inbox
                      </a>
                      <a
                        href="/admin/members"
                        className={`${styles.submenuLink} ${isActive(pathname, "/admin/members") ? styles.submenuLinkActive : ""}`}
                      >
                        Admin Members
                      </a>
                    </>
                  ) : null}
                  <button type="button" className={`${styles.submenuLink} ${styles.submenuButton}`} onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.auth}>
                <a href={`/login?next=${encodeURIComponent(pathname || "/")}`} className={styles.authLink}>
                  로그인
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
