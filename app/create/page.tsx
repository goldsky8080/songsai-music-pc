import type { Metadata } from "next";

import { getPageTemplate } from "@/lib/songsai-music";

import { CreateStudio } from "./create-studio";

export const metadata: Metadata = {
  title: "Create | SongsAI Music PC",
};

function extractSection(markup: string, pattern: RegExp) {
  return markup.match(pattern)?.[0] ?? "";
}

export default function CreatePage() {
  const template = getPageTemplate("blog");
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
        style={{ backgroundImage: "url(/songsai-music/img/bg-img/breadcumb3.jpg)" }}
      >
        <div className="bradcumbContent">
          <p>Shape your next track</p>
          <h2>Create</h2>
        </div>
      </section>
      <CreateStudio />
      <div dangerouslySetInnerHTML={{ __html: footer }} />
    </>
  );
}
