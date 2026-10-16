import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { DirtyProvider } from "@/lib/DirtyContext";
import { FamilyProvider } from "@/lib/FamilyContext";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";

const font = Instrument_Sans({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

export const metadata: Metadata = {
  title: "Patchplan",
  description: "Modern project management for game studios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${font.className} ${font.variable} min-h-screen bg-background text-foreground custom-scrollbar`}>
        <AuthProvider>
          <FamilyProvider>
            <DirtyProvider>
              <AppLayoutWrapper>{children}</AppLayoutWrapper>
            </DirtyProvider>
          </FamilyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
