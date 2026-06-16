import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/effects/SmoothScroll/SmoothScroll";
import CustomCursor from "@/components/effects/CustomCursor/CustomCursor";
import PageLoader from "@/components/effects/PageLoader/PageLoader";
import Grain from "@/components/effects/Grain/Grain";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "orbix — Full-spectrum web studio",
  description:
    "We don't build websites. We build worlds. A small, fiercely focused studio crafting SaaS products, commerce platforms, campaigns and mobile-first apps.",
  metadataBase: new URL("https://orbix.studio"),
  openGraph: {
    title: "orbix — We build worlds",
    description:
      "Cinematic, story-driven web experiences. SaaS, commerce, campaigns, and mobile-first apps.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>
        <PageLoader />
        <CustomCursor />
        <SmoothScroll>{children}</SmoothScroll>
        {/* Film-grain overlay sits on top of everything */}
        <Grain />
      </body>
    </html>
  );
}
