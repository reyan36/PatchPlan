import { Logo } from "./Logo";

/** Neutral full-screen placeholder while we don't yet know if the visitor is signed in. */
export function AppSplash() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-5 bg-[#121212]" aria-busy="true" aria-label="Loading PatchPlan">
      <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden animate-pulse">
        <Logo size={26} />
      </div>
      {/* Pure HTML/CSS, so it still appears if the app's JavaScript fails to load. */}
      <p className="pp-fade text-xs text-zinc-500" style={{ animationDelay: "8s" }}>
        Taking longer than usual?{" "}
        <a href="/" className="text-zinc-300 underline underline-offset-2 hover:text-white">
          Reload PatchPlan
        </a>
      </p>
    </div>
  );
}
