import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const internal =
    process.env.SONGSAI_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.SONGSAI_INTERNAL_API_URL?.replace(/\/$/, "");

  if (internal) {
    return internal;
  }

  if (process.env.NODE_ENV === "production") {
    return "http://127.0.0.1:3100";
  }

  return process.env.NEXT_PUBLIC_SONGSAI_API_URL?.replace(/\/$/, "") ?? "http://localhost:3100";
}

type ProxyRouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(
  request: NextRequest,
  context: ProxyRouteContext,
) {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  const targetUrl = new URL(`${getBackendBaseUrl()}/${path}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const headers = new Headers(request.headers);
  headers.set("host", targetUrl.host);
  headers.delete("content-length");

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      {
        error: `로컬 API 서버(${getBackendBaseUrl()})에 연결하지 못했습니다.`,
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: ProxyRouteContext,
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: ProxyRouteContext,
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: ProxyRouteContext,
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: ProxyRouteContext,
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: ProxyRouteContext,
) {
  return proxyRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: ProxyRouteContext,
) {
  return proxyRequest(request, context);
}
