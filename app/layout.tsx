import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northstar School OS",
  description: "A calm, reliable operating system for schools.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
