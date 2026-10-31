import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import SkipToContent from "@/components/SkipToContent";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: "Horizon — Banking & Payments",
    template: "%s · Horizon",
  },
  description: "Horizon is a modern banking platform: connect banks, transfer funds, and collect mobile-money payments.",
  icons: {
    icon: '/icons/logo.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${plexSans.variable} ${plexMono.variable}`}>
        <SkipToContent />
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
