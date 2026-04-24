import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Social Vibe",
    template: "%s · Vibe"
  },
  description: "Cross-platform social app for vibe engineering",
  applicationName: "Social Vibe",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Vibe",
    statusBarStyle: "black-translucent"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#0b0f19",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
