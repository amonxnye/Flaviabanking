import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import SkipToContent from "@/components/SkipToContent";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-serif'
})

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
      <body className={`${inter.variable} ${ibmPlexSerif.variable}`}>
        <SkipToContent />
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
