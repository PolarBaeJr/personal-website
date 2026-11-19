import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { siteIdentity } from "@/content/site";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: {
    default: siteIdentity.name,
    template: `%s | ${siteIdentity.name}`,
  },
  description: siteIdentity.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body>{children}</body>
    </html>
  );
}
