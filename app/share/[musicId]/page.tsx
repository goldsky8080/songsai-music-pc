import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { ShareStudio } from "./share-studio";

export const metadata: Metadata = {
  title: "Shared Track | SongsAI Music PC",
};

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
