"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname?.startsWith("/p/");

  if (isPublic) {
    return <main className="min-h-screen w-full m-0 p-0">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </>
  );
}
