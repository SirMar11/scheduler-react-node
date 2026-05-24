import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sf-pro-display",
});

export const metadata: Metadata = {
  title: "Scheduler",
  description: "Osobní time-management nástroj",
  manifest: "/manifest.webmanifest",
  // iOS — zobrazit jako fullscreen app bez Safari UI
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scheduler",
  },
  // Ikona pro Add to Home Screen na iOS
  icons: {
    apple: "/icons/icon.svg",
  },
};

// Viewport se od Next.js 14 exportuje zvlášť — themeColor nesmí být v metadata
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3B82F6" },
    { media: "(prefers-color-scheme: dark)", color: "#1E40AF" },
  ],
  width: "device-width",
  initialScale: 1,
  // maximumScale 1 zabrání nechtěnému double-tap zoom v input polích na iOS
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
