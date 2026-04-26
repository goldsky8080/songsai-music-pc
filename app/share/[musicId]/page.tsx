import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { ShareStudio } from "./share-studio";

type ShareMetadataResponse = {
  item?: {
    id: string;
    title?: string | null;
    imageUrl?: string | null;
    lyrics?: string | null;
  } | null;
  artist?: {
    name?: string | null;
  } | null;
};

const fallbackShareImage = "/songsai-music/img/bg-img/e1.jpg";

function getSiteUrl() {
  if (process.env.NODE_ENV === "production") {
    return "https://pc.songsai.org";
  }

  return "http://localhost:3000";
}

function getApiBaseUrl() {
  return (
    process.env.SONGSAI_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SONGSAI_API_URL?.replace(/\/$/, "") ??
    "https://api.songsai.org"
  );
}

function makeAbsoluteUrl(value: string, origin: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value, origin).toString();
}

function compactDescription(value?: string | null) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "SongsAI Music에서 공유된 공개곡을 바로 재생해보세요.";
  }

  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
}

async function fetchShareMetadata(musicId: string) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/explore/${musicId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ShareMetadataResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ musicId: string }>;
}): Promise<Metadata> {
  const { musicId } = await params;
  const siteUrl = getSiteUrl();
  const shareUrl = `${siteUrl}/share/${musicId}`;
  const payload = await fetchShareMetadata(musicId);
  const title = payload?.item?.title?.trim() || "Shared Track";
  const artistName = payload?.artist?.name?.trim();
  const description = compactDescription(payload?.item?.lyrics);
  const imageUrl = makeAbsoluteUrl(payload?.item?.imageUrl || fallbackShareImage, siteUrl);
  const fullTitle = artistName ? `${title} | ${artistName} | SongsAI Music` : `${title} | SongsAI Music`;

  return {
    metadataBase: new URL(siteUrl),
    title: fullTitle,
    description,
    alternates: {
      canonical: shareUrl,
    },
    openGraph: {
      type: "music.song",
      url: shareUrl,
      title: fullTitle,
      description,
      siteName: "SongsAI Music",
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ musicId: string }>;
}) {
  const { musicId } = await params;

  return (
    <>
      <SiteHeader />
      <ShareStudio musicId={musicId} />
      <SiteFooter />
    </>
  );
}
