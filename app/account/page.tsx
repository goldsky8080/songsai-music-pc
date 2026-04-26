import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageHeroImages } from "@/lib/page-hero-images";

import { AccountStudio } from "./account-studio";

export const metadata: Metadata = {
  title: "Account | SongsAI Music PC",
};

export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: `url(${pageHeroImages.account})` }}
      >
        <div className="bradcumbContent">
          <p>계정 정보와 보안 상태를 한 화면에서 정리합니다</p>
          <h2>Account</h2>
        </div>
      </section>
      <AccountStudio />
      <SiteFooter />
    </>
  );
}
