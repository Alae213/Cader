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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1754d8",
          colorTextOnPrimaryBackground: "#ffffff",
          colorBackground: "#222222",
          colorInputBackground: "#2A2A2A",
          colorInputText: "#FAFAFA",
          colorTextSecondary: "#A1A1AA",
          borderRadius: "14px",
        },
        elements: {
          formButtonPrimary: "bg-accent hover:bg-accent-hover text-white",
          card: "bg-bg-surface",
          headerTitle: "font-display",
          headerSubtitle: "text-text-secondary",
        },
      }}
    >
      <ConvexClientProvider>
        <html
          lang="en"
          className={`${instrumentSerif.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
        >
          <body className="min-h-full flex flex-col bg-bg-canvas text-text-primary">
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
