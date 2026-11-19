import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { ThemeSync } from "@/components/ThemeSync";
import { siteIdentity } from "@/content/site";
import { THEME_SCRIPT } from "@/lib/theme";
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
    <html lang="en" className={instrumentSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
