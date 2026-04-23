import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Social Vibe",
  description: "Cross-platform social app for vibe engineering"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
