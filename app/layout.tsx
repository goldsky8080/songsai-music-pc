import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SongsAI Music PC",
  description: "songsai-music template rebuilt on Next.js, TypeScript, Prisma, and PostgreSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/songsai-music/img/core-img/favicon.ico" />
        <link rel="stylesheet" href="/songsai-music/style.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
