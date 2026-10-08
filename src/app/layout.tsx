import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { DirtyProvider } from "@/lib/DirtyContext";
import { FamilyProvider } from "@/lib/FamilyContext";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} min-h-screen bg-background text-foreground custom-scrollbar`}>
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
