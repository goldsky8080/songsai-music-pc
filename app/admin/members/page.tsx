import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageHeroImages } from "@/lib/page-hero-images";
import type { PublicUser } from "@/lib/songsai-api";

import { MembersStudio } from "./members-studio";

export const metadata: Metadata = {
  title: "Members | SongsAI Music PC",
};

function getBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_SONGSAI_API_URL?.replace(/\/$/, "") ?? "http://localhost:3100";
}

async function getCurrentUser() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/v1/me`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { user?: PublicUser };
    return payload.user ?? null;
  } catch {
    return null;
  }
}

export default async function MembersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/members");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <>
      <SiteHeader />
      <section
        className="breadcumb-area bg-img bg-overlay"
        style={{ backgroundImage: `url(${pageHeroImages.adminMembers})` }}
      >
        <div className="bradcumbContent">
          <p>Manage verified members and signups</p>
          <h2>Members</h2>
        </div>
      </section>
      <MembersStudio />
      <SiteFooter />
    </>
  );
}
