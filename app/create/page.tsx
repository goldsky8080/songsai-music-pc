import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageHeroImages } from "@/lib/page-hero-images";

import { CreateStudio } from "./create-studio";

export const metadata: Metadata = {
  title: "Create | SongsAI Music PC",
};

export default function CreatePage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: `url(${pageHeroImages.create})` }}
      >
        <div className="bradcumbContent">
          <p>Shape your next track</p>
          <h2>Create</h2>
        </div>
      </section>
      <AdRails railTop={760}>
        <CreateStudio />
      </AdRails>
      <SiteFooter />
    </>
  );
}
