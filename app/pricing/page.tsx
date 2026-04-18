import type { Metadata } from "next";

import { AdRails } from "@/components/ad-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageHeroImages } from "@/lib/page-hero-images";

import { PricingStudio } from "./pricing-studio";

export const metadata: Metadata = {
  title: "Pricing | SongsAI Music PC",
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: `url(${pageHeroImages.pricing})` }}
      >
        <div className="bradcumbContent">
          <p>요금제와 사용 흐름을 한눈에 정리했습니다</p>
          <h2>Pricing</h2>
        </div>
      </section>
      <AdRails>
        <PricingStudio />
      </AdRails>
      <SiteFooter />
    </>
  );
}
