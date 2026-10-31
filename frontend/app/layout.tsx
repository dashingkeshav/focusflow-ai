import type { Metadata, Viewport } from "next";
const playfair = { variable: 'font-playfair' };
const display = { variable: 'font-space-grotesk' };
const body = { variable: 'font-plus-jakarta' };
const accent = { variable: 'font-fraunces' };
const manrope = { variable: 'font-manrope' };
const inter = { variable: 'font-inter' };

import Providers from "./providers";
import ScrollProgress from "@/components/ui/ScrollProgress";
import AnchorScroll from "@/components/ui/AnchorScroll";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import ConditionalGalaxyBackground from "@/components/ConditionalGalaxyBackground";

export const metadata: Metadata = {
  metadataBase: new URL("https://focusflow-ai.app"),
  title: {
    default: "FocusFlow AI · The Intelligent Focus & Productivity Agent",
    template: "%s · FocusFlow AI",
  },
  description:
    "Master your attention and flow into deep work. FocusFlow AI combines multimodal Gemini AI planning, browser distraction shielding, Focus Rooms coworking, accountability circles, and real-time focus telemetry.",
  keywords: [
    "FocusFlow AI",
    "focus agent",
    "deep work",
    "AI productivity",
    "distraction shielding",
    "Gemini AI planner",
    "flow state",
    "focus rooms",
    "coworking timer",
    "focus circles",
    "accountability groups",
    "project pods",
    "unblock exchange",
  ],
  openGraph: {
    type: "website",
    siteName: "FocusFlow AI",
    title: "FocusFlow AI · The Intelligent Focus & Productivity Agent",
    description:
      "Master your attention and flow into deep work. Multimodal AI planning, browser distraction shielding, synchronized focus rooms, and real-time focus intelligence.",
  },
  icons: {
    icon: [
      { url: "/brand/icon-32.png?v=ff5", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-16.png?v=ff5", sizes: "16x16", type: "image/png" },
      { url: "/brand/icon-48.png?v=ff5", sizes: "48x48", type: "image/png" },
      { url: "/brand/icon-128.png?v=ff5", sizes: "128x128", type: "image/png" },
      { url: "/brand/icon-256.png?v=ff5", sizes: "256x256", type: "image/png" },
      { url: "/icon.svg?v=ff5", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico?v=ff5",
    apple: [
      { url: "/brand/icon-128.png?v=ff5", sizes: "128x128", type: "image/png" },
      { url: "/brand/icon-512.png?v=ff5", sizes: "512x512", type: "image/png" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FocusFlow AI · The Intelligent Focus & Productivity Agent",
    description:
      "Master your attention and flow into deep work. Multimodal AI planning, browser distraction shielding, and real-time focus intelligence.",
  },
  other: {
    "focusflow-app": "true",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`scroll-smooth dark ${playfair.variable} ${inter.variable} ${display.variable} ${body.variable} ${accent.variable} ${manrope.variable}`}
    >
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/icon-32.png?v=ff5" />
        <link rel="icon" type="image/png" sizes="16x16" href="/brand/icon-16.png?v=ff5" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg?v=ff5" />
        <link rel="shortcut icon" href="/favicon.ico?v=ff5" />
        <link rel="apple-touch-icon" sizes="180x180" href="/brand/icon-128.png?v=ff5" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-bg text-white font-inter antialiased selection:bg-[#FF4500] selection:text-white overflow-x-hidden"
      >
        {/* Global Moving Galaxy Starfield on Black Background */}
        <ConditionalGalaxyBackground />

        {/* Global Noise Texture Overlay */}
        <div className="noise-overlay" aria-hidden="true" />
        <Providers>
          <ScrollProgress />
          <AnchorScroll />
          <Navbar />

          <main className="relative z-10">{children}</main>

          <ConditionalFooter />
        </Providers>
      </body>
    </html>
  );
}