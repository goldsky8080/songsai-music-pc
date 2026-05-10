import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageHeroImages } from "@/lib/page-hero-images";

import { UploadSourceStudio } from "./upload-source-studio";

export const metadata: Metadata = {
  title: "Upload Source | SongsAI Music PC",
};

export default function UploadSourcePage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: `url(${pageHeroImages.create})` }}
      >
        <div className="bradcumbContent">
          <p>Upload vocal-only sources to Suno</p>
          <h2>Upload Source</h2>
        </div>
      </section>
      <AdRails railTop={760}>
        <UploadSourceStudio />
      </AdRails>
      <SiteFooter />
    </>
  );
}
