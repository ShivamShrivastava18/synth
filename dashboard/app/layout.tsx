import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synth — autonomous synthetic data",
  description:
    "Autonomous agent that generates fidelity-validated synthetic data and ships it to staging via Fivetran.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="f-sans text-base">{children}</body>
    </html>
  );
}
