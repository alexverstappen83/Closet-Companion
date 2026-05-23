import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Wardrobe — jouw slimme digitale kledingkast",
    template: "%s · My Wardrobe",
  },
  description:
    "Leg je kledingkast digitaal vast, laat kledingstukken herkennen door AI en krijg persoonlijk stijladvies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">{children}</body>
    </html>
  );
}
