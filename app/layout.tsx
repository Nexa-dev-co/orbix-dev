import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/effects/SmoothScroll";
import CustomCursor from "@/components/effects/CustomCursor";
import PageLoader from "@/components/effects/PageLoader";
import Grain from "@/components/effects/Grain";

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
  title: "orbix — software with gravity",
  description:
    "A software company building products with their own gravity. Custom web applications, SaaS platforms, enterprise CRM, mobile apps and AI systems.",
  metadataBase: new URL("https://orbix.studio"),
  openGraph: {
    title: "orbix — software with gravity",
    description:
      "Dive from the edge of the system to the core. Custom web applications, SaaS, CRM, mobile and AI — engineered to hold users in orbit.",
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
