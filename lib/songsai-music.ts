import fs from "node:fs";
import path from "node:path";

export type SongsaiMusicRouteKey =
  | ""
  | "albums"
  | "blog"
  | "contact"
  | "elements"
  | "event";

type PageConfig = {
  fileName: string;
  route: string;
};

const pageMap: Record<SongsaiMusicRouteKey, PageConfig> = {
  "": { fileName: "index.html", route: "/" },
  albums: { fileName: "albums-store.html", route: "/albums" },
  blog: { fileName: "blog.html", route: "/blog" },
  contact: { fileName: "contact.html", route: "/contact" },
  elements: { fileName: "elements.html", route: "/elements" },
  event: { fileName: "event.html", route: "/event" },
};

const templateRoot = path.join(process.cwd(), "templates", "songsai-music");

function extractTitle(template: string) {
  return (
    template.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim() ??
    "SongsAI Music PC"
  );
}

function rewriteAssetPaths(markup: string) {
  return markup
    .replace(/(src|href)=["']img\//gi, '$1="/songsai-music/img/')
    .replace(/(src|href)=["']audio\//gi, '$1="/songsai-music/audio/')
    .replace(/url\((['"]?)img\//gi, "url($1/songsai-music/img/");
}

function rewriteHtmlLinks(markup: string) {
  return Object.values(pageMap).reduce((current, page) => {
    const routeHref = page.route === "/" ? "/" : page.route;

    return current.replaceAll(`href="${page.fileName}"`, `href="${routeHref}"`);
  }, markup);
}

function cleanupMarkup(markup: string) {
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/href="style\.css"/gi, 'href="/songsai-music/style.css"')
    .replace(/<body[^>]*>/i, "")
    .replace(/<\/body>/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n\s+</g, "\n<");
}

export function resolveRouteKey(slug?: string[]): SongsaiMusicRouteKey | null {
  if (!slug || slug.length === 0) {
    return "";
  }

  if (slug.length !== 1) {
    return null;
  }

  const routeKey = slug[0] as SongsaiMusicRouteKey;

  return routeKey in pageMap ? routeKey : null;
}

export function getKnownRoutes() {
  return Object.entries(pageMap).map(([key, value]) => ({
    key: key as SongsaiMusicRouteKey,
    route: value.route,
  }));
}

export function getPageTemplate(routeKey: SongsaiMusicRouteKey) {
  const config = pageMap[routeKey];
  const templatePath = path.join(templateRoot, config.fileName);
  const template = fs.readFileSync(templatePath, "utf8");
  const body = template.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? template;
  const year = String(new Date().getFullYear());
  const html = rewriteHtmlLinks(rewriteAssetPaths(cleanupMarkup(body))).replace(
    /Copyright &copy;/gi,
    `Copyright &copy;${year} `
  );

  return {
    title: extractTitle(template),
    html,
  };
}
