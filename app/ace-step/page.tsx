import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageHeroImages } from "@/lib/page-hero-images";

import { CreateStudio } from "../create/create-studio";

export const metadata: Metadata = {
  title: "ACE-Step | SongsAI Music PC",
};

export default function AceStepPage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: `url(${pageHeroImages.aceStep})` }}
      >
        <div className="bradcumbContent">
          <p>Independent open-source generation flow</p>
          <h2>ACE-Step</h2>
        </div>
      </section>
      <AdRails railTop={760}>
        <CreateStudio mode="ace_step" />
      </AdRails>
      <SiteFooter />
    </>
  );
}
