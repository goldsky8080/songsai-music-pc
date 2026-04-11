import Script from "next/script";

export function VendorScripts() {
  const songsaiApiUrl =
    process.env.NEXT_PUBLIC_SONGSAI_API_URL?.replace(/\/$/, "") ??
    "https://api.songsai.org";
  const authUiScript = `
    (() => {
      const apiBase = ${JSON.stringify(songsaiApiUrl)};

      function getDisplayName(user) {
        if (!user) return "";
        return user.name || user.email || "내 계정";
      }

      async function syncHeaderAuth() {
        const loginButton = document.getElementById("loginBtn");
        if (!loginButton) return;

        try {
          const response = await fetch(apiBase + "/api/v1/me", {
            credentials: "include",
            headers: { Accept: "application/json" }
          });

          if (!response.ok) return;

          const payload = await response.json();
          if (!payload || !payload.user) return;

          const displayName = getDisplayName(payload.user);
          loginButton.textContent = displayName;
          loginButton.setAttribute("href", "/login");
          loginButton.setAttribute("title", displayName);
          loginButton.classList.add("auth-user-link");
        } catch (error) {
          console.warn("Failed to sync auth header", error);
        }
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncHeaderAuth, { once: true });
      } else {
        syncHeaderAuth();
      }
    })();
  `;

  return (
    <>
      <Script
        src="/songsai-music/js/jquery/jquery-2.2.4.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/songsai-music/js/bootstrap/popper.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/songsai-music/js/bootstrap/bootstrap.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/songsai-music/js/plugins/plugins.js"
        strategy="afterInteractive"
      />
      <Script src="/songsai-music/js/active.js" strategy="afterInteractive" />
      <Script id="songsai-auth-ui" strategy="afterInteractive">
        {authUiScript}
      </Script>
    </>
  );
}
