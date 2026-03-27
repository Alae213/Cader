import type { Metadata } from "next";
import { Instrument_Serif, Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/ConvexProvider";
import { Toaster } from "sonner";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cader — Paid Communities for Algerian Creators",
  description: "Launch paid or free communities, build courses, and accept payments in DZD via Chargily.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
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
    <ClerkProvider>
      <ConvexClientProvider>
        <html
          lang="en"
          className={`${instrumentSerif.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
        >
          <body suppressHydrationWarning className="min-h-full flex flex-col bg-bg-canvas text-text-primary">
            {children}
            <Toaster 
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#2A2A2A',
                  color: '#FAFAFA',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
              }}
            />
          </body>
        </html>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
