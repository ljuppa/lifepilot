import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { headers } from "next/headers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifePilot — Your AI Life Coach",
  description: "Daily personalised briefings and check-ins to help you reach your goals.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country") ?? "";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Skip link — UX-DR17 / AC4 */}
        <a
          href="#main-content"
          className="absolute left-4 top-4 z-50 -translate-y-20 rounded-md bg-background px-4 py-2 text-sm font-medium ring-2 ring-ring transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>

        <main id="main-content" className="flex-1">
          {children}
        </main>

        {/* Cookie consent — EU users only, UX-DR20 / AC5 */}
        <CookieConsentBanner country={country} />
      </body>
    </html>
  );
}
