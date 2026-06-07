import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import LoadingOverlay from "@/components/loading/LoadingOverlay";
import SmoothScroller from "@/components/layout/SmoothScroller";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// Display / headings — sharp, geometric. Variable font, so no explicit weights.
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

// Body — clean, readable.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// Mono — loading tagline, metadata labels, badges.
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexa Dev Studio — We build digital products that perform.",
  description:
    "Nexa is a digital product studio crafting performant web experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <LoadingOverlay />
        <SmoothScroller>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </SmoothScroller>
      </body>
    </html>
  );
}
