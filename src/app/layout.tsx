import type { Metadata } from "next";
import { Instrument_Serif, Space_Mono, JetBrains_Mono } from "next/font/google";
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

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cader ",
  description: "Launch paid or free communities, build courses, and accept payments in DZD via Chargily."
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
          className={`${instrumentSerif.variable} ${spaceMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
        >
          <body suppressHydrationWarning className="h-full flex flex-col text-text-primary">
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
