import Script from "next/script";

export function VendorScripts() {
  const songsaiApiUrl =
    process.env.NEXT_PUBLIC_SONGSAI_API_URL?.replace(/\/$/, "") ??
    "https://api.songsai.org";

  const uiScript = `
    (() => {
      const configuredApiBase = ${JSON.stringify(songsaiApiUrl)};
      const navItems = [
        { label: "Home", tooltip: "홈", href: "/" },
        { label: "Create", tooltip: "AI 생성", href: "/create" },
        { label: "My Assets", tooltip: "내 자산", href: "/assets" },
        { label: "Pricing", tooltip: "구독/충전", href: "/pricing" },
        { label: "Support", tooltip: "고객지원", href: "/support" },
      ];
      function getApiBase() {
        return window.location.hostname === "localhost"
          ? "/api/proxy"
          : configuredApiBase;
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function getDisplayName(user) {
        if (!user) return "";
        return user.name || user.email || "계정";
      }

      function formatCreatedAt(value) {
        if (!value) return "방금 생성됨";

        try {
          return new Intl.DateTimeFormat("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(value));
        } catch (error) {
          return value;
        }
      }

      function formatDownloadAt(value) {
        if (!value) return "다운로드 준비 중";

        try {
          return new Intl.DateTimeFormat("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(value));
        } catch (error) {
          return value;
        }
      }

      function formatStatusLabel(status) {
        switch (status) {
          case "completed":
            return "완료";
          case "processing":
            return "생성 중";
          case "failed":
            return "실패";
          case "queued":
          default:
            return "대기 중";
        }
      }

      function getFallbackCover(index) {
        const covers = [
          "/songsai-music/img/bg-img/a1.jpg",
          "/songsai-music/img/bg-img/a2.jpg",
          "/songsai-music/img/bg-img/a3.jpg",
          "/songsai-music/img/bg-img/a4.jpg",
          "/songsai-music/img/bg-img/a5.jpg",
          "/songsai-music/img/bg-img/a6.jpg",
        ];

        return covers[index % covers.length];
      }

      function getPreviewLyrics(value) {
        if (!value) return "가사 일부가 준비되면 여기에 표시됩니다.";

        const compact = String(value).replace(/\\s+/g, " ").trim();
        if (!compact) return "가사 일부가 준비되면 여기에 표시됩니다.";
        if (compact.length <= 90) return compact;
        return compact.slice(0, 90) + "...";
      }

      function syncTopNavigation() {
        const navList = document.querySelector(".classynav > ul");
        if (!(navList instanceof HTMLElement)) return;

        const currentPath = window.location.pathname.replace(/\\/$/, "") || "/";
        navList.innerHTML = navItems
          .map((item) => {
            const isActive =
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(item.href));

            return \`
              <li>
                <a
                  href="\${item.href}"
                  class="songsai-nav-link\${isActive ? " is-active" : ""}"
                  title="\${item.tooltip}"
                  data-menu-tooltip="\${item.tooltip}"
                >\${item.label}</a>
              </li>
            \`;
          })
          .join("");
      }

      function syncFooterNavigation() {
        const footerNav = document.querySelector(".footer-area .footer-nav");
        if (!(footerNav instanceof HTMLElement)) return;

        let list = footerNav.querySelector("ul");
        if (!(list instanceof HTMLUListElement)) {
          list = document.createElement("ul");
          footerNav.innerHTML = "";
          footerNav.appendChild(list);
        }

        const currentPath = window.location.pathname.replace(/\\/$/, "") || "/";
        list.innerHTML = navItems
          .map((item) => {
            const isActive =
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(item.href));

            return \`
              <li>
                <a
                  href="\${item.href}"
                  class="songsai-footer-link\${isActive ? " is-active" : ""}"
                  title="\${item.tooltip}"
                  data-menu-tooltip="\${item.tooltip}"
                >\${item.label}</a>
              </li>
            \`;
          })
          .join("");
      }

      function syncHeaderActions() {
        const wrapper = document.querySelector(".login-register-cart-button");
        const container = document.querySelector(".login-register-btn");
        if (!(wrapper instanceof HTMLElement)) return;
        if (!(container instanceof HTMLElement)) return;

        container.innerHTML = \`
          <a href="/login" id="loginBtn" class="songsai-header-link">로그인</a>
        \`;

        let startButton = document.getElementById("startBtn");
        if (!(startButton instanceof HTMLAnchorElement)) {
          startButton = document.createElement("a");
          startButton.id = "startBtn";
          startButton.className = "songsai-header-cta songsai-header-create";
          wrapper.insertBefore(startButton, wrapper.firstChild);
        }

        startButton.href = "/create";
        startButton.textContent = "Create";
        startButton.title = "Create";
      }

      async function handleHeaderLogout() {
        try {
          const response = await fetch(getApiBase() + "/api/v1/auth/logout", {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("로그아웃에 실패했습니다.");
          }

          window.location.href = "/";
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "로그아웃에 실패했습니다.");
        }
      }

      function syncHeroCtas() {
        const heroButtons = Array.from(document.querySelectorAll(".hero-slides .songsaiMusic-btn"));
        if (heroButtons.length === 0) return;

        const [primaryButton, secondaryButton] = heroButtons;

        if (primaryButton instanceof HTMLAnchorElement) {
          primaryButton.href = "/create";
          primaryButton.textContent = "지금 바로 곡 만들기";
          primaryButton.classList.add("songsaiMusic-btn", "btn-2");
        }

        if (secondaryButton instanceof HTMLAnchorElement) {
          secondaryButton.href = "/create";
          secondaryButton.textContent = "지금 바로 곡 만들기";
          secondaryButton.classList.add("songsaiMusic-btn", "btn-2");
        }
      }

      function buildRecentMusicCard(item, index) {
        const title = escapeHtml(item.title || "제목 없는 곡");
        const cover = escapeHtml(item.imageUrl || getFallbackCover(index));
        const createdAt = escapeHtml(formatCreatedAt(item.createdAt));
        const audioUrl = item.mp3Url ? escapeHtml(item.mp3Url) : "";
        const lyrics = escapeHtml(getPreviewLyrics(item.lyrics));
        const itemId = escapeHtml(item.id || String(index));

        return \`
          <div
            class="single-album songsai-recent-album"
            data-music-card
            data-music-id="\${itemId}"
            data-audio-url="\${audioUrl}"
            data-cover-url="\${cover}"
            data-title="\${title}"
            data-created-at="\${createdAt}"
            data-lyrics="\${lyrics}"
          >
            <a class="songsai-recent-card-link" href="\${audioUrl || "/assets"}">
              <div class="songsai-recent-cover-wrap">
                <img src="\${cover}" alt="\${title}" class="songsai-recent-cover" loading="lazy" />
                \${audioUrl ? \`<span class="songsai-recent-play" title="재생"><span class="icon-play-button"></span></span>\` : ""}
              </div>
            </a>
            <div class="album-info">
              <a href="\${audioUrl || "/assets"}" class="songsai-recent-title-link">
                <h5>\${title}</h5>
              </a>
              <p class="songsai-recent-meta">\${createdAt}</p>
            </div>
          </div>
        \`;
      }

      function ensureRecentMusicPlayer(section) {
        let player = section.querySelector("[data-recent-player]");
        if (player) return player;

        const playerMarkup = document.createElement("div");
        playerMarkup.className = "songsai-recent-player";
        playerMarkup.setAttribute("data-recent-player", "true");
        playerMarkup.innerHTML = \`
          <div class="songsai-recent-player__cover">
            <img src="/songsai-music/img/bg-img/a1.jpg" alt="선택된 곡 커버" data-player-cover />
          </div>
          <div class="songsai-recent-player__body">
            <p class="songsai-recent-player__eyebrow">Selected Track</p>
            <h3 class="songsai-recent-player__title" data-player-title>재생할 곡을 선택해 주세요</h3>
            <p class="songsai-recent-player__meta" data-player-meta>완료된 최근 생성곡 중 원하는 트랙을 선택하면 여기서 바로 들을 수 있습니다.</p>
            <p class="songsai-recent-player__lyrics" data-player-lyrics>가사 일부가 여기에 표시됩니다.</p>
            <audio class="songsai-recent-player__audio" data-player-audio controls preload="none"></audio>
          </div>
        \`;

        const introBlock = section.querySelector(".ablums-text");
        if (introBlock && introBlock.parentElement) {
          introBlock.parentElement.insertAdjacentElement("afterend", playerMarkup);
        } else {
          section.insertAdjacentElement("afterbegin", playerMarkup);
        }

        return playerMarkup;
      }

      function selectRecentMusicCard(card, player) {
        if (!(card instanceof HTMLElement) || !(player instanceof HTMLElement)) return;

        const cards = Array.from(card.parentElement?.querySelectorAll("[data-music-card]") || []);
        cards.forEach((item) => item.classList.remove("is-selected"));
        card.classList.add("is-selected");

        const cover = player.querySelector("[data-player-cover]");
        const title = player.querySelector("[data-player-title]");
        const meta = player.querySelector("[data-player-meta]");
        const lyrics = player.querySelector("[data-player-lyrics]");
        const audio = player.querySelector("[data-player-audio]");

        if (!(cover instanceof HTMLImageElement)) return;
        if (!(title instanceof HTMLElement)) return;
        if (!(meta instanceof HTMLElement)) return;
        if (!(lyrics instanceof HTMLElement)) return;
        if (!(audio instanceof HTMLAudioElement)) return;

        const coverUrl = card.dataset.coverUrl || getFallbackCover(0);
        const trackTitle = card.dataset.title || "제목 없는 곡";
        const createdAt = card.dataset.createdAt || "방금 생성됨";
        const previewLyrics = card.dataset.lyrics || "가사 일부가 여기에 표시됩니다.";
        const audioUrl = card.dataset.audioUrl || "";

        cover.src = coverUrl;
        cover.alt = trackTitle;
        title.textContent = trackTitle;
        meta.textContent = createdAt;
        lyrics.textContent = previewLyrics;
        audio.src = audioUrl;
        audio.load();
      }

      function bindRecentMusicActions(section, panel) {
        const player = ensureRecentMusicPlayer(section);
        const cards = Array.from(panel.querySelectorAll("[data-music-card]"));

        cards.forEach((card) => {
          card.addEventListener("click", (event) => {
            event.preventDefault();
            selectRecentMusicCard(card, player);
          });
        });

        const firstPlayableCard = cards.find((card) => {
          return card instanceof HTMLElement && Boolean(card.dataset.audioUrl);
        });

        if (firstPlayableCard) {
          selectRecentMusicCard(firstPlayableCard, player);
        }
      }

      function initAlbumSlider(container) {
        const $ = window.jQuery;
        if (!$ || !$.fn || !$.fn.owlCarousel) return;

        const $container = $(container);

        if ($container.hasClass("owl-loaded")) {
          $container.trigger("destroy.owl.carousel");
          $container.removeClass("owl-loaded");
          $container.find(".owl-stage-outer").children().unwrap();
        }

        $container.owlCarousel({
          items: 5,
          margin: 30,
          loop: container.children.length > 1,
          nav: true,
          navText: ['<i class="fa fa-angle-double-left"></i>', '<i class="fa fa-angle-double-right"></i>'],
          dots: false,
          autoplay: true,
          autoplayTimeout: 5000,
          smartSpeed: 750,
          responsive: {
            0: { items: 1 },
            480: { items: 2 },
            768: { items: 3 },
            992: { items: 4 },
            1200: { items: 5 }
          }
        });
      }

      function isAssetsPage() {
        return window.location.pathname === "/assets" || window.location.pathname === "/albums";
      }

      function getAssetDownloadState(item) {
        const availableAt = item.downloadAvailableAt ? new Date(item.downloadAvailableAt) : null;
        const now = new Date();
        return Boolean(availableAt && availableAt.getTime() <= now.getTime());
      }

      function buildAssetCard(item, index) {
        const title = escapeHtml(item.title || "제목 없는 곡");
        const cover = escapeHtml(item.imageUrl || getFallbackCover(index));
        const statusLabel = escapeHtml(formatStatusLabel(item.status));
        const createdAt = escapeHtml(formatCreatedAt(item.createdAt));
        const downloadAt = escapeHtml(formatDownloadAt(item.downloadAvailableAt));
        const audioUrl = escapeHtml(item.mp3Url || "");
        const canListen = Boolean(item.canListen && item.mp3Url);
        const canDownload = getAssetDownloadState(item);
        const videoStatus = item.videoStatus || "";
        const canCreateVideo = Boolean(item.canCreateVideo);
        const canDownloadVideo = Boolean(item.canDownloadVideo && item.videoId);
        const videoButtonLabel = canDownloadVideo
          ? "비디오 다운로드"
          : videoStatus === "processing" || videoStatus === "queued"
            ? "비디오 생성 중..."
            : "비디오 만들기";
        const lyrics = escapeHtml(getPreviewLyrics(item.lyrics));

        return \`
          <div
            class="col-12 col-sm-6 col-lg-4 single-album-item songsai-assets-item"
            data-asset-id="\${escapeHtml(item.id)}"
            data-audio-url="\${audioUrl}"
            data-cover-url="\${cover}"
            data-title="\${title}"
            data-created-at="\${createdAt}"
            data-lyrics="\${lyrics}"
            data-video-id="\${escapeHtml(item.videoId || "")}"
            data-video-status="\${escapeHtml(videoStatus)}"
            data-can-download-video="\${canDownloadVideo ? "true" : "false"}"
          >
            <div class="single-album songsai-assets-card">
              <div class="songsai-assets-card__media">
                <img src="\${cover}" alt="\${title}" loading="lazy" />
                <span class="songsai-assets-status status-\${escapeHtml(item.status)}">\${statusLabel}</span>
                <button
                  type="button"
                  class="songsai-assets-play-toggle\${canListen ? "" : " is-disabled"}"
                  data-action="listen"
                  aria-label="\${canListen ? "곡 재생 또는 정지" : "아직 재생할 수 없음"}"
                  \${canListen ? "" : "disabled"}
                >
                  <span class="icon-play-button"></span>
                </button>
              </div>
              <div class="album-info songsai-assets-card__info">
                <h5>\${title}</h5>
                <p class="songsai-assets-card__time">생성 시각 · \${createdAt}</p>
                <p class="songsai-assets-card__download">다운로드 가능 · \${downloadAt}</p>
                <p class="songsai-assets-card__lyrics">\${lyrics}</p>
                <div class="songsai-assets-card__actions">
                  <button
                    type="button"
                    class="songsai-assets-btn songsai-assets-btn--primary"
                    data-action="download"
                    \${canDownload ? "" : "disabled"}
                  >다운로드</button>
                  <button
                    type="button"
                    class="songsai-assets-btn songsai-assets-btn--secondary"
                    data-action="video"
                    \${canDownloadVideo || canCreateVideo ? "" : "disabled"}
                    \${videoStatus === "processing" || videoStatus === "queued" ? "disabled" : ""}
                  >\${videoButtonLabel}</button>
                </div>
              </div>
            </div>
          </div>
        \`;
      }

      function updateAssetsNotice(section, message, isError = false) {
        let notice = section.querySelector("[data-assets-notice]");
        if (!(notice instanceof HTMLElement)) {
          notice = document.createElement("div");
          notice.className = "songsai-assets-notice";
          notice.setAttribute("data-assets-notice", "true");
          section.insertAdjacentElement("afterbegin", notice);
        }

        notice.textContent = message;
        notice.classList.toggle("is-error", isError);
      }

      function stopCurrentAssetPlayback(section) {
        const currentAudio = section.__songsaiAssetsAudio;
        const currentCard = section.__songsaiAssetsCard;

        if (currentAudio instanceof HTMLAudioElement) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }

        if (currentCard instanceof HTMLElement) {
          currentCard.classList.remove("is-playing");
          const currentButton = currentCard.querySelector("[data-action='listen']");
          if (currentButton instanceof HTMLElement) {
            currentButton.classList.remove("is-playing");
          }
        }

        section.__songsaiAssetsAudio = null;
        section.__songsaiAssetsCard = null;
      }

      function toggleAssetPlayback(section, card) {
        if (!(card instanceof HTMLElement)) return;

        const audioUrl = card.dataset.audioUrl || "";
        if (!audioUrl) {
          updateAssetsNotice(section, "아직 안정적인 재생 URL이 준비되지 않았습니다.", true);
          return;
        }

        const currentAudio = section.__songsaiAssetsAudio;
        const currentCard = section.__songsaiAssetsCard;
        const button = card.querySelector("[data-action='listen']");

        if (currentAudio instanceof HTMLAudioElement && currentCard === card) {
          if (!currentAudio.paused) {
            currentAudio.pause();
            card.classList.remove("is-playing");
            if (button instanceof HTMLElement) {
              button.classList.remove("is-playing");
            }
            updateAssetsNotice(section, "재생을 멈췄습니다.");
            return;
          }

          currentAudio.play().catch(() => undefined);
          card.classList.add("is-playing");
          if (button instanceof HTMLElement) {
            button.classList.add("is-playing");
          }
          updateAssetsNotice(section, "선택한 곡을 다시 재생합니다.");
          return;
        }

        stopCurrentAssetPlayback(section);

        const audio = new Audio(audioUrl);
        section.__songsaiAssetsAudio = audio;
        section.__songsaiAssetsCard = card;
        card.classList.add("is-playing");
        if (button instanceof HTMLElement) {
          button.classList.add("is-playing");
        }

        audio.addEventListener("ended", () => {
          stopCurrentAssetPlayback(section);
          updateAssetsNotice(section, "재생이 끝났습니다.");
        });

        audio.play().then(() => {
          const trackTitle = card.dataset.title || "선택한 곡";
          updateAssetsNotice(section, trackTitle + " 재생 중입니다.");
        }).catch(() => {
          stopCurrentAssetPlayback(section);
          updateAssetsNotice(section, "브라우저가 자동 재생을 막았습니다. 다시 눌러 주세요.", true);
        });
      }

      function getFileNameFromDisposition(disposition, fallbackName) {
        if (!disposition) return fallbackName;

        const utf8Match = disposition.match(/filename\\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) {
          try {
            return decodeURIComponent(utf8Match[1]);
          } catch {
            return fallbackName;
          }
        }

        const plainMatch = disposition.match(/filename="([^"]+)"/i);
        return plainMatch?.[1] || fallbackName;
      }

      async function downloadViaApi(section, url, fallbackName) {
        const response = await fetch(url, {
          credentials: "include",
        });

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) {
          if (contentType.includes("application/json")) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error || "다운로드를 준비하는 중 문제가 발생했습니다.");
          }

          throw new Error("다운로드를 준비하는 중 문제가 발생했습니다.");
        }

        const blob = await response.blob();
        const disposition = response.headers.get("content-disposition");
        const fileName = getFileNameFromDisposition(disposition, fallbackName);
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }

      async function handleAssetDownload(section, card, button) {
        updateAssetsNotice(section, "다운로드 준비 상태를 확인하고 있습니다.");
        const id = card.dataset.assetId || "";
        const title = card.dataset.title || "music";
        if (button instanceof HTMLButtonElement) {
          button.disabled = true;
        }

        try {
          await downloadViaApi(section, getApiBase() + "/api/v1/music/" + id + "/download", title + ".mp3");
          updateAssetsNotice(section, "다운로드를 시작했습니다.");
        } catch (error) {
          updateAssetsNotice(section, error instanceof Error ? error.message : "다운로드를 시작하지 못했습니다.", true);
        } finally {
          if (button instanceof HTMLButtonElement) {
            button.disabled = false;
          }
        }
      }

      async function handleAssetVideo(section, card, button) {
        const id = card.dataset.assetId || "";
        const title = card.dataset.title || "video";
        const videoStatus = card.dataset.videoStatus || "";
        const canDownloadVideo = card.dataset.canDownloadVideo === "true";
        const originalLabel = button instanceof HTMLButtonElement ? button.textContent : null;

        if (button instanceof HTMLButtonElement) {
          button.disabled = true;
        }

        if (canDownloadVideo && videoStatus === "completed") {
          updateAssetsNotice(section, "비디오 다운로드를 준비하고 있습니다.");

          try {
            await downloadViaApi(
              section,
              getApiBase() + "/api/v1/music/" + id + "/video/download",
              title + ".mp4",
            );
            updateAssetsNotice(section, "비디오 다운로드를 시작했습니다.");
          } catch (error) {
            updateAssetsNotice(section, error instanceof Error ? error.message : "비디오 다운로드에 실패했습니다.", true);
          } finally {
            if (button instanceof HTMLButtonElement) {
              button.disabled = false;
            }
          }

          return;
        }

        updateAssetsNotice(section, "비디오 생성 요청을 등록하고 있습니다.");

        try {
          const response = await fetch(getApiBase() + "/api/v1/music/" + id + "/video", {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          });

          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            updateAssetsNotice(
              section,
              payload?.error || "비디오 생성 요청 중 문제가 발생했습니다.",
              true,
            );
            return;
          }

          updateAssetsNotice(section, "비디오 생성 큐에 등록했습니다. 잠시 후 목록을 새로고침해 주세요.");
          window.setTimeout(() => {
            syncAssetsPage();
          }, 1200);
        } catch (error) {
          updateAssetsNotice(section, "비디오 생성 요청을 등록하지 못했습니다.", true);
        } finally {
          if (button instanceof HTMLButtonElement) {
            button.disabled = false;
            if (originalLabel) {
              button.textContent = originalLabel;
            }
          }
        }
      }

      function bindAssetsActions(section, grid) {
        const previousHandler = grid.__songsaiAssetsHandler;
        if (typeof previousHandler === "function") {
          grid.removeEventListener("click", previousHandler);
        }

        const handler = (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          const button = target.closest("[data-action]");
          const card = target.closest(".songsai-assets-item");
          if (!(card instanceof HTMLElement)) return;
          if (!(button instanceof HTMLButtonElement)) return;

          event.preventDefault();
          event.stopPropagation();

          const action = button.dataset.action;
          if (action === "listen") {
            toggleAssetPlayback(section, card);
          }

          if (action === "download") {
            handleAssetDownload(section, card, button);
          }

          if (action === "video") {
            handleAssetVideo(section, card, button);
          }
        };

        grid.__songsaiAssetsHandler = handler;
        grid.addEventListener("click", handler);
      }

      async function syncAssetsPage() {
        if (!isAssetsPage()) return;
        if (document.querySelector("[data-react-assets-page='true']")) return;

        document.body.classList.add("songsai-assets-page");

        const grid = document.querySelector(".songsaiMusic-albums");
        if (!(grid instanceof HTMLElement)) return;

        const categoryMenu = document.querySelector(".browse-by-catagories");
        if (categoryMenu instanceof HTMLElement) {
          categoryMenu.style.display = "none";
        }

        const removableSections = [
          ".songsaiMusic-buy-now-area",
          ".add-area",
          ".songsaiMusic-songs-area",
          ".contact-area",
        ];

        removableSections.forEach((selector) => {
          const section = document.querySelector(selector);
          if (section instanceof HTMLElement) {
            section.remove();
          }
        });

        const categorySection = document.querySelector(".album-catagory");
        if (categorySection instanceof HTMLElement) {
          categorySection.classList.add("songsai-assets-section");
        }

        const breadcrumbTitle = document.querySelector(".bradcumbContent h2");
        const breadcrumbCopy = document.querySelector(".bradcumbContent p");
        if (breadcrumbTitle instanceof HTMLElement) {
          breadcrumbTitle.textContent = "My Assets";
        }
        if (breadcrumbCopy instanceof HTMLElement) {
          breadcrumbCopy.textContent = "내 자산 보관함";
        }

        try {
          const response = await fetch(getApiBase() + "/api/v1/music?limit=24", {
            credentials: "include",
            headers: { Accept: "application/json" },
          });

          if (response.status === 401) {
            grid.innerHTML = \`
              <div class="col-12">
                <div class="songsai-assets-empty">
                  <h3>로그인이 필요합니다</h3>
                  <p>내 자산과 다운로드 상태를 보려면 먼저 로그인해 주세요.</p>
                  <a href="/login" class="songsaiMusic-btn btn-2">로그인하고 자산 보기</a>
                </div>
              </div>
            \`;
            return;
          }

          const payload = await response.json();
          const items = Array.isArray(payload?.items) ? payload.items : [];
          grid.classList.add("songsai-assets-grid");

          if (items.length === 0) {
            grid.innerHTML = \`
              <div class="col-12">
                <div class="songsai-assets-empty">
                  <h3>아직 생성한 곡이 없습니다</h3>
                  <p>Create에서 첫 곡을 생성하면 여기에서 재생, 다운로드 가능 시간, 상태를 확인할 수 있습니다.</p>
                  <a href="/create" class="songsaiMusic-btn btn-2">지금 바로 곡 만들기</a>
                </div>
              </div>
            \`;
            return;
          }

          grid.innerHTML = items.map((item, index) => buildAssetCard(item, index)).join("");
          bindAssetsActions(grid.parentElement || grid, grid);
          updateAssetsNotice(
            grid.parentElement || grid,
            "내가 생성한 곡만 표시됩니다. 카드 이미지의 재생 버튼으로 바로 듣고, 5분 뒤 다운로드를 시도할 수 있습니다.",
          );
        } catch (error) {
          grid.innerHTML = \`
            <div class="col-12">
              <div class="songsai-assets-empty">
                <h3>자산 목록을 불러오지 못했습니다</h3>
                <p>잠시 후 다시 시도해 주세요.</p>
              </div>
            </div>
          \`;
        }
      }

      async function syncHeaderAuth() {
        const container = document.querySelector(".login-register-btn");
        const loginButton = document.getElementById("loginBtn");
        const startButton = document.getElementById("startBtn");
        if (!(container instanceof HTMLElement)) return;
        if (!(loginButton instanceof HTMLAnchorElement)) return;

        try {
          const response = await fetch(getApiBase() + "/api/v1/me", {
            credentials: "include",
            headers: { Accept: "application/json" }
          });

          if (!response.ok) return;

          const payload = await response.json();
          if (!payload || !payload.user) return;

          const displayName = getDisplayName(payload.user);
          loginButton.textContent = displayName;
          loginButton.href = "/assets";
          loginButton.title = displayName;
          loginButton.classList.add("auth-user-link");

          let logoutButton = document.getElementById("logoutBtn");
          if (!(logoutButton instanceof HTMLButtonElement)) {
            logoutButton = document.createElement("button");
            logoutButton.id = "logoutBtn";
            logoutButton.type = "button";
            logoutButton.className = "songsai-header-logout";
            logoutButton.textContent = "로그아웃";
            container.appendChild(logoutButton);
          }

          logoutButton.onclick = function () {
            void handleHeaderLogout();
          };

          if (startButton instanceof HTMLAnchorElement) {
            startButton.textContent = "Create";
            startButton.href = "/create";
            startButton.title = "AI 생성";
          }
        } catch (error) {
          console.warn("Failed to sync auth header", error);
        }
      }

      async function syncRecentMusicPanel() {
        const section = document.querySelector(".latest-albums-area");
        const panel = section?.querySelector(".albums-slideshow");
        if (!(section instanceof HTMLElement)) return;
        if (!(panel instanceof HTMLElement)) return;

        try {
          const response = await fetch(getApiBase() + "/api/v1/music/recent?limit=10", {
            credentials: "include",
            headers: { Accept: "application/json" }
          });

          if (!response.ok) return;

          const payload = await response.json();
          const items = Array.isArray(payload?.items) ? payload.items : [];

          if (items.length === 0) return;

          panel.innerHTML = items
            .map((item, index) => buildRecentMusicCard(item, index))
            .join("");

          initAlbumSlider(panel);
          bindRecentMusicActions(section, panel);
        } catch (error) {
          console.warn("Failed to sync recent music panel", error);
        }
      }

      function bootUiEnhancements() {
        syncTopNavigation();
        syncFooterNavigation();
        syncHeaderActions();
        syncHeroCtas();
        syncHeaderAuth();
        syncRecentMusicPanel();
        syncAssetsPage();
        window.setTimeout(syncFooterNavigation, 50);
        window.setTimeout(syncFooterNavigation, 300);
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootUiEnhancements, { once: true });
      } else {
        bootUiEnhancements();
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
      <Script id="songsai-ui-sync" strategy="afterInteractive">
        {uiScript}
      </Script>
    </>
  );
}
