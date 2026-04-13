import type { Metadata } from "next";

import { getPageTemplate } from "@/lib/songsai-music";

import { AssetsStudio } from "./assets-studio";

export const metadata: Metadata = {
  title: "My Assets | SongsAI Music PC",
};

function extractSection(markup: string, pattern: RegExp) {
  return markup.match(pattern)?.[0] ?? "";
}

export default function AssetsPage() {
  const template = getPageTemplate("assets");
  const header = extractSection(
    template.html,
    /<!-- ##### Header Area Start ##### -->[\s\S]*?<!-- ##### Header Area End ##### -->/,
  );
  const footer = extractSection(
    template.html,
    /<!-- ##### Footer Area Start ##### -->[\s\S]*$/,
  );

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: header }} />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: "url(/songsai-music/img/bg-img/breadcumb4.jpg)" }}
      >
        <div className="bradcumbContent">
          <p>Manage every generation in one place</p>
          <h2>My Assets</h2>
        </div>
      </section>
      <AssetsStudio />
      <div dangerouslySetInnerHTML={{ __html: footer }} />
    </>
  );
}
