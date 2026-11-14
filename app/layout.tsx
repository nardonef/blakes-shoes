import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import Motion from "@/components/Motion";
import NavBar from "@/components/NavBar";
import { getTradeDeadline } from "@/lib/trade-deadline";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});

const description = "Blake's Shoes fantasy football league: every season since 2012, stats, rosters, drafts and legacies.";

export const metadata: Metadata = {
  metadataBase: new URL("https://blakesshoes.org"),
  title: "Blake's Shoes - Fantasy Football League",
  description,
  // Link previews (group chats, iMessage, Slack); the image is app/opengraph-image.tsx.
  openGraph: { siteName: "Blake's Shoes", type: "website", description },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Opt in to scroll animations before first paint, so animated content never flashes in. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('motion')" }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} antialiased`}
      >
        <NavBar deadlineAt={getTradeDeadline().at} />
        <Motion />
        {children}
      </body>
    </html>
  );
}
