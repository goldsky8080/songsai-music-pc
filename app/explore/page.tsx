import { Suspense } from "react";
import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { ExploreStudio } from "./explore-studio";

export const metadata: Metadata = {
  title: "Explore | SongsAI Music PC",
};

export default function ExplorePage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: "url(/songsai-music/img/bg-img/breadcumb2.jpg)" }}
      >
        <div className="bradcumbContent">
          <p>Public songs, rankings, and artists</p>
          <h2>Explore</h2>
        </div>
      </section>
      <AdRails railTop={560}>
        <Suspense fallback={null}>
          <ExploreStudio />
        </Suspense>
      </AdRails>
      <SiteFooter />
    </>
  );
}
