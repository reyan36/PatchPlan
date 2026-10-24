import Link from "next/link";
import { Mascot } from "@/features/tour/Mascot";

export const metadata = { title: "Page not found · PatchPlan" };

/** Branded 404 for any unknown URL (and notFound() calls). */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center flex flex-col items-center">
        <div className="group mb-6">
          <Mascot size={84} />
        </div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#c8ff00] mb-3">ERROR 404</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">This page doesn&apos;t exist</h1>
        <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
          The link may be broken, or the page was moved or deleted. If someone shared it with you, ask them for a fresh link.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          <Link href="/" className="px-4 py-2 rounded-md bg-[#c8ff00] text-black text-sm font-semibold hover:bg-[#d4ff3a] transition-colors">
            Go to PatchPlan
          </Link>
          <Link href="/status" className="px-4 py-2 rounded-md border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors">
            Check system status
          </Link>
        </div>
      </div>
    </div>
  );
}
