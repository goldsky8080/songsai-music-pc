import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const jobs = await prisma.renderJob.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    include: {
      track: true,
      requestedBy: true,
    },
  });

  return NextResponse.json({
    items: jobs,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    outputPath?: string;
    preset?: string;
    requestedById?: string;
    sourcePath?: string;
    trackId?: string;
  };

  if (!body.sourcePath) {
    return NextResponse.json(
      { error: "sourcePath is required." },
      { status: 400 },
    );
  }

  try {
    const job = await prisma.renderJob.create({
      data: {
        sourcePath: body.sourcePath,
        outputPath: body.outputPath,
        preset: body.preset,
        requestedById: body.requestedById,
        trackId: body.trackId,
      },
      include: {
        track: true,
        requestedBy: true,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Invalid relation id supplied." },
        { status: 400 },
      );
    }

    throw error;
  }
}
