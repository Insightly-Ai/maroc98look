import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Morocco 2026 Legend Generator",
  description: "Turn your photo into a Morocco World Cup 2026 Champion Photo or Panini card. Only €1.49.",
  metadataBase: new URL("https://www.maroclegend2026.nl"),
  openGraph: {
    title: "Morocco 2026 Legend Generator",
    description: "Turn your photo into a Morocco World Cup 2026 Champion Photo or Panini card. Only €1.49.",
    type: "website",
    url: "https://www.maroclegend2026.nl",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
