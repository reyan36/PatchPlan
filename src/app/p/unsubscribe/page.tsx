"use client";

import { useEffect, useState } from "react";
import { CheckCircle, CircleNotch, EnvelopeSimple } from "@phosphor-icons/react";

/** Landing page for the unsubscribe link in every email. Unsubscribes on load via POST. */
export default function UnsubscribePage() {
  const [params, setParams] = useState<{ s: string; t: string; test: boolean } | null>(null);
  const [state, setState] = useState<"working" | "unsubscribed" | "active" | "error">("working");
  const [error, setError] = useState("");

  const call = async (s: string, t: string, resubscribe = false) => {
    setState("working");
    const res = await fetch("/api/email/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s, t, resubscribe }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setState("error");
    } else {
      setState(data.status);
    }
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = { s: q.get("s") || "", t: q.get("t") || "", test: q.get("test") === "1" };
    setParams(p);
    if (p.test) setState("unsubscribed");
    else if (p.s && p.t) call(p.s, p.t);
    else {
      setError("This unsubscribe link is incomplete.");
      setState("error");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-zinc-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.06] flex items-center justify-center">
          {state === "working" ? <CircleNotch size={22} className="animate-spin text-zinc-400" /> : state === "error" ? <EnvelopeSimple size={22} className="text-zinc-400" /> : <CheckCircle size={22} weight="fill" className="text-emerald-400" />}
        </div>
        {state === "working" && <p className="text-zinc-400">Updating your preferences…</p>}
        {state === "unsubscribed" && (
          <>
            <h1 className="text-xl font-semibold">You&apos;re unsubscribed</h1>
            <p className="text-sm text-zinc-400">{params?.test ? "This was a test email, so nothing changed." : "You won't get any more emails from this studio."}</p>
            {params && !params.test && (
              <button onClick={() => call(params.s, params.t, true)} className="text-sm text-zinc-300 underline underline-offset-4 hover:text-white">
                Unsubscribed by mistake? Resubscribe
              </button>
            )}
          </>
        )}
        {state === "active" && (
          <>
            <h1 className="text-xl font-semibold">Welcome back</h1>
            <p className="text-sm text-zinc-400">You&apos;re subscribed again.</p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-xl font-semibold">Link didn&apos;t work</h1>
            <p className="text-sm text-zinc-400">{error} Reply to any email from the studio and they can remove you.</p>
          </>
        )}
        <p className="pt-6 text-xs text-zinc-600">Powered by PatchPlan</p>
      </div>
    </div>
  );
}
