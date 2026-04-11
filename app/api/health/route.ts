import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    app: "songsai-music-pc",
    ok: true,
    now: new Date().toISOString(),
    stack: ["nextjs", "react", "typescript", "postgresql", "prisma", "ffmpeg"],
  });
}
