import type { Metadata } from "next";
import { headers } from "next/headers";
import "katex/dist/katex.min.css";
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/ibm-plex-sans/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import "./research-archive.css";
import "./editor-archive.css";

const title = "Guo Yue Research";
const description = "Embodied AI, world models, robot learning, simulation, and research writing by Guo Yue.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const configuredOrigin = process.env.PUBLIC_ORIGIN?.trim();
  const metadataBase = configuredOrigin ? new URL(configuredOrigin) : host ? new URL(`${protocol}://${host}`) : undefined;
  const socialImage = new URL("/og.png", metadataBase ?? "http://localhost").href;

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
