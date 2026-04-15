import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HomeStudio } from "@/app/home-studio";

export const metadata: Metadata = {
  title: "Home | SongsAI Music PC",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <HomeStudio />
      <SiteFooter />
    </>
  );
}
