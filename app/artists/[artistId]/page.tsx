import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { ArtistStudio } from "./artist-studio";

export const metadata: Metadata = {
  title: "Artist | SongsAI Music PC",
};

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ artistId: string }>;
}) {
  const { artistId } = await params;

  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: "url(/songsai-music/img/bg-img/breadcumb2.jpg)" }}
      >
        <div className="bradcumbContent">
          <p>Public songs by artist</p>
          <h2>Artist</h2>
        </div>
      </section>
      <AdRails railTop={560}>
        <ArtistStudio artistId={artistId} />
      </AdRails>
      <SiteFooter />
    </>
  );
}
