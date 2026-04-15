import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getBackendBaseUrl() {
  const baseUrl = process.env.SONGSAI_API_BASE_URL || process.env.NEXT_PUBLIC_SONGSAI_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("SongsAI API base URL is not configured.");
  }

  return baseUrl.replace(/\/$/, "");
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const baseUrl = getBackendBaseUrl();
  const upstream = await fetch(`${baseUrl}/api/v1/explore/${id}/preview`, {
    method: "GET",
    cache: "no-store",
    redirect: "manual",
    headers: {
      accept: "application/json, audio/mpeg, */*",
    },
  });

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    if (!location) {
      return NextResponse.json({ error: "Preview redirect is missing." }, { status: 502 });
    }

    return NextResponse.redirect(location, { status: 307 });
  }

  const contentType = upstream.headers.get("content-type") || "application/json";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
