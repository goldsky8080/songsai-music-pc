import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { AssetsStudio } from "./assets-studio";

export const metadata: Metadata = {
  title: "My Assets | SongsAI Music PC",
};

export default function AssetsPage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: "url(/songsai-music/img/bg-img/breadcumb4.jpg)" }}
      >
        <div className="bradcumbContent">
          <p>Manage every generation in one place</p>
          <h2>My Assets</h2>
        </div>
      </section>
      <AdRails>
        <AssetsStudio />
      </AdRails>
      <SiteFooter />
    </>
  );
}
