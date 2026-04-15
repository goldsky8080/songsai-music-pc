import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import {
  getKnownRoutes,
  getPageTemplate,
  resolveRouteKey,
} from "@/lib/songsai-music";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export async function generateStaticParams() {
  return getKnownRoutes().map(({ key }) => ({
    slug: key === "home" ? [] : [key],
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const routeKey = resolveRouteKey(slug);

  if (routeKey === null) {
    return {
      title: "Not Found | SongsAI Music PC",
    };
  }

  const page = getPageTemplate(routeKey);

  return {
    title: `${page.title} | SongsAI Music PC`,
  };
}

function stripTemplateChrome(html: string) {
  return html
    .replace(/<header class="header-area">[\s\S]*?<\/header>/i, "")
    .replace(/<footer class="footer-area">[\s\S]*?<\/footer>/i, "");
}

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const routeKey = resolveRouteKey(slug);

  if (routeKey === null) {
    notFound();
  }

  const page = getPageTemplate(routeKey);
  return (
    <>
      <SiteHeader />
      <main dangerouslySetInnerHTML={{ __html: stripTemplateChrome(page.html) }} />
      <SiteFooter />
    </>
  );
}
