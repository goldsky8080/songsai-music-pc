import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
    slug: key === "" ? [] : [key],
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

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const routeKey = resolveRouteKey(slug);

  if (routeKey === null) {
    notFound();
  }

  const page = getPageTemplate(routeKey);

  return <main dangerouslySetInnerHTML={{ __html: page.html }} />;
}
