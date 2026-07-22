import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: {
    default: "DineFlow",
    template: "%s | DineFlow",
  },
  description:
    "DineFlow is a modern QR-based restaurant ordering and management platform that enables seamless dine-in and delivery ordering with real-time order tracking, secure online payments, and a powerful admin dashboard.",

  keywords: [
    "DineFlow",
    "Restaurant Management",
    "QR Menu",
    "QR Ordering",
    "Food Ordering",
    "Restaurant POS",
    "Online Ordering",
    "Next.js",
    "Restaurant Dashboard",
    "Digital Menu",
    "Food Delivery",
    "Restaurant Analytics",
  ],

  authors: [{ name: "DineFlow" }],
  creator: "DineFlow",
  publisher: "DineFlow",

  metadataBase: new URL("https://dine-flow-lovat.vercel.app"),

  openGraph: {
    title: "DineFlow",
    description:
      "Modern QR-based restaurant ordering and management platform.",
    url: "https://dine-flow-lovat.vercel.app",
    siteName: "DineFlow",
    type: "website",
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "DineFlow",
    description:
      "Modern QR-based restaurant ordering and management platform.",
  },

  applicationName: "DineFlow",

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
      className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
