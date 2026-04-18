import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageHeroImages } from "@/lib/page-hero-images";

import { SupportStudio } from "./support-studio";

export const metadata: Metadata = {
  title: "Support | SongsAI Music PC",
};

export default function SupportPage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: `url(${pageHeroImages.support})` }}
      >
        <div className="bradcumbContent">
          <p>작업 중 막히는 지점을 지원 흐름 안에서 바로 풀어보세요</p>
          <h2>Support</h2>
        </div>
      </section>
      <AdRails>
        <SupportStudio />
      </AdRails>
      <SiteFooter />
    </>
  );
}
